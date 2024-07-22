from nodes import NODE_CLASS_MAPPINGS

def get_inputs_outputs():
    node_inputs_outputs = {}

    for key in NODE_CLASS_MAPPINGS:
        data = NODE_CLASS_MAPPINGS[key]()
        input_types = data.INPUT_TYPES()
        output_types = data.RETURN_TYPES

        node_inputs_outputs[key] = {
            "input_types": input_types["required"],
            "output_types": output_types
        }

    return node_inputs_outputs

def prepare_input_output_types():
    all_input_output_types = {}
    for key, value in input_output_types.items():
        class_inputs = value["input_types"] 
        class_outputs = value["output_types"]

        for key, value in class_inputs.items():
            arg = key
            typ = value[0]
            all_input_output_types[arg] = typ
    return all_input_output_types

def get_type_from_input_name(input_name):
    return all_input_output_types[input_name]


input_output_types = get_inputs_outputs()
all_input_output_types = prepare_input_output_types()
