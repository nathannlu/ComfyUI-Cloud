import io
import os
import asyncio

from .volume import VolumeUploadContextManager
from .blob import perform_multipart_upload, BytesIOSegmentPayload, _upload_to_s3_url
from .hash import get_upload_hashes

import folder_paths
import copy 

import requests
import json
import aiohttp

def get_content_length(data):
    # *Remaining* length of file from current seek position
    pos = data.tell()
    data.seek(0, os.SEEK_END)
    content_length = data.tell()
    data.seek(pos)
    return content_length - pos

async def get_file_specs(workflow_id, models_dep, nodes_dep, files):
    paths = copy.deepcopy(folder_paths.folder_names_and_paths)
    paths.pop("custom_nodes", None)
    paths.pop("configs", None)

    base = folder_paths.base_path
    models_dir = os.path.join(base, "models")
    custom_nodes_dir = os.path.join(base, "custom_nodes")
    input_dir = os.path.join(base, "input")

    file_specs = None
    # Calculate file hashes
    with VolumeUploadContextManager(None, file_specs, force=True) as batch:

        for name in models_dep:
            for base_dir in paths.keys():
                if name in folder_paths.get_filename_list(base_dir):
                    model_path = os.path.join(models_dir, base_dir, name)
                    if os.path.exists(model_path):
                        batch.put_file(model_path, f"/vol/{workflow_id}/comfyui/models/{base_dir}/{name}")
                    else:
                        raise Exception(f"Model '{path}' does not exist.")

        # Upload custom nodes
        for name, value in nodes_dep.items():
            custom_node_path = os.path.join(custom_nodes_dir, name)

            if os.path.exists(custom_node_path):
                batch.put_directory(custom_node_path, f"/vol/{workflow_id}/comfyui/custom_nodes/{name}")
            else:
                raise Exception(f"Custom node '{path}' does not exist.")


        # Upload files
        for filename in files:
            input_file_path = os.path.join(input_dir, filename)
            if os.path.exists(input_file_path):
                batch.put_file(input_file_path, f"/vol/{workflow_id}/comfyui/input/{filename}")
            else:
                raise Exception(f"Input '{path}' does not exist.")


        #batch.put_directory(path, "/helloworld")
        #batch.put_file(path, target_path)
        x = batch.generate_specs()


        file_specs = x

    # If server responds with s3 url, filename, and spec -
    # then upload
    s = []

    # Prepare new upload dict
    async for item in file_specs:
        obj = item.__dict__

        with item.source() as data:
            upload_hashes = get_upload_hashes(data)

            if isinstance(data, bytes):
                data = io.BytesIO(data)
            
            content_length = get_content_length(data)

            obj["upload_hashes"] = upload_hashes.__dict__
            obj["content_length"] = content_length
            del obj["source"]

        s.append(obj)

    return s



burl = "https://pytest-12acbe397fbc.herokuapp.com"

async def make_post_request(url, data):
    async with aiohttp.ClientSession() as session:
        async with session.post(url, json=data) as response:
            return await response.json()

# @todo does not support dirs yet
async def upload_file(workflow_id, models_dep, nodes_dep, files):
    try:

        # Client generates file specs
        specs = await get_file_specs(workflow_id, models_dep, nodes_dep, files)


        url = f'{burl}/upload-urls'
        data = {
            "specs": specs
        }
        response_data = await make_post_request(url, data)
        outputs = response_data["data"]

        # @todo - handle non multipart
        blob_ids = []
        for x in outputs:

            is_multipart = x["type"] == "multipart"
            resp = x["data"]

            if is_multipart:

                # find file
                filename = resp["filename"]
                data = open(filename, "rb")

                # Get filename, and search for file
                # resp obj:
                # - content_length
                # - max_part_size
                # - part_urls 
                # - completion_url
                # - filename
                await perform_multipart_upload(
                    data,
                    content_length=resp["content_length"],
                    max_part_size=resp["max_part_size"],
                    part_urls=resp["part_urls"],
                    completion_url=resp["completion_url"],
                    filename=filename,
                )

            else:
                filename = resp["filename"]
                content_length = resp["content_length"]
                upload_hashes = resp["upload_hashes"]
                data = open(filename, "rb")

                payload = BytesIOSegmentPayload(data, segment_start=0, segment_length=content_length, filename = filename)
                await _upload_to_s3_url(
                    resp["upload_url"],
                    payload,
                    # for single part uploads, we use server side md5 checksums
                    content_md5_b64=upload_hashes["md5_base64"],
                )

            blob_ids.append({
                "type": x["type"],
                "blob_id": resp["blob_id"],
                "use_blob": resp["use_blob"],
                "sha256_hex": resp["sha256_hex"],
                "mode": resp["mode"],
                "content": resp["content"],
                "mount_filename": resp["mount_filename"],
            })

        # Once done, send resp.blob_id back to server

        url = f'{burl}/commit'
        data = {
            "blob_ids":blob_ids 
        }
        response_data = await make_post_request(url, data)

    except Exception as e:
        print("error", e)

