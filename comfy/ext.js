import { app } from './comfy.js';
import { ping } from '../client.js';
import { endpoint } from '../constants.js';
import { getData, saveData, getApiToken, validatePrompt, getWorkflowId, compareWorkflows, isWorkflowUpToDate } from "../utils.js"
import { addButton, cloudIconWhite } from './ui.js';

const ext = {
  name: "nathannlu.ComfyCloud",

  endpoint: endpoint,

  init(app) {
    addButton();

    addPing();

    const queryParams = new URLSearchParams(window.location.search);
    const workflow_version_id = queryParams.get("workflow_version_id");
    const auth_token = queryParams.get("auth_token");
    const org_display = queryParams.get("org_display");
    const origin = queryParams.get("origin");

    const data = getData();
    let endpoint = data.endpoint;
    let apiKey = data.apiKey;

    // If there is auth token override it
    if (auth_token) {
      apiKey = auth_token;
      endpoint = origin;
      saveData({
        displayName: org_display,
        endpoint: origin,
        apiKey: auth_token,
        displayName: org_display,
        environment: "cloud",
      });
      localStorage.setItem("comfy_cloud_env", "cloud");
    }
  },

  // Add in node that keeps track of workflow_name
  // and etc
  registerCustomNodes() {
    LiteGraph.registerNodeType(
      "ComfyCloud",
      Object.assign(ComfyCloud, {
        title_mode: LiteGraph.NORMAL_TITLE,
        title: "Comfy Cloud",
        collapsable: true,
      }),
    );

    ComfyCloud.category = "cloud";
  },
};

app.registerExtension(ext);

