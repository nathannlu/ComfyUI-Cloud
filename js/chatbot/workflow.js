import { app } from "../comfy/comfy.js";
import { getInputType } from "./edgeTypes.js";

const newSampleInput = {
  nodes: [
    {
      id: 4,
      class_type: "CheckpointLoaderSimple",
      widget_values: { checkpoint: "v1-5-pruned-emaonly.safetensors" },
    },
    {
      id: 5,
      class_type: "EmptyLatentImage",
      widget_values: { width: 512, height: 512, channels: 1 },
    },
    {
      id: 6,
      class_type: "CLIPTextEncode",
      widget_values: {
        text: "beautiful scenery nature glass bottle landscape, , purple galaxy bottle,",
      },
    },
    {
      id: 7,
      class_type: "CLIPTextEncode",
      widget_values: { text: "text, watermark" },
    },
    {
      id: 3,
      class_type: "KSampler",
      widget_values: {
        seed: 156680208700286,
        continuous: true,
        steps: 20,
        denoising: 8,
        scheduler: "euler",
        noise: "normal",
        scale: 1,
      },
    },
    { id: 8, class_type: "VAEDecode" },
    { id: 9, class_type: "SaveImage" },
  ],
  edges: [
    { from: 4, to: 3, from_output: 0, to_input: "model" },
    { from: 5, to: 3, from_output: 0, to_input: "latent_image" },
    { from: 4, to: 6, from_output: 1, to_input: "clip" },
    { from: 6, to: 3, from_output: 0, to_input: "positive" },
    { from: 7, to: 3, from_output: 0, to_input: "negative" },
    { from: 4, to: 7, from_output: 1, to_input: "clip" },
    { from: 3, to: 8, from_output: 0, to_input: "samples" },
    { from: 4, to: 8, from_output: 2, to_input: "vae" },
    { from: 8, to: 9, from_output: 0, to_input: "images" },
  ],
};

function getOutputIndex(node, inputName) {
  return node.outputs.findIndex(
    (output) => output.name === getInputType(inputName)
  );
}

function getInputIndex(node, inputName) {
  return node.inputs.findIndex(
    (input) => input.name === getInputType(inputName)
  );
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

  console.log("baseGraph");
  console.log(baseGraph);

  const xStep = 300; // step for node positions
  const yStep = 300; // step for node positions
  const yBase = 100; // base y position
  const nodesById = {}; // pointer of nodes by id for easier/faster search

  let x = 100; // starting x post
  let y = yBase; // starting y post
  let columnCounter = 0; // counter for columns
  // Create nodes with positions in order
  input.nodes.forEach((node, index) => {
    const newNode = {
      id: node.id,
      type: node.class_type,
      pos: [x, y],
      size: [200, 50], // TODO: write a function to get the node's actual height for better placement
      flags: {},
      order: index,
      mode: 0,
      inputs: [],
      outputs: [],
      properties: {},
      widgets_values: node.widget_values ? Object.values(node.widget_values) : []
    };

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

  console.log("baseGraph after nodes insertion");
  console.log(baseGraph);

  // Insert edges
  input.edges.forEach((edgeData, index) => {
    const fromNode = nodesById[edgeData.from];
    const toNode = nodesById[edgeData.to];

    // Adding output to fromNode
    let outputIndex = getOutputIndex(fromNode, edgeData.to_input);

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

    console.log("toNode");
    console.log(toNode);

    // add outputs by inferring the inputs
    // if output doesnt already exist
    if (outputIndex < 0) {
      fromNode.outputs.push({
        name: getInputType(edgeData.to_input),
        // name: edgeData.input,
        type: getInputType(edgeData.to_input),
        links: [],
        slot_index: fromNode.outputs.length,
      });
    }

    outputIndex = fromNode.outputs.length - 1;
    inputIndex = fromNode.inputs.length - 1;

    console.log("fromNode");
    console.log(fromNode);

    // add links
    const link = [
      index + 1, // Link id
      fromNode.id, // Origin node id
      getOutputIndex(fromNode, edgeData.to_input), // origin index
      toNode.id, // Destination node id
      getInputIndex(toNode, edgeData.to_input), // destination index
      getInputType(edgeData.to_input),
    ];

    console.log("link");
    console.log(link);

    fromNode.outputs[outputIndex].links.push(link[0]);
    baseGraph.links.push(link);
  });

  console.log("baseGraph after edges insertion");
  console.log(baseGraph);

  return baseGraph;
}

export function loadGraphFromPrompt(generatedWorkflow) {
  const translatedData = transformInputToGraph(generatedWorkflow);
  // console.log("Translated Graph Data: ");
  // console.log(translatedData);
  app.loadGraphData(translatedData, true);
  app.graph.change();
}

export function runWorkflowLoader() {
  console.log("Initial graph");
  console.log(app.graph);

  loadGraphFromPrompt(newSampleInput);

  console.log("Graph after change");
  console.log(app.graph);
}
