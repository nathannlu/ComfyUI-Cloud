import io
import os
import asyncio
import aiostream
import json
from typing import List, Callable

from .spec import FileSpecContextManager, serialize_spec, FileUploadSpec
from .blob import blob_upload
from .hash import get_upload_hashes
from .net import make_post_request

base_url = "https://pytest-12acbe397fbc.herokuapp.com"

async def upload_file_specs(
    file_specs: List[FileUploadSpec],
    workflow_id: str,
    hashing_complete_callback: Callable = None
):
    """
    Take in a list of specs, and uploads them
    """

    # Send dict version of file specs to client
    serialize_spec_stream = aiostream.stream.map(file_specs, serialize_spec, task_limit=20)
    serialized_specs = await aiostream.stream.list(serialize_spec_stream)
    serialized_specs_dict = {}

    # Adds id to list, as well as creates a dict version
    for idx, spec in enumerate(serialized_specs):
        spec["id"] = idx
        serialized_specs_dict[idx] = spec

    # Check serialized specs
    max_size = 50 * 1024 * 1024  # 50 MB in bytes
    json_data = json.dumps(serialized_specs)
    json_size = len(json_data.encode('utf-8'))
    if json_size > max_size:
        raise Exception(f'Workflow too large error. File specs size exceeds the 50MB limit: {data_size} bytes')
        
    if hashing_complete_callback is not None:
        hashing_complete_callback()

    print("Uploading dependencies to cloud.")
        
    # Get a list of blob_ids from the client
    url = f'{base_url}/upload-urls'
    response_data = await make_post_request(url, { "specs": serialized_specs, "workflow_id": workflow_id })
    upload_data = response_data["data"]

    # Create the upload data
    # Mix the response data from the server and the file spec
    # and pass it to the generator
    for spec in upload_data:
        if spec["id"] in serialized_specs_dict:
            spec["data"] = {
                **serialized_specs_dict[spec["id"]],
                **spec["data"]
            }

    def gen_upload_providers():
        for gen in upload_data:
            yield gen

    async def _upload_and_commit(spec):
        await blob_upload(spec)

        # Blob upload has finished. Put the spec
        # on the queue to be committed
        url = f'{base_url}/commit'
        response_data = await make_post_request(url, { "spec": spec })

    files_stream = aiostream.stream.iterate(gen_upload_providers())
    uploads_stream = aiostream.stream.map(files_stream, _upload_and_commit, task_limit=20)
    files = await aiostream.stream.list(uploads_stream)
    print("Successfully uploaded dependent models and custom nodes to cloud.")

