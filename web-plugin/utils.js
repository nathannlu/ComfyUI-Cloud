import _ from 'https://cdn.jsdelivr.net/npm/@esm-bundle/lodash@4.17.21/+esm'

/**
 * HELPERS
 *
 * File for helper functions, local network api's
 */

const endpoint = "https://comfycloud.vercel.app"
/**
 * Retrieves deployment data from local storage or defaults.
 * @param {string} [environment] - The environment to get the data for.
 * @returns {{endpoint: string, apiKey: string, displayName: string, environment?: string}} The deployment data.
 */
export function getData(environment) {
  const deployOption = 'cloud';
  const data = localStorage.getItem("comfy_cloud_env_data_" + deployOption);

  if (!data) {
    return {
      endpoint: endpoint,
      apiKey: "",
    };
  }
  return {
    ...JSON.parse(data),
    endpoint: endpoint,
    environment: deployOption,
  };
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
  let deployMeta = graph.findNodesByType("ComfyCloud");
  const deployMetaNode = deployMeta[0];
  // @todo 
  // handle no deployMetaNode

  const name = deployMetaNode.widgets[0].value;
  return name;
}
export const getWorkflowId = () => {
  let deployMeta = graph.findNodesByType("ComfyCloud");
  const deployMetaNode = deployMeta[0];
  // @todo 
  // handle no deployMetaNode

  const workflow_id = deployMetaNode.widgets[1].value;
  return workflow_id;
}
export const getVersion = () => {
  let deployMeta = graph.findNodesByType("ComfyCloud");
  const deployMetaNode = deployMeta[0];
  // @todo 
  // handle no deployMetaNode

  const version = deployMetaNode.widgets[2].value;
  return version;
}

export const setWorkflowId = (id) => {
  let deployMeta = graph.findNodesByType("ComfyCloud");
  const deployMetaNode = deployMeta[0];
  // @todo 
  // handle no deployMetaNode
  deployMetaNode.widgets[1].value = id;
}
export const setVersion = (version) => {
  let deployMeta = graph.findNodesByType("ComfyCloud");
  const deployMetaNode = deployMeta[0];
  // @todo 
  // handle no deployMetaNode
  deployMetaNode.widgets[2].value = version;
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

export const isWorkflowUpToDate = diffDeps => _.isEmpty(diffDeps);
