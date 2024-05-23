import os
import sys
import contextlib
import importlib
import traceback
import folder_paths

@contextlib.contextmanager
def suppress_console():
    with open(os.devnull, 'w') as devnull:
        old_stdout = sys.stdout
        old_stderr = sys.stderr
        sys.stdout = devnull
        sys.stderr = devnull
        try:
            yield
        finally:
            sys.stdout = old_stdout
            sys.stderr = old_stderr
            
def get_custom_node_mappings(module_path, ignore=set()):
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
        module_spec.loader.exec_module(module)

        if hasattr(module, "NODE_CLASS_MAPPINGS") and getattr(module, "NODE_CLASS_MAPPINGS") is not None:
            for name in module.NODE_CLASS_MAPPINGS:
                if name not in ignore:
                    mappings.append(name)

            return (module_name, mappings)
        else:
            # Skip module for custom nodes due to the lack of NODE_CLASS_MAPPINGS.
            return (module_name, [])
    except Exception as e:
        return (module_name, [])

def get_custom_node_list():
    """
    Returns a list of custom nodes.
    """
    custom_nodes = {}
    node_paths = folder_paths.get_folder_paths("custom_nodes")
    for custom_node_path in node_paths:
        possible_modules = os.listdir(os.path.realpath(custom_node_path))
        if "__pycache__" in possible_modules:
            possible_modules.remove("__pycache__")

        for possible_module in possible_modules:
            module_path = os.path.join(custom_node_path, possible_module)
            if os.path.isfile(module_path) and os.path.splitext(module_path)[1] != ".py": continue
            if module_path.endswith(".disabled"): continue
            mappings = get_custom_node_mappings(module_path)
            custom_nodes[mappings[0]] = mappings[1]

    return custom_nodes

def get_custom_node_list_silent():
    with suppress_console():
        return get_custom_node_list()
