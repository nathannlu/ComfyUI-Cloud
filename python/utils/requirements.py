import os
import re
import folder_paths

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
