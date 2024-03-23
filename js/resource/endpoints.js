/**
 * API endpoints
 */
const workflowRun = {
  create: {
    method: "POST",
    path: "/workflow/{workflow_id}/runs",
  },
  cancel: {
    method: "POST",
    path: "/workflow/{workflow_id}/runs/{run_id}/cancel",
  },
  pollRun: {
    method: "GET",
    path: "/workflow/{workflow_id}/runs/{run_id}",
  },
  retrieveOutput: {
    method: "GET",
    path: "/workflow/{workflow_id}/runs/{run_id}/outputs",
  }
}

const workflow = {
  // upload local
  create: {
    method: "POST",
    path: "/workflow",
  },
  update: {
    method: "PUT",
    path: "/workflow/{workflow_id}",
  },
  retrieve: {
    method: "GET",
    path: "/workflow/{workflow_id}",
  }
}

export const apiEndpoints = {
  workflowRun,
  workflow,
}
