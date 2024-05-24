import { 
  getWorkflowId,
  getCustomNodesList, 
  isCustomNode,
} from '../utils.js'
import { local } from '../resource/index.js';

const isVideoExtension = z => z.endsWith('.webm') ||
                              z.endsWith('.mp4') ||
                              z.endsWith('.mkv') ||
                              z.endsWith('.gif')
const isModelExtension = z => z.endsWith('.safetensors') ||
                              z.endsWith('.pth') ||
                              z.endsWith('.pt') ||
                              z.endsWith('.bin') ||
                              z.endsWith('.ckpt') ||
                              z.endsWith('.onnx')

const isDirectory = async (path) => {
  const { exists } = await local.validatePathDirectory({ 
    path
  })
  return exists;
}


// Loops over different nodes, and
// finds paths that ends in 
// - model formats: .ckpt, .safetensor, etc
// - images: .png, jpeg, etc
// - videos (for vhs): .mp4, etc
export const resolveDependencies = async (diff) => {
  const workflow_id = getWorkflowId()
  let modelsToUpload = []
  let dependenciesToUpload = []
  let filesToUpload = []
  let patch = {}

  if(!diff) {
    return {
      dependencies: {
        modelsToUpload,
        filesToUpload,
        nodesToUpload: dependenciesToUpload,
      },
      patch,
    }
  }

  // Find items that end with tf paths
  // comfyui supported model extensions = set(['.ckpt', '.pt', '.bin', '.pth', '.safetensors'])
  //
  // Note:
  // - this will cause an error if in the prompt user types
  //   in .safetensors
  for (const [k, v] of Object.entries(diff)) {

    // Edge case - upload images
    if (v?.class_type == 'LoadImage') {
      filesToUpload.push(v.inputs.image)
    }

    // PART 1 - Handle models (LoRAs, checkpoints, etc) & VHS files 
    // --
    // Loop through every value in [class_type][inputs] and
    // check if it contains a file extension
    if (v?.inputs) {
      for (const [l,z] of Object.entries(v?.inputs)) {

        const isInputValuePotentialPath = typeof z == "string"
        if (isInputValuePotentialPath) {

          // Handle VHS video extensions
          if (isVideoExtension(z) || await isDirectory(z)) {
            const filename = extractFilename(z)
            filesToUpload.push(filename)
            
            // Patch input for files like VHS node
            let mendedNode = {
              ...v,
            }
            mendedNode["inputs"][l] = `/vol/vol/${workflow_id}/comfyui/input/${filename}`
            patch[k] = mendedNode 
          }

          // Handle models, LoRAs, and checkpoints
          if (isModelExtension(z)) {
            modelsToUpload.push(z);
          }
        }
      }
    }

    // PART 2 - Handle custom nodes
    // --
    // Filter out Comfy nodes and custom nodes
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

  // Send api req to python server to check if 
  // it is in the /input folder. 
  // Right now we only can upload files that is inside
  // ComfyUI's /input folder.
  const { invalid_paths } = await local.validatePaths({ 
    paths: filesToUpload
  })
  if(invalid_paths.length > 0){
    throw new Error("Make sure the following file/folder names are inside your ComfyUI /input folder: " + invalid_paths.join(", "))
  }

  return {
    dependencies: {
      modelsToUpload,
      filesToUpload,
      nodesToUpload: dependenciesToUpload,
    },
    patch,
  }
}


export const pollSyncDependenciesStatus = {
  STARTED: 'Started',
  COMPLETED: 'Completed',
  HASHING: 'Hashing',
  UPLOADING: 'Uploading',
  ERROR: 'Failed',
}
export const pollSyncDependencies = async (taskId) => {
  let status = '';
  let statusMessage = '';
  while (status !== pollSyncDependenciesStatus.COMPLETED && status !== pollSyncDependenciesStatus.ERROR) {
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second before the next poll

    try {
      const statusData = await local.pollUploadStatus(taskId) //await fetch(`/comfy-cloud/upload-status/${taskId}`);
      status = statusData.status;
      statusMessage = statusData.message;

    } catch(e) {
      statusMessage = e?.message;
      console.error("Poll dependencies error:", e)
    }
  }

  if (status == pollSyncDependenciesStatus.ERROR) {
    throw new Error(statusMessage || "Failed to upload")
  }
}


function extractFilename(filepath) {
  let _filepath = filepath;
  const isDirectory = filepath.endsWith('/')
  if (isDirectory) {
    // remove the extra slash at the end
    _filepath = filepath.slice(0, -1);
  }

  // Split the filepath by '/'
  const parts = _filepath.split('/');
  // Take the last part which represents the filename
  const filename = parts[parts.length - 1];
  return filename;
}


