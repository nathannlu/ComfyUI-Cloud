import { ComfyNode } from '../comfy/comfy.js';
import { cloudIconWhite } from '../ui.js';
import { workflowTableDialog } from './workflows.ui.js';


export class ComfyCloud extends ComfyNode {
  color = LGraphCanvas.node_colors.blue.color;
  bgcolor = LGraphCanvas.node_colors.blue.bgcolor;
  groupcolor = LGraphCanvas.node_colors.blue.groupcolor;
  constructor() {
    super()
    if (!this.properties) {
      this.properties = {};
      this.properties.workflow_name = "";
      this.properties.workflow_id = "";
      this.properties.version = "";
    }

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

    this.menuButton = this.addButton("Menu", {}, async () => {
      //authDialog.show()
      workflowTableDialog.show()

      // Timeout is added as a hotfix.
      // Without waiting 100ms the node gets
      // stuck as selected on the user's mouse
      /*
      setTimeout(() => {
        if(this.properties?.workflow_id?.length > 0) {
          window.open(`https://comfycloud.vercel.app/workflows/${this.properties.workflow_id}`, '_blank');
        } else {
          window.open("https://comfycloud.vercel.app/workflows", '_blank');
        }
      }, 100)
      */
    })
    this.menuButton.x = 4 
    this.menuButton.y = 52
    this.menuButton.color = "#1D4AFF"
    this.menuButton.backgroundColor = "#fff";

  }

  drawLogo(ctx) {
    ctx.drawImage(this.logo, 8, 8); // Adjust the position as needed
  }

  gradient(context) {
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

  render(ctx) {
    const { 
      //workflow_id, 
      workflow_name
    } = this.properties;

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

}

