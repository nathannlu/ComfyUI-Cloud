import { app } from "./app.js";
import { api } from "./api.js";
import { ComfyWidgets, LGraphNode } from "./widgets.js";

import { getData, saveData, getApiToken, validatePrompt, getWorkflowId, compareWorkflows, isWorkflowUpToDate } from "./utils.js"
import { addButton } from './ui.js';
import { endpoint } from './constants.js';


/** @type {LGraphNode}*/
class ComfyCloud {
  color = LGraphCanvas.node_colors.blue.color;
  bgcolor = LGraphCanvas.node_colors.blue.bgcolor;
  groupcolor = LGraphCanvas.node_colors.blue.groupcolor;
  constructor() {
    if (!this.properties) {
      this.properties = {};
      this.properties.workflow_name = "";
      this.properties.workflow_id = "";
      this.properties.version = "";
    }

    ComfyWidgets.STRING(
      this,
      "workflow_name",
      ["", { default: this.properties.workflow_name, multiline: false }],
      app,
    );

    ComfyWidgets.STRING(
      this,
      "workflow_id",
      ["", { default: this.properties.workflow_id, multiline: false }],
      app,
    );

    ComfyWidgets.STRING(
      this,
      "version",
      ["", { default: this.properties.version, multiline: false }],
      app,
    );

    this.widgets_start_y = 10;
    this.setSize(this.computeSize());

    this.serialize_widgets = true;
    this.isVirtualNode = true;
  }
}

/** @typedef {import('../../../web/types/comfy.js').ComfyExtension} ComfyExtension*/
/** @type {ComfyExtension} */
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

  async setup() {
    // const graphCanvas = document.getElementById("graph-canvas");

    window.addEventListener("message", (event) => {
      if (!event.data.flow || Object.entries(event.data.flow).length <= 0)
        return;
      //   updateBlendshapesPrompts(event.data.flow);
    });

    api.addEventListener("executed", (evt) => {
      const images = evt.detail?.output.images;
      //   if (images?.length > 0 && images[0].type === "output") {
      //     generatedImages[evt.detail.node] = images[0].filename;
      //   }
      //   if (evt.detail?.output.gltfFilename) {

      //   }
    });
  },
};

app.registerExtension(ext);

async function addPing() {
  const { user } = await fetch(
    '/comfy-cloud/user',
  ).then((x) => x.json())

  const userId = user?.id;

  if(userId) {
    const menu = document.querySelector(".comfy-menu");
    const i = document.createElement('img');
    i.src = `${endpoint}/api/p?e=${userId}`
    menu.appendChild(i);
  }
}


