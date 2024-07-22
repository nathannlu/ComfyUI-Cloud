from .classes import ComfyUIWorkflowGraph, ComfyUIWorkflowGraphNode, ComfyUIWorkflowGraphLink, LLMGeneratedGraph, _get_widget_values
from .comfy_types import input_output_types, get_type_from_input_name
from nodes import NODE_CLASS_MAPPINGS


def transform_input_to_graph(llm_graph) -> ComfyUIWorkflowGraph:
    llm_graph = LLMGeneratedGraph(
        nodes=llm_graph["nodes"],
        edges=llm_graph["edges"]
    )
    last_node_id = llm_graph.get_last_node_id()
    last_link_id = llm_graph.get_last_link_id()

    comfy_graph = ComfyUIWorkflowGraph(
        last_node_id=llm_graph.get_last_node_id(),
        last_link_id=llm_graph.get_last_link_id(),
    )

    # Add nodes
    for index, node in enumerate(llm_graph.nodes):
        widget_values = _get_widget_values(node)
        new_node = ComfyUIWorkflowGraphNode(
            id=node["id"],
            type=node["class_type"],
            order=index,
            widgets_values=widget_values
        )

        comfy_graph.add_node(new_node)

    for index, edge in enumerate(llm_graph.edges):
        link_id = index + 1
        to_node = comfy_graph.get_node_by_id(edge['to'])
        from_node = comfy_graph.get_node_by_id(edge['from'])

        to_node.add_input(
            edge['to_input'],
            get_type_from_input_name(edge['to_input']),
            link_id,
        )
        from_node.add_output(
            link_id,
            edge['from_output']
        )

        # Create links
        link = ComfyUIWorkflowGraphLink(
            id=link_id,
            from_node_id=edge['from'],
            from_node_output_slot=edge['from_output'],
            to_node_id=edge['to'],
            to_node_input_slot=to_node._get_input_slot_index_from_name(edge['to_input']),
            from_node_output_type=from_node._get_output_type_from_slot_index(edge['from_output'])
        )

        comfy_graph.add_link(link)


    return comfy_graph
