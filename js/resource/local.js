// Local endpoints
// Usage:
/*
local.uploadDependencies({
  workflow_id: "",
  endpoint: "",
  modelsToUpload: [],
  filesToUpload: [],
  nodesToUpload: [],
})
*/


const local = {

  // Usage: local.pollUploadStatus("task_id")
  pollUploadStatus: {
    method: "GET",
    path: "/comfy-cloud/upload-status/{task_id}",
  },

  /**
   * Accepts:
   * - workflow_id
   * - endpoint
   * - modelsToUpload
   * - filesToUpload
   * - nodesToUpload
   */
  uploadDependencies: {
    method: "POST",
    path: "/comfy-cloud/upload",
  },

  validatePaths: {
    method: "POST",
    path: "/comfy-cloud/validate-input-path"
  },

  validatePathDirectory: {
    method: "POST",
    path: "/comfy-cloud/validate-path"
  }
}

export const localEndpoints = {
  local
}




