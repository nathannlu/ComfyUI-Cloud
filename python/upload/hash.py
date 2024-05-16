import os
import base64
import dataclasses
import hashlib
from typing import IO, Union, Tuple

HASH_CHUNK_SIZE = 4096

def _update(hashers, data: Union[bytes, IO[bytes]]):
    if isinstance(data, bytes):
        for hasher in hashers:
            hasher.update(data)
    else:
        assert not isinstance(data, (bytearray, memoryview))  # https://github.com/microsoft/pyright/issues/5697

        # (Nathan): Determine total size of the file
        total_size = os.fstat(data.fileno()).st_size
        processed_size = 0

        pos = data.tell()
        while 1:
            chunk = data.read(HASH_CHUNK_SIZE)
            if not isinstance(chunk, bytes):
                raise ValueError(f"Only accepts bytes or byte buffer objects, not {type(chunk)} buffers")
            if not chunk:
                break
            for hasher in hashers:
                hasher.update(chunk)

            # Calculate and display the progress
            processed_size += len(chunk)
            progress = processed_size / total_size * 100
            print(f'\rProgress: {progress:.2f}%', end='', flush=True)

        print("")
        data.seek(pos)


def get_sha256_hex(data: Union[bytes, IO[bytes]]) -> str:
    hasher = hashlib.sha256()
    _update([hasher], data)
    return hasher.hexdigest()


def get_sha256_base64(data: Union[bytes, IO[bytes]]) -> str:
    hasher = hashlib.sha256()
    _update([hasher], data)
    return base64.b64encode(hasher.digest()).decode("ascii")


def get_md5_base64(data: Union[bytes, IO[bytes]]) -> str:
    hasher = hashlib.md5()
    _update([hasher], data)
    return base64.b64encode(hasher.digest()).decode("utf-8")


@dataclasses.dataclass
class UploadHashes:
    md5_base64: str
    sha256_base64: str


def get_upload_hashes(data: Union[bytes, IO[bytes]]) -> Tuple[UploadHashes, str]:
    md5 = hashlib.md5()
    sha256 = hashlib.sha256()
    _update([md5, sha256], data)
    return UploadHashes(
        md5_base64=base64.b64encode(md5.digest()).decode("ascii"),
        sha256_base64=base64.b64encode(sha256.digest()).decode("ascii"),
    ), sha256.hexdigest()
