import dataclasses
from typing import Dict


@dataclasses.dataclass
class FileProgress:
    max: int
    value: int

progress_dict: Dict[str, FileProgress] = {}

def progress_update(filename, value, max):
    # filename can be PosixPath
    filename = str(filename)

    progress = progress_dict.get(filename, FileProgress(0, 0))
    progress.value = value
    progress.max = max

    progress_dict[filename] = progress


def reset_progress(progress_dict):
    progress_dict = {}



