import io
import copy 
import os
import base64
from aiohttp import web
import asyncio

import concurrent.futures
import time
from pathlib import Path, PurePosixPath
from typing import (
    IO,
    AsyncGenerator,
    AsyncIterator,
    BinaryIO,
    Callable,
    Generator,
    List,
    Optional,
    Sequence,
    Type,
    Union,
    Any, 
)
import aiostream
from .sync import synchronize_api

from .blob import (
    get_file_upload_spec_from_fileobj,
    get_file_upload_spec_from_path,
)


class _VolumeUploadContextManager:
    """Context manager for batch-uploading files to a Volume."""

    _volume_id: str
    _force: bool

    def __init__(self, volume_id: str, file_specs, force: bool = False):
        """mdmd:hidden"""
        self._volume_id = volume_id
        self._client = None #client
        self._upload_generators = []
        self._force = force

        self.files_stream = file_specs

    async def __aenter__(self):
        return self



    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if not exc_val:
            # Flatten all the uploads yielded by the upload generators in the batch
            def gen_upload_providers():
                for gen in self._upload_generators:
                    yield from gen

            async def gen_file_upload_specs(): # -> AsyncGenerator[FileUploadSpec, None]:
                loop = asyncio.get_event_loop()
                with concurrent.futures.ThreadPoolExecutor() as exe:
                    # TODO: avoid eagerly expanding
                    futs = [loop.run_in_executor(exe, f) for f in gen_upload_providers()]
                    for fut in asyncio.as_completed(futs):
                        yield await fut

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
                for fut in asyncio.as_completed(futs):
                    yield await fut

        files_stream = aiostream.stream.iterate(gen_file_upload_specs())
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

VolumeUploadContextManager = synchronize_api(_VolumeUploadContextManager)
