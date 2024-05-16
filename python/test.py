import os
import shutil
import subprocess
from pathlib import Path
from utils.paths import build_paths
import pprint

"""
For testing paths.py
"""

current_directory = os.getcwd()
_temp_dir = os.path.join(current_directory, "_temp")

test_file = os.path.join(_temp_dir, "test_file")
test_dir = os.path.join(_temp_dir, "test_dir")

def create_test_files():
    if os.path.isdir(_temp_dir):
        cleanup_test_files()

    create_temp = ["mkdir", _temp_dir]
    subprocess.run(create_temp)

    # Make fake models dir
    directories = ["models", "input", "custom_nodes", "custom_nodes/ComfyUI-AnimateDiffEvolved",  "models/checkpoints", "models/checkpoints/segm", "models/controlnet", "models/vae"]
    for directory in directories:
        os.makedirs(os.path.join(_temp_dir, directory), exist_ok=True)

    Path(os.path.join(_temp_dir, "models/checkpoints", "test_checkpoint")).touch()
    Path(os.path.join(_temp_dir, "models/checkpoints/segm", "segm_test")).touch()
    Path(os.path.join(_temp_dir, "models/controlnet", "test_controlnet")).touch()
    Path(os.path.join(_temp_dir, "custom_nodes/ComfyUI-AnimateDiffEvolved", "__init__.py")).touch()
    Path(os.path.join(_temp_dir, "input", "test_input1")).touch()
    Path(os.path.join(_temp_dir, "input", "test_input2")).touch()


def cleanup_test_files():
    shutil.rmtree(_temp_dir)

def can_find_paths():
    try:

        # Paths
        base = _temp_dir
        paths_to_upload = {
            "models": os.path.join(base, "models"),
            "custom_nodes": os.path.join(base, "custom_nodes"),
            "input": os.path.join(base, "input")
        }
        dep_lists = {
            "models": ["segm/segm_test", "test_controlnet"],
            "custom_nodes": ["ComfyUI-AnimateDiffEvolved"],
            "input": ["test_input1"]
        }

        paths = build_paths(paths_to_upload, dep_lists, "0")

        for path in paths:
            local_path = path[0]
            remote_path = path[1]
            
            if os.path.isfile(local_path):
                print(f"Putting file \n    from: {local_path}\n    to: {remote_path}")
            if os.path.isdir(local_path):
                print(f"Putting dir \n    from: {local_path}\n    to: {remote_path}")

            assert os.path.exists(local_path)


        print("TEST SUCCESSFUL")

    except Exception as e:
        print("Error:",e)


create_test_files()
can_find_paths()
cleanup_test_files()
