import os
import re
import folder_paths
from packaging.requirements import Requirement, InvalidRequirement
from packaging.specifiers import SpecifierSet, InvalidSpecifier

def update_requirements():
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
                print("Checking requirements", filepath)
                lines = file.readlines()
            
            # Update dependencies in the file content
            updated_lines = []
            for line in lines:
                # Check if the line contains a git dependency without the specified format
                updated_line = remove_comments(line)
                if updated_line is None:
                    # Skip if the line is a comment
                    continue
                    
                # Remove newlines, empty spaces, and tabs
                if updated_line == "" or updated_line == "\n":
                    # Skip if the line is empty
                    continue

                updated_line = patch_git_urls(updated_line)
                validate_requirements(updated_line, filepath)

                updated_lines.append(updated_line)
            
            # Write the updated content back to the requirements.txt file
            with open(filepath, 'w') as file:
                file.writelines(updated_lines)

def patch_git_urls(line: str):
    """
    Because UV doesn't support requirements formatted as git+https:// with
    no prefix, so we append the package name in-front of the git url

    For example, WAS nodes has a requirements formatted as: 
    - git+https://github.com/WASasquatch/img2texture.git
    - git+https://github.com/WASasquatch/cstr

    This function would transform it to
    - img2texture @ git+https://github.com/WASasquatch/img2texture.git
    - cstr @ git+https://github.com/WASasquatch/cstr
    """
    # Check if the line contains a git dependency without the specified format
    match_git = re.match(r'^\s*git\+https://.*?/([^/]+)\.git', line)
    match_git_plus = re.match(r'^\s*git\+https://.*?/([^/]+)$', line)
    
    updated_line = line
    if match_git:
        package_name = match_git.group(1)
        updated_line = f"{package_name} @ {line.strip()}\n"
    elif match_git_plus:
        package_name = match_git_plus.group(1).strip()
        updated_line = f"{package_name} @ {line.strip()}\n"

    return updated_line

def remove_comments(line: str):
    """
    Removes comments from the line

    For example, facerestore_cf has a requirement formatted like:
    - gdown # supports downloading the large file from Google Drive
    """
    # if line is only #, return None
    if re.match(r'^\s*#', line):
        return None

    return re.sub(r'#.*', '', line)

def validate_requirements(line: str, filepath: str):
    """
    Check if the line is a valid requirement

    For example, comfyui-dream-project custom node causes an error because
    it has a requirement formatted like:
    - numpy<1.24>=1.18

    UV doesn't support this format 
    (https://github.com/astral-sh/uv/blob/bb61c2d5343b8b0645178e1c4b74f1493834b771/crates/requirements-txt/src/lib.rs#L203)
    """
    try:
        req = Requirement(line)

        # Validate the specifiers
        SpecifierSet(str(req.specifier))
    except Exception as e:
        raise Exception(
            f"error: Couldn't parse requirement in `requirements.txt`\n"
            f"  Caused by: {str(e)}.\n\n"
            f"  File: {filepath}\n"
        )



