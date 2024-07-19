import { app } from "../comfy/comfy.js";
import { getInputType } from "./edgeTypes.js";

const input = {
  nodes: [
    { id: 4, class_type: "CheckpointLoaderSimple" },
    { id: 6, class_type: "CLIPTextEncode" },
    { id: 7, class_type: "CLIPTextEncode" },
    { id: 5, class_type: "EmptyLatentImage" },
    { id: 3, class_type: "KSampler" },
    { id: 8, class_type: "VAEDecode" },
    { id: 9, class_type: "SaveImage" },
  ],
  edges: [
    { from: 4, to: 3, input: "model" },
    { from: 5, to: 3, input: "latent_image" },
    { from: 4, to: 6, input: "clip" },
    { from: 6, to: 3, input: "positive" },
    { from: 4, to: 7, input: "clip" },
    { from: 7, to: 3, input: "negative" },
    { from: 3, to: 8, input: "samples" },
    { from: 4, to: 8, input: "vae" },
    { from: 8, to: 9, input: "images" },
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

// TODO: WIP
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
      widgets_values: [], // TODO: look into how widgets work
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
    let outputIndex = getOutputIndex(fromNode, edgeData.input);

    // add inputs
    let inputIndex = getInputIndex(toNode, edgeData.input);

    // if input doesnt already exist
    if (inputIndex < 0) {
      toNode.inputs.push({
        name: edgeData.input,
        type: getInputType(edgeData.input),
        link: index + 1,
      });
    }

    console.log("toNode");
    console.log(toNode);

    // add outputs by inferring the inputs
    // if output doesnt already exist
    if (outputIndex < 0) {
      fromNode.outputs.push({
        name: getInputType(edgeData.input),
        // name: edgeData.input,
        type: getInputType(edgeData.input),
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
      getOutputIndex(fromNode, edgeData.input), // origin index
      toNode.id, // Destination node id
      getInputIndex(toNode, edgeData.input), // destination index
      getInputType(edgeData.input),
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

// const node = LiteGraph.createNode("LoadImage");
// graph.add(node);

// input: chat gpt's generated workflow
function addNodesAndEdges(graph, input) {
  const translatedData = transformInputToGraph(input);
  console.log("Translated Graph Data: ");
  console.log(translatedData);
  app.loadGraphData(translatedData, true);

  // OUTDATED MANUAL INSERTION METHOD
  //   const n = input.nodes;
  // const missingNodeTypes = [];
  // const nodesById = {};

  // TODO: register nodes. e.g. LiteGraph.registered_node_types["LoadImage"] = LoadImageNode;

  // code block from loadGraphData to find unregistered nodes
  // if (!(n.type in LiteGraph.registered_node_types)) {
  // 	missingNodeTypes.push(n.type);
  // 	// n.type = sanitizeNodeName(n.type);
  // }

  // insert the nodes one by one. This code is working
  //   n.forEach((nodeData) => {
  //     const node = LiteGraph.createNode(nodeData.class_type);
  //     node.id = nodeData.id;
  //     node.pos = nodeData.pos || [100, 100]; // Default position. TODO: add increment for position
  //     graph.add(node);
  //     // nodesById[nodeData.id] = node;
  //   });

  // TODO: add input edges

  // TODO: add output edges

  // TODO: without manually adding the edges, try to get input data into defaultGraph's format
  // app.loadGraphData(defaultGraph, true)
}

export function runWorkflowLoader() {
  console.log("Initial graph");
  console.log(app.graph);

  //   app.graph.clear(); // clear graph
  addNodesAndEdges(app.graph, input);

  app.graph.change();
  console.log("Graph after change");
  console.log(app.graph);
}
