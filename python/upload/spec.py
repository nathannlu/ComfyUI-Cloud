import io
import copy 
import os
import base64
import platform
from aiohttp import web
import asyncio
import dataclasses

import concurrent.futures
import time
from pathlib import Path, PurePosixPath
from typing import (
    IO,
    AsyncGenerator,
    AsyncIterator,
    BinaryIO,
    Dict,
    Callable,
    Generator,
    Optional,
    Sequence,
    Type,
    Union,
    Any, 
)
import aiostream
import zlib
from .sync import synchronize_api
from .blob import LARGE_FILE_LIMIT
from .hash import get_sha256_hex, get_upload_hashes, UploadHashes

def get_content_length(data: BinaryIO):
    # *Remaining* length of file from current seek position
    pos = data.tell()
    data.seek(0, os.SEEK_END)
    content_length = data.tell()
    data.seek(pos)
    return content_length - pos


@dataclasses.dataclass
class FileUploadSpec:
    source: Callable[[], BinaryIO]
    source_description: Any
    mount_filename: str
    use_blob: bool
    content: Optional[bytes]  # typically None if using blob, required otherwise
    sha256_hex: str
    mode: int  # file permission bits (last 12 bits of st_mode)
    size: int
    upload_hashes: UploadHashes

# Example usage:

def _get_file_upload_spec(
    source: Callable[[], BinaryIO], source_description: Any, mount_filename: PurePosixPath, mode: int
) -> FileUploadSpec:

    with source() as fp:
        # Current position is ignored - we always upload from position 0
        fp.seek(0, os.SEEK_END)
        size = fp.tell()
        fp.seek(0)

        # Hotfix - cannot send bytes over http
        use_blob = True
        content = None

        #sha256_hex = get_sha256_hex(fp)
        upload_hashes, sha256_hex = get_upload_hashes(fp, source_description)

        """
        if size >= LARGE_FILE_LIMIT:
            use_blob = True
            content = None
            sha256_hex = get_sha256_hex(fp)
        else:
            use_blob = False
            content = fp.read()
            sha256_hex = get_sha256_hex(content)
        """

    return FileUploadSpec(
        source=source,
        source_description=source_description,
        mount_filename=mount_filename.as_posix(),
        use_blob=use_blob,
        content=content,
        sha256_hex=sha256_hex,
        upload_hashes=upload_hashes,
        mode=mode & 0o7777,
        size=size,
    )


def get_file_upload_spec_from_path(
    filename: Path, mount_filename: PurePosixPath, mode: Optional[int] = None
) -> FileUploadSpec:
    # Python appears to give files 0o666 bits on Windows (equal for user, group, and global),
    # so we mask those out to 0o755 for compatibility with POSIX-based permissions.
    mode = mode or os.stat(filename).st_mode & (0o7777 if platform.system() != "Windows" else 0o7755)
    return _get_file_upload_spec(
        lambda: open(filename, "rb"),
        filename,
        mount_filename,
        mode,
    )


def get_file_upload_spec_from_fileobj(fp: BinaryIO, mount_filename: PurePosixPath, mode: int) -> FileUploadSpec:
    def source():
        # We ignore position in stream and always upload from position 0
        fp.seek(0)
        return fp

    return _get_file_upload_spec(
        source,
        str(fp),
        mount_filename,
        mode,
    )


def serialize_spec(spec: FileUploadSpec) -> Dict[Any, Any]:
    """
    Turns the spec into a http-transferrable
    dictionary
    """
    obj = spec.__dict__

    obj["source_description"] = str(spec.source_description)


    with spec.source() as data:
        upload_hashes = obj["upload_hashes"].__dict__

        if isinstance(data, bytes):
            data = io.BytesIO(data)
        
        content_length = get_content_length(data)

        obj["upload_hashes"] = upload_hashes
        obj["content_length"] = content_length
        del obj["source"]

    # Serialize bytes
    # At the moment this is too large to
    # send over http
    if obj["content"] is not None:
        encoded_content = base64.b64encode(obj["content"]).decode('utf-8')
        obj["content"] = encoded_content

    return obj

