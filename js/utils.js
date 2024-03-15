import _ from 'https://cdn.jsdelivr.net/npm/@esm-bundle/lodash@4.17.21/+esm'
import { app } from './comfy/comfy.js';
import { inputDialog } from './comfy/ui.js';
import { getData } from './store.js';

/**
 * HELPERS
 *
 * File for helper functions, local network api's
 */

export function formatTimestamp(timestamp) {
  const date = new Date(timestamp);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

export function formatDuration(seconds) {
  if (seconds < 60) {
    return seconds.toFixed(2) + " seconds";
  } else if (seconds < 3600) {
    return (seconds / 60).toFixed(2) + " minutes";
  } else {
    return (seconds / 3600).toFixed(2) + " hours";
  }
}


export function generateUUID() {
  let uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
  return uuid;
}


export const createMetaNode = async () => {
  const text = await inputDialog.input(
    "Create your deployment",
    "Workflow name",
  );
  if (!text) throw new Error("Node not created");
  app.graph.beforeChange();

  var node = LiteGraph.createNode("ComfyCloud");

  node.configure({
    widgets_values: [text],
    properties: {
      workflow_name: text,
    }
  });
  node.pos = [0, 0];

  app.graph.add(node);
  app.graph.afterChange();
}

export const getUser = async () => {
  const { user } = await fetch(
    '/comfy-cloud/user',
  ).then((x) => x.json())

  const userId = user?.id;
  console.log("got user id", userId, user)
  return user;
}

export const getApiToken = () => {
  const { apiKey } = getData();
  return apiKey;
}

export const getWorkflowName = () => {
  let deployMeta = app.graph.findNodesByType("ComfyCloud");
  const deployMetaNode = deployMeta[0];
  // @todo 
  // handle no deployMetaNode

  const { workflow_name } = deployMetaNode.properties;
  //const name = deployMetaNode.widgets[0].value;
  return workflow_name;
}
export const getWorkflowId = () => {
  let deployMeta = app.graph.findNodesByType("ComfyCloud");
  const deployMetaNode = deployMeta[0];

  // @todo 
  // handle no deployMetaNode

  const { workflow_id } = deployMetaNode.properties;
  //const workflow_id = deployMetaNode.widgets[1].value;
  return workflow_id;
}
export const getVersion = () => {
  let deployMeta = app.graph.findNodesByType("ComfyCloud");
  const deployMetaNode = deployMeta[0];
  // @todo 
  // handle no deployMetaNode

  const { version } = deployMetaNode.properties;
  //const version = deployMetaNode.widgets[2].value;
  return version;
}

export const setWorkflowId = (id) => {
  let deployMeta = app.graph.findNodesByType("ComfyCloud");
  const deployMetaNode = deployMeta[0];
  // @todo 
  // handle no deployMetaNode
  //deployMetaNode.widgets[1].value = version;
  deployMetaNode.properties.workflow_id = id;
}
export const setVersion = (version) => {
  let deployMeta = app.graph.findNodesByType("ComfyCloud");
  const deployMetaNode = deployMeta[0];
  // @todo 
  // handle no deployMetaNode
  //deployMetaNode.widgets[2].value = version;
  deployMetaNode.properties.version = version;
}

export const isCustomNode = (class_type) => {
  const defaultCustomNodes = ["KSampler","KSamplerAdvanced","CheckpointLoader","CheckpointLoaderSimple","VAELoader","LoraLoader","CLIPLoader","ControlNetLoader","DiffControlNetLoader","StyleModelLoader","CLIPVisionLoader","UpscaleModelLoader","CLIPVisionEncode","StyleModelApply","CLIPTextEncode","CLIPSetLastLayer","ConditioningCombine","ConditioningAverage ","ConditioningConcat","ConditioningSetArea","ConditioningSetAreaPercentage","ConditioningSetMask","ControlNetApply","ControlNetApplyAdvanced","VAEEncodeForInpaint","SetLatentNoiseMask","VAEDecode","VAEEncode","LatentRotate","LatentFlip","LatentCrop","EmptyLatentImage","LatentUpscale","LatentUpscaleBy","LatentComposite","LatentBlend","LatentFromBatch","RepeatLatentBatch","SaveImage","PreviewImage","LoadImage","LoadImageMask","ImageScale","ImageScaleBy","ImageUpscaleWithModel","ImageInvert","ImagePadForOutpaint","ImageBatch","VAEDecodeTiled","VAEEncodeTiled"]

  if (defaultCustomNodes.indexOf(class_type) !== -1) {
    return true
  } else {
    return false;
  }
}

export const getCustomNodesList = async () => {
  const custom_nodes_list = await fetch("/comfy-cloud/custom-nodes-list", {
    method: "get",
  }).then((x) => x.json())

  return custom_nodes_list.custom_nodes
}


// Exec
// returns new changes
export const compareWorkflows = (local, cloud) => {
  const changes = _.differenceWith(_.toPairs(local), _.toPairs(cloud), _.isEqual)
  //const changes = _.difference(_.toPairs(cloud), _.toPairs(local), _.isEqual)

  const diff = changes.reduce((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {});

  //console.log(local, cloud, diff)
  return diff
}

export async function validatePrompt(workflow_api) {
  app.lastNodeErrors = null;

  const body = {
    workflow_api,
  }

  const data = await fetch("/comfy-cloud/validate-prompt", {
    method: "POST",
    body: JSON.stringify(body),
  }).then((x) => x.json())

  app.lastNodeErrors = data.node_errors;

  if (data.node_errors.length > 0) {
    app.canvas.draw(true, true);
  }

  if(data.is_valid){
    return true;
  } else {
    return false;
  }
}

export function extractAfterInput(inputString) {
  // Check if the string contains 'input'
  if (inputString.includes('input')) {
    // Find the index of 'input/'
    const index = inputString.indexOf('input/');
    
    // Check if 'input/' is found
    if (index !== -1) {
      // Return the substring after 'input/'
      return inputString.substring(index + 'input/'.length);
    } else {
      throw new Error("Path is not in input folder")

    }
  }

  // Return null if 'input' is not found or 'input/' is not found
  return null;
}


export const isWorkflowUpToDate = diffDeps => _.isEmpty(diffDeps);
