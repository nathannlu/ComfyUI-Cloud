import { app } from './comfy.js';
import { addButton } from '../button/index.js';
import { endpoint } from '../constants.js';
import { ComfyCloud } from '../node/index.js';
import { addPing } from '../client.js';

export const ext = {
  name: "nathannlu.ComfyCloud",
  endpoint: endpoint,
  init() {
    addButton();
    addPing();
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


