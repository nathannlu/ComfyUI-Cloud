import asyncio
import base64
import concurrent.futures
import copy
import os
import uuid
import time
import traceback
import random
import re
import requests
import importlib
import sys
import datetime
from aiohttp import web
from .user import load_user_profile

import server
import execution
import folder_paths

from .upload import upload_file_specs
from .upload.spec import FileSpecContextManager
from .upload.blob import progress

task_status = {}


@server.PromptServer.instance.routes.post("/comfy-cloud/validate-input-path")
async def validate_input_path(request):
    try:
        data = await request.json()
        input_paths = data.get("paths")

        paths_not_found = []
        base = folder_paths.base_path
        for path in input_paths:
            full_path = os.path.join(base, 'input', path)

            if not os.path.exists(full_path):
                paths_not_found.append(path)

        return web.json_response({ "invalid_paths": paths_not_found }, status=200)
    except Exception as e:
        print("Error:", e)
        return web.json_response({ "error": e }, status=400)


@server.PromptServer.instance.routes.post("/comfy-cloud/validate-prompt")
async def comfy_cloud_validate_prompt(request):
    data = await request.json()

    workflow_api = data.get("workflow_api")

    def random_seed(num_digits=15):
        range_start = 10 ** (num_digits - 1)
        range_end = (10**num_digits) - 1
        return random.randint(range_start, range_end)

    for key in workflow_api:
        if 'inputs' in workflow_api[key] and 'seed' in workflow_api[key]['inputs']:
            workflow_api[key]['inputs']['seed'] = random_seed()

    try:
        valid = execution.validate_prompt(workflow_api)

        if valid[0]:
            return web.json_response({ "is_valid": True, "node_errors": valid[3] }, status=200)
        else:
            return web.json_response({ "is_valid": False, "node_errors": valid[3] }, status=200)

    except Exception as e:
        print("Error:", e)
        return web.json_response({ "error": e }, status=400)


@server.PromptServer.instance.routes.get("/comfy-cloud/user")
async def comfy_cloud_run(request):
    try:
        data = load_user_profile()
        return web.json_response({
            "user": data
        }, content_type='application/json')
    except Exception as e:
        print("Error:", e)
        return web.json_response({ "error": e }, status=400)

@server.PromptServer.instance.routes.get("/comfy-cloud/custom-nodes-list")
async def get_custom_nodes_list(request):
    #base_node_names = set(NODE_CLASS_MAPPINGS.keys())

    custom_nodes = {}
    node_paths = folder_paths.get_folder_paths("custom_nodes")
    #node_import_times = []
    for custom_node_path in node_paths:
        possible_modules = os.listdir(os.path.realpath(custom_node_path))
        if "__pycache__" in possible_modules:
            possible_modules.remove("__pycache__")

        for possible_module in possible_modules:
            module_path = os.path.join(custom_node_path, possible_module)
            if os.path.isfile(module_path) and os.path.splitext(module_path)[1] != ".py": continue
            if module_path.endswith(".disabled"): continue
            #time_before = time.perf_counter()
            mappings = load_custom_node(module_path) #, base_node_names)
            custom_nodes[mappings[0]] = mappings[1]

    return web.json_response({'custom_nodes': custom_nodes}, content_type='application/json')

def load_custom_node(module_path, ignore=set()):
    mappings = []

    module_name = os.path.basename(module_path)
    if os.path.isfile(module_path):
        sp = os.path.splitext(module_path)
        module_name = sp[0]
    try:
        if os.path.isfile(module_path):
            module_spec = importlib.util.spec_from_file_location(module_name, module_path)
            module_dir = os.path.split(module_path)[0]
        else:
            module_spec = importlib.util.spec_from_file_location(module_name, os.path.join(module_path, "__init__.py"))
            module_dir = module_path

        module = importlib.util.module_from_spec(module_spec)
        sys.modules[module_name] = module
        module_spec.loader.exec_module(module)

        if hasattr(module, "NODE_CLASS_MAPPINGS") and getattr(module, "NODE_CLASS_MAPPINGS") is not None:
            for name in module.NODE_CLASS_MAPPINGS:
                if name not in ignore:
                    #mappings[name] = module.NODE_CLASS_MAPPINGS[name]
                    mappings.append(name)
                    #NODE_CLASS_MAPPINGS[name] = module.NODE_CLASS_MAPPINGS[name]
            """
            if hasattr(module, "NODE_DISPLAY_NAME_MAPPINGS") and getattr(module, "NODE_DISPLAY_NAME_MAPPINGS") is not None:
                print(module.NODE_DISPLAY_NAME_MAPPINGS)
                #NODE_DISPLAY_NAME_MAPPINGS.update(module.NODE_DISPLAY_NAME_MAPPINGS)
            """

            return (module_name, mappings)
        else:
            #print(f"Skip {module_path} module for custom nodes due to the lack of NODE_CLASS_MAPPINGS.")
            return (module_name, [])
    except Exception as e:
        print(traceback.format_exc())
        print(f"Cannot import {module_path} module for custom nodes:", e)
        return (module_name, [])

