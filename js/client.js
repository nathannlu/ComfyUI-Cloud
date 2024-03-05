import { 
  getData, 
  getUser, 
  getWorkflowId, 
  getVersion, 
  setWorkflowId,
  setVersion,
  getWorkflowName,
  getCustomNodesList, 
  isCustomNode,
} from './utils.js'
import { logger } from "./logger.js";
import retry from "https://esm.sh/gh/vercel/async-retry";

/**
 * Calls endpoints from ComfyCloud API
 *
 *
 */

const fetchRetry = async (url, options = {}, retries) => {
  return await retry(
    async bail => {
      logger.info("fetchRetry: sending request...")
      const res = await fetch(url, options);
      if (res.status !== 200) {
        bail(new Error("Server error"));
        return;
      }

      return await res.json()
    },
    {
      retries
    }
  )
}

/**
 * Returns the workflow stored in cloud DB
 */
export const getCloudWorkflow = async () => {
  logger.info("Retrieving existing workflow from cloud")
  try {
    const { endpoint, apiKey } = getData();
    const workflow_id = getWorkflowId();

    const body = {
      version: parseInt(getVersion()),
    }
    const existing_workflow = await fetchRetry(endpoint + "/api/workflow/" + workflow_id, {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
    }, 2)

    logger.info("Successfully retrieved workflow")

    return existing_workflow;
  } catch(e) {
    logger.error("Failed to retrieve workflow from cloud", e)

    throw new Error("Failed to retrieve workflow from cloud. Please try again")
  }
}

/**
 * Sends data to createRun api endpoint
 */
export const createRun = async () => {
  logger.info("Creating run workflow request")
  try {
    const { endpoint, apiKey } = getData();
    const user = await getUser();

    const apiRoute = endpoint + "/api/run";
    const body = {
      workflow_id: getWorkflowId(),
      version: getVersion(),
      user_id: user?.id,
      inputs: {},
    }
    let data = await fetch(apiRoute, {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
    })
    logger.info("Successfully created run workflow request")
  } catch(e) {
    logger.error("Failed to create run request in the backend", e)
    throw new Error("Failed to create run request in the backend")
  }
}

/**
 * Sends local workflow to the cloud to be stored
 */
export const createEmptyWorkflow = async () => {
  logger.info("Uploading local workflow to cloud")
  try {
    const { endpoint, apiKey } = getData();
    const apiRoute = endpoint + "/api/workflow";
    const prompt = await app.graphToPrompt();

    const body = {
      workflow_name: getWorkflowName(),
      workflow_id: getWorkflowId(),
      workflow: {},
      workflow_api: {},
      snapshot: {
        comfyui: "",
        git_custom_nodes: {},
        file_custom_nodes: [],
      },
    };
    //let data = { status: 200 }
    let data = await fetchRetry(apiRoute, {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
    }, 2);

    setWorkflowId(data.workflow_id)
    setVersion(data.version)

    logger.info("Successfully uploaded local workflow to cloud")
  } catch (e) {
    // @todo
    // Handle potential reasons:
    // - user has no network connection
    // - user auth token expired
    // - server not responsive
    logger.error("Failed to upload workflow API to cloud",e)
    throw new Error("Failed to upload workflow API to cloud")
  }
}

/**
 * Sends local workflow to the cloud to be stored
 */
export const uploadLocalWorkflow = async () => {
  logger.info("Uploading local workflow to cloud")
  try {
    const { endpoint, apiKey } = getData();
    const apiRoute = endpoint + "/api/workflow";
    const prompt = await app.graphToPrompt();

    const body = {
      workflow_name: getWorkflowName(),
      workflow_id: getWorkflowId(),
      workflow: prompt.workflow,
      workflow_api: prompt.output,
      snapshot: {
        comfyui: "",
        git_custom_nodes: {},
        file_custom_nodes: [],
      },
    };
    //let data = { status: 200 }
    let data = await fetchRetry(apiRoute, {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
    }, 2);

    setWorkflowId(data.workflow_id)
    setVersion(data.version)

    logger.info("Successfully uploaded local workflow to cloud")
  } catch (e) {
    // @todo
    // Handle potential reasons:
    // - user has no network connection
    // - user auth token expired
    // - server not responsive
    logger.error("Failed to upload workflow API to cloud",e)
    throw new Error("Failed to upload workflow API to cloud")
  }
}

