import { app } from "../comfy/comfy.js";
import { getInputType } from "./edgeTypes.js";
import { 
  getNodesInputsOutputs
} from '../utils.js'


var nodesInputsOutputs = {};
getNodesInputsOutputs().then((nodes) => {
  nodesInputsOutputs = nodes;
})


function getInputIndex(node, inputName) {
  return node.inputs.findIndex(
    (input) => input.name === getInputType(inputName)
  );
}

function validateObject(objectA, objectB) {
  const validatedObject = {};

  // If it is undefined, just return the default values
  if (!objectB) {
    for (const key in objectA) {
      const defaultValue = objectA[key][1]?.default;
      if (defaultValue !== undefined) {
        validatedObject[key] = defaultValue;
      }
    }

    return validatedObject;
  }

  for (const key in objectA) {
    if (objectB.hasOwnProperty(key)) {
      // Check the type
      const [_t, meta] = objectA[key];
      const defaultValue = meta?.default;
      const type = typeof defaultValue;

      if (typeof objectB[key] === type || type == 'undefined') {
        validatedObject[key] = objectB[key];
      } else {
        validatedObject[key] = defaultValue;
      }
    } else {
      // Use default value if key is missing in ObjectB
      const defaultValue = objectA[key][1]?.default;
      if (defaultValue !== undefined) {
        validatedObject[key] = defaultValue;
      }
    }
  }

  return validatedObject;
}


// translates chatgpt input to immediately loadable graph format
function transformInputToGraph(input) {
  const baseGraph = {
    last_node_id: input.nodes.length,
    last_link_id: input.edges.length,
    nodes: [],
    links: [],
    groups: [],
    config: {},
    extra: {},
    version: 0.4,
  };

  const xStep = 500; // step for node positions
  const yStep = 500; // step for node positions
  const yBase = 100; // base y position
  const nodesById = {}; // pointer of nodes by id for easier/faster search

  let x = 100; // starting x post
  let y = yBase; // starting y post
  let columnCounter = 0; // counter for columns

  // Create nodes with positions in order
  input.nodes.forEach((node, index) => {

    // Calculate node size
    const registeredNodeType = LiteGraph.registered_node_types[node.class_type];

    // TODO: [width, height]
    const nodeSize = registeredNodeType.prototype.computeSize()

    const newNode = {
      id: node.id,
      type: node.class_type,
      pos: [x, y],
      flags: {},
      order: index,
      mode: 0,
      inputs: [],
      outputs: [],
      properties: {},
      widgets_values: node.widget_values ? Object.values(node.widget_values) : []
    };

    // Validate inputs
    const inputTypes = nodesInputsOutputs[node.class_type].input_types;

    // check if it has node.class_type
    if (!LiteGraph.registered_node_types[node.class_type]) {
      console.error(`Node type ${node.class_type} not found`);
      return;
    }

    // TODO: validated input/output
    const widget_values = validateObject(inputTypes, node.widget_values);

    baseGraph.nodes.push(newNode);
    nodesById[node.id] = newNode;

    if (columnCounter % 3 === 0) {
      x += xStep;
      y = yBase;
    } else {
      // y += newNode.size[1] + yStep;
      y += yStep;
    }
    columnCounter++;
  });

  // Insert edges
  input.edges.forEach((edgeData, index) => {
    const fromNode = nodesById[edgeData.from];
    const toNode = nodesById[edgeData.to];

    // Adding output to fromNode
    let outputIndex = edgeData.from_output;
    // add inputs
    let inputIndex = getInputIndex(toNode, edgeData.to_input);

    // if input doesnt already exist
    if (inputIndex < 0) {
      toNode.inputs.push({
        name: edgeData.to_input,
        type: getInputType(edgeData.to_input),
        link: index + 1,
      });
    }

    // add outputs
    fromNode.outputs.push({
      name: getInputType(edgeData.to_input),
      // name: edgeData.input,
      type: getInputType(edgeData.to_input),
      links: [],
      slot_index: fromNode.outputs.length,
    });


    outputIndex = fromNode.outputs.length - 1;
    inputIndex = fromNode.inputs.length - 1;

    // add links
    const link = [
      index + 1, // Link id
      fromNode.id, // Origin node id
      edgeData.from_output,
      // getOutputIndex(fromNode, edgeData.to_input), // origin index
      toNode.id, // Destination node id
      getInputIndex(toNode, edgeData.to_input), // destination index
      getInputType(edgeData.to_input),
    ];

    fromNode.outputs[outputIndex].links.push(link[0]);
    baseGraph.links.push(link);
  });


  return baseGraph;
}

export function loadGraphFromPrompt(generatedWorkflow) {
  const translatedData = transformInputToGraph(generatedWorkflow);
  app.loadGraphData(translatedData, true);
  app.graph.change();
}