def update_dependencies():
    """
    Formats requirements.txt
    """

    base = folder_paths.base_path
    custom_nodes_dir = os.path.join(base, "custom_nodes")

    # Loop over the files in the specified directory
    for custom_node in os.listdir(custom_nodes_dir):
        filepath = os.path.join(custom_nodes_dir, custom_node, "requirements.txt")
        
        # Check if the file is a requirements.txt file
        if os.path.exists(filepath):
 
            # Read the content of the requirements.txt file
            with open(filepath, 'r') as file:
                lines = file.readlines()
            
            # Update dependencies in the file content
            updated_lines = []
            for line in lines:
              # Check if the line contains a git dependency without the specified format
                match_git = re.match(r'^\s*git\+https://.*?/([^/]+)\.git', line)
                match_git_plus = re.match(r'^\s*git\+https://.*?/([^/]+)$', line)
                
                if match_git:
                    package_name = match_git.group(1)
                    updated_lines.append(f"{package_name} @ {line.strip()}\n")
                elif match_git_plus:
                    package_name = match_git_plus.group(1).strip()
                    updated_lines.append(f"{package_name} @ {line.strip()}\n")
                else:
                    updated_lines.append(line)
            
            # Write the updated content back to the requirements.txt file
            with open(filepath, 'w') as file:
                file.writelines(updated_lines)
            
async def upload_task_execution(task_id, file_specs, workflow_id):
    try:
        await upload_file_specs(file_specs, workflow_id)

        # cleanup temp
        task_status[task_id] = {"status": "Task completed", "message": "Upload successful"}
    except Exception as e:
        print(e)
        task_status[task_id] = {"status": f"Task failed", "message": str(e)}


@server.PromptServer.instance.routes.post("/comfy-cloud/upload")
async def upload_dependencies(request):
    # Make a request to localhost
    try:
        json_data = await request.json()

        #endpoint = json_data["endpoint"]
        workflow_id = json_data["workflow_id"]

        # dependencies
        models_dep = json_data["modelsToUpload"]
        nodes_dep = json_data["nodesToUpload"]
        files = json_data["filesToUpload"]

        # Paths
        base = folder_paths.base_path
        models_dir = os.path.join(base, "models")
        custom_nodes_dir = os.path.join(base, "custom_nodes")
        # Paths - for searching through /model subfolders
        paths = copy.deepcopy(folder_paths.folder_names_and_paths)
        paths.pop("custom_nodes", None)
        paths.pop("configs", None)

        # Create upload task
        task_id = str(uuid.uuid4())
        task_status[task_id] = {"status": "Task started", "message": None}

        # Our server uses a custom dependency manager
        # that requires a specific format for requirements.txt.
        # Loop through all dependent custom nodes and patch.
        update_dependencies()

        # Upload code
        file_specs = []

        # Add files
        with FileSpecContextManager(file_specs) as batch:
            # Upload models
            for name in models_dep:
                found = False
                for base_dir in paths.keys():
                    if name in folder_paths.get_filename_list(base_dir):
                        model_path = os.path.join(models_dir, base_dir, name)
                        if os.path.exists(model_path):
                            found = True
                            batch.put_file(model_path, f"/vol/{workflow_id}/comfyui/models/{base_dir}/{name}")

                # Handle model not found
                # We have to do this because the code for finding
                # models need to go through each sub folder inside
                # /models. 
                # The models folder is comprised of subfolders such
                # as checkpoints, controlnets, loras, etc
                if found is False:
                    raise Exception(f"Required model {name} was not found in your ComfyUI/models folder. Make sure you do not have extra_paths.yaml enabled")

            # Upload custom nodes
            for name in nodes_dep:
                # check filepath exists
                p = os.path.join(custom_nodes_dir, name)
                print("PATH",p)
                if not os.path.exists(p):
                    raise Exception(f"Required node {name} was not found in your ComfyUI/custom_nodes folder. Make sure you do not have extra_paths.yaml enabled")

                batch.put_directory(p, f"/vol/{workflow_id}/comfyui/custom_nodes/{name}")

            # Upload input files
            for filename in files:
                input_file_path = os.path.join(input_dir, filename)
                if os.path.exists(input_file_path):
                    batch.put_file(input_file_path, f"/vol/{workflow_id}/comfyui/input/{filename}")
                else:
                    raise Exception(f"Input '{path}' does not exist.")

            # Create file specs for upload
            file_specs = batch.generate_specs()

        # Queue upload task in background
        asyncio.ensure_future(upload_task_execution(task_id, file_specs, workflow_id))

        return web.json_response({'success': True, 'task_id': task_id}, content_type='application/json')
    except Exception as e:
        print("Error", e)
        return web.json_response({'success': False, 'message': str(e)}, status=500, content_type='application/json')

@server.PromptServer.instance.routes.get("/comfy-cloud/upload-status/{task_id}")
async def get_task_status(request):
    task_id = request.match_info['task_id']
    status = task_status.get(task_id, {"status": "Task failed", "message": "Task not found"})
    status["progress"] = progress
    return web.json_response(status)    


