import datetime
import os
import subprocess
import sys
import atexit
import threading
import logging
from logging.handlers import RotatingFileHandler

# Running with export CD_ENABLE_LOG=true; python main.py

# Check for 'cd-enable-log' flag in input arguments
# cd_enable_log = '--cd-enable-log' in sys.argv
cd_enable_log = os.environ.get('CD_ENABLE_LOG', 'false').lower() == 'true'

def setup():
    handler = RotatingFileHandler('comfy-cloud.log', maxBytes=500000, backupCount=5)

    original_stdout = sys.stdout
    original_stderr = sys.stderr

    class StreamToLogger():
        def __init__(self, log_level):
            self.log_level = log_level

        def write(self, buf):
            if (self.log_level == logging.INFO):
                original_stdout.write(buf)
                original_stdout.flush()
            elif (self.log_level == logging.ERROR):
                original_stderr.write(buf)
                original_stderr.flush()

            for line in buf.rstrip().splitlines():
                handler.handle(
                    logging.LogRecord(
                        name="comfy-cloud",
                        level=self.log_level,
                        pathname="prestartup_script.py",
                        lineno=1,
                        msg=line.rstrip(),
                        args=None,
                        exc_info=None
                    )
                )

        def flush(self):
            if (self.log_level == logging.INFO):
                original_stdout.flush()
            elif (self.log_level == logging.ERROR):
                original_stderr.flush()

    # Redirect stdout and stderr to the logger
    sys.stdout = StreamToLogger(logging.INFO)
    sys.stderr = StreamToLogger(logging.ERROR)

if cd_enable_log:
   print("** Comfy Cloud logging enabled")
   setup() 

import subprocess
import os

def is_git_up_to_date():
    try:
        # Run git fetch to update remote branches
        subprocess.run(["git", "fetch"])

        # Check if the local branch is behind the remote branch
        result = subprocess.run(["git", "status", "-uno"], capture_output=True, text=True)
        output = result.stdout

        # If "Your branch is up to date" is found in the output, the repository is up to date
        if "Your branch is up to date" in output:
            return True
        else:
            return False
    except Exception as e:
        print("Error:", e)
        return False

def pull_latest():
    try:
        # Run git pull to fetch and merge changes from the remote repository
        subprocess.run(["git", "pull"])
        print("Comfy Cloud repository is up to date.")
    except Exception as e:
        print("Error:", e)

# Change the current working directory to the script's directory
script_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(script_dir)
if is_git_up_to_date():
    print("Comfy Cloud is up to date.")
else:
    print("Comfy Cloud is not up to date. Pulling latest changes...")
    pull_latest()


