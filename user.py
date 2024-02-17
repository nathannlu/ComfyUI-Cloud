import os
import base64
import uuid
import json

file_path = ".comfycloud_profile"

def load_user_profile():
    if os.path.exists(file_path):
        try:
            with open(file_path, 'r') as file:
                data = json.load(file)
                return data
        except json.JSONDecodeError:
            # @todo
            # delete corrupted file and create a new one
            print(f"Error decoding user profile")
    else:
        # If the file doesn't exist, create a new one with default values
        data = {"id": str(uuid.uuid4())}
        save_user_profile(data)

        return data

def save_user_profile(data):
    with open(file_path, 'w') as file:
        json.dump(data, file)



