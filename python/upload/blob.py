import asyncio
import hashlib
import io
import os
from contextlib import contextmanager
from pathlib import Path, PurePosixPath
from typing import Any, AsyncIterator, BinaryIO, Callable, Dict, List, Optional, Union
from urllib.parse import urlparse

from aiohttp import BytesIOPayload
from aiohttp.abc import AbstractStreamWriter

from modal.exception import ExecutionError
from .sync import retry
from .net import http_client_with_tls, retry_transient_errors

from tqdm import tqdm
import logging
import uuid

#progress = {}
from .progress import progress_update

logger = logging.getLogger()


# Max size for function inputs and outputs.
MAX_OBJECT_SIZE_BYTES = 2 * 1024 * 1024  # 2 MiB

#  If a file is LARGE_FILE_LIMIT bytes or larger, it's uploaded to blob store (s3) instead of going through grpc
#  It will also make sure to chunk the hash calculation to avoid reading the entire file into memory
LARGE_FILE_LIMIT = 4 * 1024 * 1024  # 4 MiB

# Max parallelism during map calls
BLOB_MAX_PARALLELISM = 10

# read ~16MiB chunks by default
DEFAULT_SEGMENT_CHUNK_SIZE = 2**24


class BytesIOSegmentPayload(BytesIOPayload):
    """Modified bytes payload for concurrent sends of chunks from the same file.

    Adds:
    * read limit using remaining_bytes, in order to split files across streams
    * larger read chunk (to prevent excessive read contention between parts)
    * calculates an md5 for the segment

    Feels like this should be in some standard lib...
    """

    def __init__(
        self,
        bytes_io: BinaryIO,  # should *not* be shared as IO position modification is not locked
        segment_start: int,
        segment_length: int,
        filename: str,
        chunk_size: int = DEFAULT_SEGMENT_CHUNK_SIZE,
    ):
        # not thread safe constructor!
        super().__init__(bytes_io)
        self.initial_seek_pos = bytes_io.tell()
        self.segment_start = segment_start
        self.segment_length = segment_length
        # seek to start of file segment we are interested in, in order to make .size() evaluate correctly
        self._value.seek(self.initial_seek_pos + segment_start)
        assert self.segment_length <= super().size
        self.chunk_size = chunk_size
        self.reset_state()
        self.filename = filename

    def reset_state(self):
        self._md5_checksum = hashlib.md5()
        self.num_bytes_read = 0
        self._value.seek(self.initial_seek_pos)

    @contextmanager
    def reset_on_error(self):
        try:
            yield
        finally:
            self.reset_state()

    @property
    def filename(self):
        return self._filename

    @filename.setter
    def filename(self, value):
        self._filename = value

    @property
    def size(self) -> int:
        return self.segment_length

    def md5_checksum(self):
        return self._md5_checksum

    async def write(self, writer: AbstractStreamWriter):
        loop = asyncio.get_event_loop()

        async def safe_read():
            read_start = self.initial_seek_pos + self.segment_start + self.num_bytes_read
            self._value.seek(read_start)
            num_bytes = min(self.chunk_size, self.remaining_bytes())
            chunk = await loop.run_in_executor(None, self._value.read, num_bytes)

            await loop.run_in_executor(None, self._md5_checksum.update, chunk)
            self.num_bytes_read += len(chunk)
            return chunk

        chunk = await safe_read()
        while chunk and self.remaining_bytes() > 0:
            await writer.write(chunk)
            chunk = await safe_read()
        if chunk:
            await writer.write(chunk)

    def remaining_bytes(self):
        """
        print("Remaining bytes", self.filename, self.segment_length - self.num_bytes_read)
        if self.filename not in progress:
            progress[self.filename] = {}
        
        progress[self.filename]["value"] = self.segment_length - self.num_bytes_read
        if "max" not in progress[self.filename]:
            progress[self.filename]["max"] = self.segment_length - self.num_bytes_read
        """

        progress_update(filename=self.filename, value=self.segment_length - self.num_bytes_read, max=self.segment_length)
        return self.segment_length - self.num_bytes_read


@retry(n_attempts=5, base_delay=0.5, timeout=None)
async def _upload_to_s3_url(
    upload_url,
    payload: BytesIOSegmentPayload,
    content_md5_b64: Optional[str] = None,
    content_type: Optional[str] = "application/octet-stream",  # set to None to force omission of ContentType header
) -> str:
    """Returns etag of s3 object which is a md5 hex checksum of the uploaded content"""
    with payload.reset_on_error():  # ensure retries read the same data
        async with http_client_with_tls(timeout=None) as session:
            headers = {}
            if content_md5_b64 and use_md5(upload_url):
                headers["Content-MD5"] = content_md5_b64
            if content_type:
                headers["Content-Type"] = content_type


            #print("Uploading to s3", upload_url, payload)
            async with session.put(
                upload_url,
                data=payload,
                headers=headers,
                skip_auto_headers=["content-type"] if content_type is None else [],
            ) as resp:

                # S3 signal to slow down request rate.
                if resp.status == 503:
                    logger.warning("Received SlowDown signal from S3, sleeping for 1 second before retrying.")
                    await asyncio.sleep(1)

                if resp.status != 200:
                    try:
                        text = await resp.text()
                    except Exception:
                        text = "<no body>"
                    raise ExecutionError(f"Put to url {upload_url} failed with status {resp.status}: {text}")

                # client side ETag checksum verification
                # the s3 ETag of a single part upload is a quoted md5 hex of the uploaded content
                etag = resp.headers["ETag"].strip()
                if etag.startswith(("W/", "w/")):  # see https://www.rfc-editor.org/rfc/rfc7232#section-2.3
                    etag = etag[2:]
                if etag[0] == '"' and etag[-1] == '"':
                    etag = etag[1:-1]
                remote_md5 = etag

                local_md5_hex = payload.md5_checksum().hexdigest()
                if local_md5_hex != remote_md5:
                    raise ExecutionError(
                        f"Local data and remote data checksum mismatch ({local_md5_hex} vs {remote_md5})"
                    )

                return remote_md5

            #print("Done upload to s3")


