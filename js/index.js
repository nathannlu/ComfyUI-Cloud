import { app } from "./app.js";
import { api } from "./api.js";
import { ComfyWidgets, LGraphNode } from "./widgets.js";

import { getData, saveData, getApiToken, validatePrompt, getWorkflowId, compareWorkflows, isWorkflowUpToDate } from "./utils.js"
import { addButton, cloudIconWhite } from './ui.js';
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

    /*
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
    */

    this.widgets_start_y = 10;
    this.setSize([300,100]);
    this.resizeable = false;

    this.serialize_widgets = true;
    this.isVirtualNode = true;

    // gradient
    this.time = 0;
    this.x = 0;
    this.y = 0;

    // logo
    this.logo = new Image();
    this.logo.src = URL.createObjectURL(new Blob([cloudIconWhite], { type: 'image/svg+xml' }));
  }

  onDrawForeground(ctx) {
    const { workflow_id, workflow_name } = this.properties;

    if (workflow_name) {
      this.gradient(ctx)
      this.drawLogo(ctx)

      ctx.fillStyle = "white"

      ctx.fillStyle = "#9999AA"
      ctx.font = "12px Arial";
      ctx.fillText("Workflow name", 50, 15)

      ctx.fillStyle = "white"
      ctx.font = "bold 16px Arial";
      ctx.fillText(workflow_name, 50, 35)

    } else {
      ctx.fillStyle = "white"
      ctx.font = "bold 16px Arial";
      ctx.fillText("Do not manually create this node", 10, 20)

      ctx.fillStyle = "#9999AA"
      ctx.font = "12px Arial";
      ctx.fillText("Delete this node and click on the ", 10, 40)
      ctx.fillText("'Generate on cloud GPU' button to get started", 10, 54)
    }
  }

  drawLogo(ctx) {
    ctx.drawImage(this.logo, 8, 8); // Adjust the position as needed
  }

  gradient(context) {
    const [width, height] = this.size
    let time = this.time;
    let x = this.x;
    let y = this.y;

    const color = function (x, y, r, g, b) {
      context.fillStyle = `rgb(${r}, ${g}, ${b})`
      context.fillRect(x, y, 10, 10);
    }
    const R = function (x, y, time) {
      return (Math.floor(192 + 64 * Math.cos((x * x - y * y) / 300 + time)));
    }

    const G = function (x, y, time) {
      return (Math.floor(192 + 64 * Math.sin((x * x * Math.cos(time / 4) + y * y * Math.sin(time / 3)) / 300)));
    }

    const B = function (x, y, time) {
      return (Math.floor(192 + 64 * Math.sin(5 * Math.sin(time / 9) + ((x - 100) * (x - 100) + (y - 100) * (y - 100)) / 1100)));
    }

    const startAnimation = () => {
      for (x = 0; x <= 30; x++) {
        for (y = 0; y <= 30; y++) {
          color(x, y, R(x, y, time), G(x, y, time), B(x, y, time));
        }
      }
      this.time = this.time + 0.03;
      //requestAnimationFrame(startAnimation);
    }

    startAnimation();
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