export const syncDependencies = async (diff) => {
  logger.info("Syncing dependencies")
  try {
    // update with new workflow
    const workflow_id = getWorkflowId()
    const { endpoint } = getData();

    if(!diff) {
      return {}
    }

    // Find items that end with tf paths
    // comfyui supported model extensions = set(['.ckpt', '.pt', '.bin', '.pth', '.safetensors'])
    //
    // Note:
    // - this will cause an error if in the prompt user types
    //   in .safetensors
    let modelsToUpload = []
    let dependenciesToUpload = []
    let filesToUpload = []
    for (const v of Object.values(diff)) {
      // Upload necessary images
      if (v?.class_type == 'LoadImage') {
        filesToUpload.push(v.inputs.image)
      }

      // Upload necessary images
      if (v?.inputs) {
        for (const z of Object.values(v?.inputs)) {
          if (typeof z == "string") {
            if (
              z.endsWith('.safetensors') ||
              z.endsWith('.pth') ||
              z.endsWith('.pt') ||
              z.endsWith('.bin') ||
              z.endsWith('.ckpt')
            ) {
              // @todo - find classtype in node mappings, resolve node and find folder
              modelsToUpload.push(z);
            }
          }
        }
      }

      // Only upload dependencies that change
      if(!isCustomNode(v?.class_type)) {
        // search for class_type in custom_nodes_list
        const customNodesList = await getCustomNodesList()
        for (let name in customNodesList) {
          if(customNodesList[name].indexOf(v?.class_type) !== -1) {
            // found in current custom_node
            dependenciesToUpload.push(name)
          }
        }
      }
    }

    if(filesToUpload.length > 0 || modelsToUpload.length > 0 || dependenciesToUpload.length > 0) {
      const body = {
        workflow_id,
        modelsToUpload,
        filesToUpload,
        nodesToUpload: dependenciesToUpload,
        endpoint
      }
      const res = await fetch("/comfy-cloud/upload", {
        method: "POST",
        body: JSON.stringify(body),
      })

      if(res.status == 200) {
        const data = await res.json();

        logger.info("Successfully synced dependencies")
        return {
          taskId: data?.task_id,
          modelsToUpload,
          filesToUpload,
          nodesToUpload: dependenciesToUpload,
        }
      } else {
        const data = await res.json();
        logger.error(`Error syncing dependencies. Failed to upload:
          - (${modelsToUpload?.length}) models
          - (${filesToUpload?.length}) files
          - (${dependenciesToUpload?.length}) custom nodes
        `, data?.message)

        throw new Error(`${data?.message}`)
      }
    }
  } catch (e) {
    // Potential reason for failure here can be modal
    // servers are unresponsive
    logger.error("Error syncing dependencies", e)
    throw new Error("Failed to upload dependencies to cloud")
  }
}

export const pollSyncDependencies = async (taskId) => {
  let status = '';
  while (status !== 'Task completed' && status !== 'Task failed') {
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second before the next poll

    try {
      const statusResponse = await fetch(`/comfy-cloud/upload-status/${taskId}`);
      const statusData = await statusResponse.json();
      status = statusData.status;

      logger.info(`Received from polling for upload status: ${status}`);
    } catch(e) {
      logger.error("fetch error when polling for upload status", e)
    }

  }

  if (status == "Task failed") {
    throw new Error("Failed to upload")
  }
}

/*
export const buildVenv = async () => {
  logger.info("Starting build venv")
  try {
    const workflow_id = getWorkflowId()
    const url = "https://nathannlu--test-workflow-fastapi-app.modal.run/create"
    const body = {
      workflow_id,
    }
    const res = await fetchRetry(url, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }, 2)

    logger.info("Successfully built venv")

    return res;
  } catch(e) {

    logger.error("Failed to build env in cloud", e)
    throw new Error("Failed to build env in cloud")
  }
}
*/

export const buildVenv = async (custom_nodes) => {
  logger.info("Starting build venv")
  try {
    const workflow_id = getWorkflowId()
    const url = "https://nathannlu--test-workflow-fastapi-app.modal.run/create"
    const body = {
      workflow_id,
      custom_nodes
    }
    const res = await fetchRetry(url, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }, 2)
    logger.info("Successfully built venv")
    return res;
  } catch(e) {

    logger.error("Failed to build env in cloud", e)
    throw new Error("Failed to update env in cloud")
  }
}



