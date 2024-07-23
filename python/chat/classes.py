from dataclasses import dataclass, field
from typing import List, Dict, Any
from nodes import NODE_CLASS_MAPPINGS

@dataclass
class LLMGeneratedGraph:
    nodes: dict
    edges: dict

    def get_last_link_id(self):
        return len(self.edges)

    def get_last_node_id(self):
        return len(self.edges)


# TODO: move to inside ComfyUIWorkflowGraphNodeClass
def _get_widget_values(node):
    class_type = node['class_type']
    registered_node = NODE_CLASS_MAPPINGS[class_type]()

    node_widget_values = []
    if 'widget_values' in node:
        node_widget_values = node['widget_values']

    registered_node_inputs_dict = registered_node.INPUT_TYPES()["required"] # dictionary
    final_widget_values = {}

    # ComfyUI represents a dropdown widget value with
    # index 0 of the tuple as a list
    def is_list_selection_widget_value(value):
        return type(value[0]) == list

    # Prepare the widget values dictionary for the registered custom node's input types
    registered_node_widget_values = {}
    for key, value in registered_node_inputs_dict.items():
        if len(value) > 1 or is_list_selection_widget_value(value):
            registered_node_widget_values[key] = value

    # Build widget values dictionary
    for key, value in registered_node_widget_values.items():
        if key in node_widget_values:
            # If the key exists in the LLM generated output, use that value
            final_widget_values[key] = node_widget_values[key]

        else:
            # Load final_widget_values with the default
            if is_list_selection_widget_value(value):
                # If it is a dropdown, just choose the first value of the list
                final_widget_values[key] = value[0][0]
            else:
                final_widget_values[key] = value[1]["default"]

    final_widget_values_list = list(final_widget_values.values())

    # edge case:
    # For some reason, KSampler widget values do not account for 'control_after_generate'.
    if node['class_type'] == "KSampler":
        final_widget_values_list.insert(1, "randomize")


    return final_widget_values_list



@dataclass
class ComfyUIWorkflowGraphNode:
    id: int
    type: str
    order: int
    mode: int = 0
    pos: List[int] = field(default_factory=list)
    flags: Dict[str, Any] = field(default_factory=dict)
    inputs: List[object] = field(default_factory=list)
    outputs: List[object] = field(default_factory=list)
    properties: Dict[str, Any] = field(default_factory=dict)
    widgets_values: List[Any] = field(default_factory=list)

    # This is the object from NODE_CLASS_MAPPINGS and the
    # internal object used by ComfyUI
    _registered_node: Any = field(init=False)
    
    def __post_init__(self):
        node = NODE_CLASS_MAPPINGS[self.type]()
        self._registered_node = node

        # Prepare input types
        registered_node_inputs_dict = self._registered_node.INPUT_TYPES()["required"] # dictionary
        registered_node_inputs_list = list(registered_node_inputs_dict.keys())

        for index, (key, val) in enumerate(registered_node_inputs_dict.items()):
            if len(val) > 1 or type(val[0]) == list:
                continue

            self.inputs.append({
                'name': key,
                'type': val[0],
                'link': None, 
            })

        # Prepare return types
        registered_node_outputs_tuple = self._registered_node.RETURN_TYPES
        for index, ret_typ in enumerate(registered_node_outputs_tuple):
            self.outputs.append({
                'name': ret_typ,
                'type': ret_typ,
                'links': [],
                'slot_index': index
            })


    def __pre_serialize__(self):
        # _registered_node is a class from nodes.py
        # and does not need to be sent to the front end
        self._registered_node = None

    def _get_output_type_from_slot_index(self, slot_index):
        registered_node = self._registered_node
        registered_node_outputs_tuple = registered_node.RETURN_TYPES
        print(registered_node_outputs_tuple, slot_index)
        return registered_node_outputs_tuple[slot_index]

    def _get_input_slot_index_from_name(self, key):
        registered_node = self._registered_node
        registered_node_inputs_dict = registered_node.INPUT_TYPES()["required"] # dictionary
        registered_node_inputs_list = list(registered_node_inputs_dict.keys())

        print(registered_node_inputs_list)

        # find the index of the key in the list
        return registered_node_inputs_list.index(key)

    def add_input(self, name: str, typ: str, link: int):
        # find by name
        for input in self.inputs:
            if input['name'] == name:
                input['link'] = link


    def add_output(self, link_id, slot_index):
        # Append link_id to existing slot index if it exists
        for output in self.outputs:
            if output['slot_index'] == slot_index:
                output['links'].append(link_id)


@dataclass
class ComfyUIWorkflowGraphLink:
    id: int
    from_node_id: int
    from_node_output_slot: int
    to_node_id: int
    to_node_input_slot: int
    from_node_output_type: str

    def to_list(self):
        return [
            self.id,
            self.from_node_id,
            self.from_node_output_slot,
            self.to_node_id,
            self.to_node_input_slot,
            self.from_node_output_type
        ]

@dataclass
class ComfyUIWorkflowGraph:
    """
    This is the structure accepted by ComfyUI's LoadGraph method.
    """

    last_node_id: int
    last_link_id: int
    nodes: List[ComfyUIWorkflowGraphNode] = field(default_factory=list) 
    links: List[object] = field(default_factory=list) 
    groups: List[object] = field(default_factory=list)
    config: Dict[str, object] = field(default_factory=dict)
    extra: Dict[str, object] = field(default_factory=dict)
    version: float = 0.4

    # For easy access to nodes by id
    _nodes_dict: Dict[str, int] = field(init=False, default_factory=dict)

    def add_node(self, node: ComfyUIWorkflowGraphNode):
        self.nodes.append(node)
        node_index = len(self.nodes) - 1
        self._nodes_dict[node.id] = node_index

    def add_link(self, link: ComfyUIWorkflowGraphLink):
        self.links.append(link.to_list())

    def get_node_by_id(self, node_id):
        index = self._nodes_dict.get(node_id, None)
        node = self.nodes[index]
        return node