class _FileSpecContextManager:
    """Context manager for batch-uploading files to a Volume."""

    def __init__(self, file_specs):
        """mdmd:hidden"""
        self._upload_generators = []

        self.files_stream = file_specs

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if not exc_val:
            return self
            # Flatten all the uploads yielded by the upload generators in the batch
            """
            def gen_upload_providers():
                for gen in self._upload_generators:
                    yield from gen

            async def gen_file_upload_specs(): # -> AsyncGenerator[FileUploadSpec, None]:
                loop = asyncio.get_event_loop()
                with concurrent.futures.ThreadPoolExecutor() as exe:
                    # TODO: avoid eagerly expanding
                    futs = [loop.run_in_executor(exe, f) for f in gen_upload_providers()]
                    #print(f"Computing checksums for {len(futs)} files using {exe._max_workers} workers")
                    for fut in asyncio.as_completed(futs):
                        yield await fut
            """

    async def generate_specs(self):
        # Flatten all the uploads yielded by the upload generators in the batch
        def gen_upload_providers():
            for gen in self._upload_generators:
                yield from gen

        async def gen_file_upload_specs(): # -> AsyncGenerator[FileUploadSpec, None]:
            loop = asyncio.get_event_loop()
            with concurrent.futures.ThreadPoolExecutor() as exe:
                # TODO: avoid eagerly expanding
                futs = [loop.run_in_executor(exe, f) for f in gen_upload_providers()]
                #print(f"Computing checksums for {len(futs)} files using {exe._max_workers} workers")
                for fut in asyncio.as_completed(futs):
                    yield await fut

        files_stream = aiostream.stream.iterate(gen_file_upload_specs())
        #print(files_stream)
        self.files_stream = files_stream
        return files_stream


    def put_file(
        self,
        local_file: Union[Path, str, BinaryIO],
        remote_path: Union[PurePosixPath, str],
        mode: Optional[int] = None,
    ):
        """Upload a file from a local file or file-like object.

        Will create any needed parent directories automatically.

        If `local_file` is a file-like object it must remain readable for the lifetime of the batch.
        """
        remote_path = PurePosixPath(remote_path).as_posix()
        if remote_path.endswith("/"):
            raise ValueError(f"remote_path ({remote_path}) must refer to a file - cannot end with /")

        def gen():
            if isinstance(local_file, str) or isinstance(local_file, Path):
                yield lambda: get_file_upload_spec_from_path(local_file, PurePosixPath(remote_path), mode)
            else:
                yield lambda: get_file_upload_spec_from_fileobj(local_file, PurePosixPath(remote_path), mode or 0o644)


        self._upload_generators.append(gen())


    def put_model(
        self,
        local_file: Union[Path, str, BinaryIO],
        model_type: str,
        remote_path: Union[PurePosixPath, str],
        mode: Optional[int] = None,
    ):
        """Upload a file from a local file or file-like object.

        Will create any needed parent directories automatically.

        If `local_file` is a file-like object it must remain readable for the lifetime of the batch.
        """
        remote_path = PurePosixPath(remote_path).as_posix()
        if remote_path.endswith("/"):
            raise ValueError(f"remote_path ({remote_path}) must refer to a file - cannot end with /")

        def gen():
            if isinstance(local_file, str) or isinstance(local_file, Path):
                yield lambda: get_file_upload_spec_from_path(local_file, PurePosixPath(remote_path), mode)
            else:
                yield lambda: get_file_upload_spec_from_fileobj(local_file, PurePosixPath(remote_path), mode or 0o644)


        self._upload_generators.append(gen())

    def get_files_stream(self):
        return self.files_stream

    def put_directory(
        self,
        local_path: Union[Path, str],
        remote_path: Union[PurePosixPath, str],
        recursive: bool = True,
    ):
        """
        Upload all files in a local directory.

        Will create any needed parent directories automatically.
        """
        local_path = Path(local_path)
        assert local_path.is_dir()
        remote_path = PurePosixPath(remote_path)

        def create_file_spec_provider(subpath):
            relpath_str = subpath.relative_to(local_path)
            return lambda: get_file_upload_spec_from_path(subpath, remote_path / relpath_str)

        def gen():
            glob = local_path.rglob("*") if recursive else local_path.glob("*")
            for subpath in glob:
                # Skip directories and unsupported file types (e.g. block devices)
                if subpath.is_file():
                    yield create_file_spec_provider(subpath)

        self._upload_generators.append(gen())

FileSpecContextManager = synchronize_api(_FileSpecContextManager)