async def perform_multipart_upload(
    data_file: Union[BinaryIO, io.BytesIO, io.FileIO],
    *,
    content_length: int,
    max_part_size: int,
    part_urls: List[str],
    completion_url: str,
    filename: str,
    upload_chunk_size: int = DEFAULT_SEGMENT_CHUNK_SIZE,
):
    upload_coros = []
    file_offset = 0
    num_bytes_left = content_length

    # Give each part its own IO reader object to avoid needing to
    # lock access to the reader's position pointer.
    data_file_readers: List[BinaryIO]
    if isinstance(data_file, io.BytesIO):
        view = data_file.getbuffer()  # does not copy data
        data_file_readers = [io.BytesIO(view) for _ in range(len(part_urls))]
    else:
        filename = data_file.name
        data_file_readers = [open(filename, "rb") for _ in range(len(part_urls))]

    for part_number, (data_file_rdr, part_url) in enumerate(zip(data_file_readers, part_urls), start=1):
        part_length_bytes = min(num_bytes_left, max_part_size)
        part_payload = BytesIOSegmentPayload(
            data_file_rdr,
            segment_start=file_offset,
            segment_length=part_length_bytes,
            chunk_size=upload_chunk_size,
            filename=filename,
        )
        upload_coros.append(_upload_to_s3_url(part_url, payload=part_payload, content_type=None))
        num_bytes_left -= part_length_bytes
        file_offset += part_length_bytes

    part_etags = await asyncio.gather(*upload_coros)

    # The body of the complete_multipart_upload command needs some data in xml format:
    completion_body = "<CompleteMultipartUpload>\n"
    for part_number, etag in enumerate(part_etags, 1):
        completion_body += f"""<Part>\n<PartNumber>{part_number}</PartNumber>\n<ETag>"{etag}"</ETag>\n</Part>\n"""
    completion_body += "</CompleteMultipartUpload>"

    # etag of combined object should be md5 hex of concatendated md5 *bytes* from parts + `-{num_parts}`
    bin_hash_parts = [bytes.fromhex(etag) for etag in part_etags]

    expected_multipart_etag = hashlib.md5(b"".join(bin_hash_parts)).hexdigest() + f"-{len(part_etags)}"
    async with http_client_with_tls(timeout=None) as session:
        resp = await session.post(
            completion_url, data=completion_body.encode("ascii"), skip_auto_headers=["content-type"]
        )
        if resp.status != 200:
            try:
                msg = await resp.text()
            except Exception:
                msg = "<no body>"
            raise ExecutionError(f"Error when completing multipart upload: {resp.status}\n{msg}")
        else:
            response_body = await resp.text()
            if expected_multipart_etag not in response_body:
                raise ExecutionError(
                    f"Hash mismatch on multipart upload assembly: {expected_multipart_etag} not in {response_body}"
                )

async def blob_upload(spec):
    r"""
    This spec is not the same as FileUploadSpec.
    It is an altered version provided from the server
    that includes upload data on top of the existing
    FileUploadSpec type
    ---
    type: str,
    id: str,
    blob_id: str,
    data: {
        # byte upload only
        upload_url: str,

        # multipart upload only
        "max_part_size": str
        "part_urls": dict
        "completion_url": str

        # Fields from FileUploadSpec
        **FileUploadSpec
    }
    """
    is_multipart = spec["type"] == "multipart"
    resp = spec["data"]

    # Find file
    filename = resp["source_description"]
    data = open(filename, "rb")

    if is_multipart:
        await perform_multipart_upload(
            data,
            content_length=resp["content_length"],
            max_part_size=resp["max_part_size"],
            part_urls=resp["part_urls"],
            completion_url=resp["completion_url"],
            filename=filename,
        )

    else:
        content_length = resp["content_length"]
        upload_hashes = resp["upload_hashes"]

        payload = BytesIOSegmentPayload(data, segment_start=0, segment_length=content_length, filename = filename)
        await _upload_to_s3_url(
            resp["upload_url"],
            payload,
            # for single part uploads, we use server side md5 checksums
            content_md5_b64=upload_hashes["md5_base64"],
        )

    return spec



def use_md5(url: str) -> bool:
    """This takes an upload URL in S3 and returns whether we should attach a checksum.

    It's only a workaround for missing functionality in moto.
    https://github.com/spulec/moto/issues/816
    """
    host = urlparse(url).netloc.split(":")[0]
    if host.endswith(".amazonaws.com"):
        return True
    elif host in ["127.0.0.1", "localhost", "172.21.0.1"]:
        return False
    else:
        raise Exception(f"Unknown S3 host: {host}")


