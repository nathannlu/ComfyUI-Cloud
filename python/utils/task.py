import dataclasses
import uuid
from enum import Enum
from typing import Any, Dict

class TaskStatus(Enum):
    STARTED = "Task started"
    COMPLETED = "Task completed"
    HASHING = "Task hashing"
    UPLOADING = "Task uploading"
    ERROR = "Task failed"

@dataclasses.dataclass
class Task:
    status: TaskStatus
    message: str
    progress: Any

task_dict: Dict[str, Task] = {}

def task_create() -> str:
    task_id = str(uuid.uuid4())

    new_task = Task(
        status=TaskStatus.STARTED,
        message=None,
        progress=None
    )

    task_dict[task_id] = new_task

    return task_id

def task_get_by_id(task_id: str) -> Task:
    default_task = Task(TaskStatus.ERROR, "Task not found", None)
    return task_dict.get(task_id, default_task)

def task_set_progress(task_id: str, progress: str) -> Task:
    task = task_get_by_id(task_id)
    if task.status != TaskStatus.ERROR:
        task.progress = progress

    return task

def task_set_message(task_id: str, message: str) -> Task:
    task = task_get_by_id(task_id)
    if task.status != TaskStatus.ERROR:
        task.message = message

    return task

def task_set_status(task_id: str, status: TaskStatus) -> Task:
    task = task_get_by_id(task_id)
    if task.status != TaskStatus.ERROR:

        if status == TaskStatus.HASHING and task.status == TaskStatus.UPLOADING:
            task.progress = None

        task.status = status

    return task

def custom_asdict_factory(data):

    # serialize the enum
    def convert_value(obj):
        if isinstance(obj, Enum):
            return obj.value
        return obj

    return dict((k, convert_value(v)) for k, v in data)

def task_serialize(task: Task) -> Dict[str, Any]:
    return dataclasses.asdict(task, dict_factory=custom_asdict_factory)

