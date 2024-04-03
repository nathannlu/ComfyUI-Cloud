import os

def _search_dependency_paths(root_dir, name):
    """
    This function returns the full path of a file/folder
    when given the name
    - search_dir is a filepath
    - names is a list of filenames or folder names
    """
    for dirpath, dirnames, filenames in os.walk(root_dir):

        relative_path = os.path.relpath(dirpath, root_dir)
        potential_path = os.path.normpath(os.path.join(root_dir, relative_path, name))

        if os.path.exists(potential_path):
            return os.path.normpath(os.path.join(relative_path, name))

    raise Exception(f"Required {name} was not found in {root_dir} folder. Make sure you do not have extra_paths.yaml enabled")

def _search_dependency_paths_from_list(root_dir, names):
    results = []
    for name in names:
        try:
            result = _search_dependency_paths(root_dir, name)
            results.append(result)
        except Exception as e:
            raise
    return results


def to_linux_path(path):
    return path.replace("\\", "/")


def build_paths(paths_to_upload, dep_lists, workflow_id=""):
    """
    Handles finding, building, verifying path
    """
    paths = []
    for dirname, base_path in paths_to_upload.items():
        to_upload = _search_dependency_paths_from_list(base_path, dep_lists[dirname])

        for path in to_upload:
            local_path = os.path.join(base_path, path)
            # normpath converts the path to system specific path
            norm_local_path = os.path.normpath(local_path)

            local_path = os.path.join(base_path, dirname, path)
            remote_path = to_linux_path(os.path.normpath(os.path.join("vol", workflow_id, "comfyui", dirname, path)))

            paths.append((norm_local_path, remote_path))

    return paths

