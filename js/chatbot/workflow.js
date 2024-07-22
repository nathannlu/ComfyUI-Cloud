import { app } from "../comfy/comfy.js";

function positionNodes(nodes) {
  const xStep = 500; // step for node positions
  const yStep = 500; // step for node positions
  const yBase = 100; // base y position
  const nodesById = {}; // pointer of nodes by id for easier/faster search

  let x = 100; // starting x post
  let y = yBase; // starting y post
  let columnCounter = 0; // counter for columns


  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];

    // Calculate node size
    // check if it has node.class_type
    /*
    if (!LiteGraph.registered_node_types[node.type]) {
      console.error(`Node type ${node.type} not found`);
      return;
    }
    const registeredNodeType = LiteGraph.registered_node_types[node.class_type];
    const nodeSize = registeredNodeType.prototype.computeSize() // [width, height]
    */

    node.pos.push(x)
    node.pos.push(y)

    if (columnCounter % 3 === 0) {
      x += xStep;
      y = yBase;
    } else {
      // y += newNode.size[1] + yStep;
      y += yStep;
    }
    columnCounter++;
  }
}

export function loadGraphFromPrompt(generatedWorkflow) {
  const translatedData = generatedWorkflow;
  positionNodes(translatedData.nodes);
  app.loadGraphData(translatedData, true);
  app.graph.change();
}

export function isValidWorkflow(workflow) {
  return workflow && workflow.nodes && workflow.edges;
}
