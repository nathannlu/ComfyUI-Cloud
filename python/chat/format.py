import dataclasses
import json
from .classes import ComfyUIWorkflowGraph

def preprocess_bot_response(bot_response):
    # Remove triple ticks
    bot_response = bot_response.replace("```json", "")
    bot_response = bot_response.replace("```", "")
    return json.loads(bot_response)

def postprocess(graph: ComfyUIWorkflowGraph) -> dict:
    # Clean up intermediate values
    for node in graph.nodes:
        node.__pre_serialize__()

    serialized = dataclasses.asdict(graph)
    return serialized


