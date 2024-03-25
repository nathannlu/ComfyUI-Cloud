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

task_status = {}

def random_seed(num_digits=15):
    range_start = 10 ** (num_digits - 1)
    range_end = (10**num_digits) - 1
    return random.randint(range_start, range_end)

@server.PromptServer.instance.routes.post("/comfy-cloud/save-log")
async def comfy_cloud_save_log(request):
    try:
        data = await request.json()
        log = data.get("log")
        log_id = log["logId"] #str
        workflow_id = log.get("workflowId") #str
        user_id = log["userId"] #str

        timestamp = datetime.datetime.now()
        formatted_timestamp = timestamp.strftime("%Y_%B_%d_%H-%M-%S")

        # Create the full path for the log file
        filename = f"log_{formatted_timestamp}.txt"
        current_path = os.getcwd()
        directory = os.path.join(current_path, "logs")
        log_path = os.path.join(directory, filename)

        # Check if the directory exists, if not, create it
        if not os.path.exists(directory):
            os.makedirs(directory)

        # Create a timestamp for the log entry
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Content to be written to the log file
        log_content = f"Log entry created at: {timestamp}\n"
        log_content += f"log_id: {log_id}\n"
        log_content += f"workflow_id: {workflow_id}\n"
        log_content += f"user_id: {user_id}\n"
        log_content += f"---\n"

        for log_entry in log["logs"]:
            log_content += f"{log_entry}\n"

        # Write the content to the log file
        with open(log_path, 'w') as log_file:
            log_file.write(log_content)

        return web.json_response({ "success": True }, status=200)

    except Exception as e:
        print("Error:", e)
        return web.json_response({ "error": e }, status=400)


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
            print(f"Skip {module_path} module for custom nodes due to the lack of NODE_CLASS_MAPPINGS.")
            return (module_name, [])
    except Exception as e:
        print(traceback.format_exc())
        print(f"Cannot import {module_path} module for custom nodes:", e)
        return (module_name, [])

def make_post_request_with_retry(url, data, headers=None, max_retries=3, retry_delay=1):
    for attempt in range(1, max_retries + 1):
        try:
            response = requests.post(url, data=data, headers=headers)

            # Check if the response status code is OK (2xx)
            response.raise_for_status()

            return response
        except requests.exceptions.RequestException as e:
            print(f"Attempt {attempt} failed: {e}")
            if attempt < max_retries:
                print(f"Retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
            else:
                print(f"Maximum retries reached. Failed to make POST request.")
                raise

def update_dependencies():
    # Loop over the files in the specified directory
    for custom_node in os.listdir("../../custom_nodes/"):
        filepath = os.path.join("../../custom_nodes", custom_node, "requirements.txt")
        
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
            
async def upload_task_execution(task_id, json_response, workflow_id, models_dep, nodes_dep, files):
    def run():
        try:
            exec(base64.b64decode(json_response["data"]), {
                    "workflow_id": workflow_id,
                    "models_dep": models_dep,
                    "nodes_dep": nodes_dep,
                    "files": files,
                }
            )
            # cleanup temp
            task_status[task_id] = {"status": "Task completed", "message": "Upload successful"}
        except Exception as e:
            task_status[task_id] = {"status": f"Task failed", "message": str(e)}

    loop = asyncio.get_event_loop()
    with concurrent.futures.ThreadPoolExecutor() as executor:
        await loop.run_in_executor(executor, run)

@server.PromptServer.instance.routes.post("/comfy-cloud/upload")
async def upload_dependencies(request):
    # Make a request to localhost
    try:
        authorization = request.headers.get('Authorization')
        json_data = await request.json()

        endpoint = json_data["endpoint"]
        workflow_id = json_data["workflow_id"]

        headers = None
        if authorization:
            headers = {
                "Authorization": authorization
            }

        models_dep = json_data["modelsToUpload"]
        nodes_dep = json_data["nodesToUpload"]
        files = json_data["filesToUpload"]

        current_datetime = datetime.datetime.now()
        body = {
            "token": current_datetime.strftime("%Y-%m-%d %H:%M:%S")
        }


        url = f"{endpoint}/e"
        response = make_post_request_with_retry(url, data=body, headers=headers)


        # Check if the request was successful (status code 200)
        if response.status_code == 200:
            # Parse the JSON content
            json_response = response.json()
            task_id = str(uuid.uuid4())
            task_status[task_id] = {"status": "Task started", "message": None}

            # Process custom nodes
            update_dependencies()

            custom_nodes_bytes = {}

            paths = copy.deepcopy(folder_paths.folder_names_and_paths)
            paths.pop("custom_nodes", None)
            paths.pop("configs", None)

            base = folder_paths.base_path
            models_dir = os.path.join(base, "models")
            custom_nodes_dir = os.path.join(base, "custom_nodes")

            # Upload models
            for name in models_dep:
                found = False
                for base_dir in paths.keys():
                    if name in folder_paths.get_filename_list(base_dir):
                        model_path = os.path.join(models_dir, base_dir, name)
                        if os.path.exists(model_path):
                            found = True

                if found is False:
                    return web.json_response({'success': False, 'message': f"Required model {name} was not found in your ComfyUI/models folder. Make sure you do not have extra_paths.yaml enabled"}, content_type='application/json')

            for name in nodes_dep:
                # check filepath exists
                p = os.path.join(custom_nodes_dir, name)
                if not os.path.exists(p):
                    return web.json_response({'success': False, 'message': f"Required node {name} was not found in your ComfyUI/custom_nodes folder. Make sure you do not have extra_paths.yaml enabled"}, content_type='application/json')
                custom_nodes_bytes[name] = ""

            asyncio.ensure_future(upload_task_execution(task_id, json_response, workflow_id, models_dep, custom_nodes_bytes, files))

            return web.json_response({'success': True, 'task_id': task_id}, content_type='application/json')
        else:
            return web.json_response({'success': False, 'message': "Failed to retrieve exec code"}, status=500, content_type='application/json')

    except Exception as e:
        print("Error", e)
        return web.json_response({'success': False, 'message': str(e)}, status=500, content_type='application/json')

@server.PromptServer.instance.routes.get("/comfy-cloud/upload-status/{task_id}")
async def get_task_status(request):
    task_id = request.match_info['task_id']
    status = {"status": "Task failed", "message": str("asd")} #task_status.get(task_id, {"status": "Task failed", "message": "Task not found"})
    return web.json_response(status)    


