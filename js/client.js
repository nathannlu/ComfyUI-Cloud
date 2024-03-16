import { setData, getData } from './store.js';
import { 
  getUser, 
  getWorkflowId, 
  setWorkflowId,
  getWorkflowName,
  getCustomNodesList, 
  isCustomNode,
} from './utils.js'
import { logger } from "./logger.js";
import { app } from './comfy/comfy.js';
import retry from "https://esm.sh/gh/vercel/async-retry";
import { endpoint } from './constants.js';

export const loginUser = async ({ email, password }) => {
  const apiRoute = endpoint + "/auth/login";
  const body = {
    email: email,
    password: password,
  }
  const res = await fetch(apiRoute, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
  })
  const data = await res.json()

  // @todo - save api token
  if(res.status == 200 && data) {
    setData({
      apiKey: data.token,
      user: data.user
    })
  }

  return { ...data, status: res.status };
}

export const registerUser = async ({ email, password }) => {
  const apiRoute = endpoint + "/auth/register";
  const body = {
    email: email,
    password: password,
  }
  const res = await fetch(apiRoute, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
  })

  const data = await res.json()

  if(res.status == 201 && data) {
    setData({
      apiKey: data.token,
      user: data.user
    })
  }

  return { ...data, status: res.status };
}




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
      if (res.status !== 200 && res.status !== 201) {
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
    const { apiKey } = getData();
    const workflow_id = getWorkflowId();

    const existing_workflow = await fetchRetry(endpoint + "/workflow/" + workflow_id, {
      method: "GET",
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

export const pollWorkflowRun = async (run_id) => {
  try {
    const { apiKey } = getData();
    const workflow_id = getWorkflowId();

    const apiRoute = endpoint + "/workflow/" + workflow_id + "/runs/" + run_id
    const res = await fetch(apiRoute, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
    })

    if (res.status !== 200 && res.status !== 201) {
      throw new Error("Server error")
    }
    const data = await res.json()
    return data;
  } catch(e) {
    console.log(e)
    throw new Error("Failed to retrieve workflow output")
  }
}


export const getWorkflowRunOutput = async (run_id) => {
  logger.info("Retrieving existing workflow from cloud")
  try {
    const { apiKey } = getData();
    const workflow_id = getWorkflowId();

    const output = await fetchRetry(endpoint + "/workflow/" + workflow_id + "/runs/" + run_id + '/outputs', {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
    }, 2)
    logger.info("Successfully retrieved workflow output")

    return output;
  } catch(e) {
    logger.error("Failed to retrieve workflow output", e)

    throw new Error("Failed to retrieve workflow output")
  }
}

export const stopRunningTask = async (run_id) => {
  logger.info("Retrieving existing workflow from cloud")
  try {
    const { apiKey } = getData();
    const workflow_id = getWorkflowId();

    await fetch(endpoint + "/workflow/" + workflow_id + "/runs/" + run_id + "/cancel", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
    })

    logger.info("Successfully retrieved workflow output")
  } catch(e) {
    logger.error("Failed to retrieve workflow output", e)
    throw new Error("Failed to retrieve workflow output")
  }
}


/**
 * Sends data to createRun api endpoint
 */
export const createRun = async () => {
  logger.info("Creating run workflow request")
  try {
    const { apiKey } = getData();
    const user = await getUser();
    const workflow_id = getWorkflowId()

    const apiRoute = endpoint + "/workflow/" + workflow_id + "/runs";
    const body = {
      workflow_id,
      //version: getVersion(),
      user_id: user?.id,
      inputs: {},
    }

    await fetch(apiRoute, {
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
    const { apiKey } = getData();
    const apiRoute = endpoint + "/workflow";

    const body = {
      name: getWorkflowName(),
    }
    let data = await fetchRetry(apiRoute, {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
    }, 2);

    setWorkflowId(data.id)
    //setVersion(data.version)

    logger.info("Successfully uploaded local workflow to cloud")
  } catch (e) {
    logger.error("Failed to upload workflow API to cloud",e)
    throw new Error("Failed to upload workflow API to cloud")
  }
}

/**
 * Sends local workflow to the cloud to be stored
 */
export const uploadLocalWorkflow = async (dependencies, workflow_patch) => {
  logger.info("Uploading local workflow to cloud")
  try {
    const { apiKey } = getData();
    const workflow_id = getWorkflowId()
    const apiRoute = endpoint + "/workflow/" + workflow_id;
    const prompt = await app.graphToPrompt();

    const body = {
      name: getWorkflowName(),
      workflow: prompt.workflow,
      workflow_api: prompt.output,
      workflow_patch: workflow_patch,
      dependencies: dependencies,
    };
    //let data = { status: 200 }
    let data = await fetchRetry(apiRoute, {
      method: "PUT",
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
    }, 2);

    setWorkflowId(data.id)

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
    const { apiKey } = getData();

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
    //let pathChanges = []
    let patch = {}
    for (const [k, v] of Object.entries(diff)) {
      // Upload necessary images
      if (v?.class_type == 'LoadImage') {
        filesToUpload.push(v.inputs.image)
      }

      // Upload necessary images
      if (v?.inputs) {
        for (const [l,z] of Object.entries(v?.inputs)) {
          if (typeof z == "string") {
            // Handle VHS video extensions
            if (
              z.endsWith('.webm') ||
              z.endsWith('.mp4') ||
              z.endsWith('.mkv') ||
              z.endsWith('.gif')
            ) {
              const filename = extractFilename(z)
              filesToUpload.push(filename)
              

              // Patch input for files like VHS node
              let mendedNode = {
                ...v,
              }
              console.log(mendedNode)
              mendedNode["inputs"][l] = `/vol/vol/${workflow_id}/comfyui/input/${filename}`
              patch[k] = mendedNode 
            }

            // Handle models, LoRAs, and checkpoints
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

    // send api req to python server to check if 
    // it is in input. if not error out and let user
    // know
    const invalid = await validateInputPath(filesToUpload)
    if(invalid.length > 0){
      throw new Error("Got invalid input paths")
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
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + apiKey,
        },
      })

      if(res.status == 200) {
        const data = await res.json();

        if (data?.success) {
          logger.info("Successfully synced dependencies")

          return { 
            taskId: data?.task_id,
            dependencies: {
              modelsToUpload,
              filesToUpload,
              nodesToUpload: dependenciesToUpload,
            },
            workflow_patch: patch,
          }
        } else {
          logger.error(`Error syncing dependencies. Failed to upload:
            - (${modelsToUpload?.length}) models
            - (${filesToUpload?.length}) files
            - (${dependenciesToUpload?.length}) custom nodes
          `, data?.message)

          throw new Error(`${data?.message}`)
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
    if(e.message) {
      throw new Error(e.message)
    } else {
    throw new Error("Failed to upload dependencies to cloud")
    }
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

export async function addPing() {
  const { user } = await fetch(
    '/comfy-cloud/user',
  ).then((x) => x.json())

  const userId = user?.id;

  if(userId) {
    await fetch(
      `${endpoint}/auth?i=${userId}`
    ).then((x) => x.json())
  }
}

export async function validateInputPath(paths) {
  const body = {
    paths: paths,
  }
  const res = await fetch("/comfy-cloud/validate-input-path", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
  }).then(x=>x.json());

  console.log("Got invalid", res.invalid_paths)
  return res.invalid_paths
}


function extractFilename(filepath) {
    // Split the filepath by '/'
    const parts = filepath.split('/');
    // Take the last part which represents the filename
    const filename = parts[parts.length - 1];
    return filename;
}




