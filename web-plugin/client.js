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

import retry from "https://esm.sh/gh/vercel/async-retry";

const fetchRetry = async (url, options = {}, retries) => {
  await retry(
    async bail => {
      const res = await fetch(url, options);
      if (res.status !== 200) {
        bail(new Error("Server error"));
        return;
      }

      return res.json()
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
  try {
    const { endpoint, apiKey } = getData();
    const workflow_id = getWorkflowId();
    console.log('got id',workflow_id)
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

    return existing_workflow;
  } catch(e) {
    console.log(e)
    throw new Error("Failed to retrieve workflow from cloud. Please try again")
  }
}

/**
 * Sends data to createRun api endpoint
 */
export const createRun = async () => {
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
  } catch(e) {
    throw new Error("Failed to create run request in the backend")
  }
}

/**
 * Sends local workflow to the cloud to be stored
 */
export const uploadLocalWorkflow = async () => {
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
  } catch (e) {
    // @todo
    // Handle potential reasons:
    // - user has no network connection
    // - user auth token expired
    // - server not responsive
    console.log(e)
    throw new Error("Failed to upload workflow API to cloud")
  }
}

export const syncDependencies = async (diff) => {
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
              //console.log("Upload", z, nodeMappings[v.class_type])
              modelsToUpload.push(z);
            }
          }
        }
      }

      // Only upload dependencies that change
      if(!isCustomNode(v?.class_type)) {
        // search for class_type in custom_nodes_list
        const customNodesList = await getCustomNodesList()
        console.log(customNodesList)
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
      console.log(res)
      if(res.status == 200) {
        return {
          modelsToUpload,
          filesToUpload,
          nodesToUpload: dependenciesToUpload,
        }
      } else {
        throw new Error("Failed to upload dependencies to cloud")
      }
    }
  } catch (e) {
    console.log(e)
    // Potential reason for failure here can be modal
    // servers are unresponsive
    throw new Error("Failed to upload dependencies to cloud")
  }
}

export const buildVenv = async () => {
  try {
    const workflow_id = getWorkflowId()
    const url = "https://nathannlu--test-workflow-fastapi-app.modal.run/create"
    const body = {
      workflow_id,
    }
    return await fetchRetry(url, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }, 2)
  } catch(e) {
    // Potential reason for failure here can be modal
    // servers are unresponsive
    throw new Error("Failed to build env in cloud")
  }
}

export const buildVenvPartial = async (custom_nodes) => {
  try {
    const workflow_id = getWorkflowId()
    const url = "https://nathannlu--test-workflow-fastapi-app.modal.run/create-partial"
    const body = {
      workflow_id,
      custom_nodes
    }
    return await fetchRetry(url, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }, 2)
  } catch(e) {
    // Potential reason for failure here can be modal
    // servers are unresponsive
    throw new Error("Failed to update env in cloud")
  }
}


