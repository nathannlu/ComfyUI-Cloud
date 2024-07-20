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
  },
};

const workflow = {
  // upload local
  init: {
    method: "POST",
    path: "/workflow/init",
  },
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
  },
  error: {
    method: "POST",
    path: "/workflow/error",
  },
};

const billing = {
  retrieveCustomerSession: {
    method: "GET",
    path: "/stripe/get-customer-session",
  },
  retrieveUsage: {
    method: "GET",
    path: "/stripe/usage",
  },
  retrieveCredits: {
    method: "GET",
    path: "/stripe/credits",
  },
};

const auth = {
  register: {
    method: "POST",
    path: "/auth/register",
  },
  login: {
    method: "POST",
    path: "/auth/login",
  },
};

const support = {
  feedback: {
    method: "POST",
    path: "/support/feedback",
  },
  support: {
    method: "POST",
    path: "/support/support",
  },
  docs: {
    method: "POST",
    path: "/support/docs",
  },
  tooltipHover: {
    method: "POST",
    path: "/support/tooltipHover",
  },
  tooltipDocs: {
    method: "POST",
    path: "/support/tooltipDocs",
  },
  assistant: {
    method: "POST",
    path: "/support/assistant",
  },
};

const chatbot = {
  sendMessage: {
    method: "POST",
    path: "/chat/send-message",
  },
};

export const apiEndpoints = {
  workflowRun,
  workflow,
  billing,
  auth,
  support,
  chatbot
};
