import { getWorkflowId } from '../utils.js';
import { ComfyNode } from '../comfy/comfy.js';
import { cloudIconSmall } from '../ui/html.js';
import { workflowTableDialog, paymentTableDialog } from './dialogs.js';
import { endpoint } from '../constants.js';

export class ComfyCloud extends ComfyNode {
  color = "#fff" 
  bgcolor = "#fff" 
  groupcolor = "#1D4AFF"
  boxcolor="#1D4AFF"

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
    this.logo.src = URL.createObjectURL(new Blob([cloudIconSmall], { type: 'image/svg+xml' }));

    this.menuButton = this.addButton("View past runs", {}, async () => {
      workflowTableDialog.show()
    })

    this.menuButton.x = 8 
    this.menuButton.y = this.size[1] - 28 - 8
    this.menuButton.color = "#fff"
    this.menuButton.backgroundColor = "#1D4AFF";
    //this.menuButton.fontSize = "10px";

    this.settingsButton = this.addButton("Account", {}, async () => {
      paymentTableDialog.show()
    })

    this.settingsButton.x = 8 + this.menuButton.width + 8
    this.settingsButton.y = this.size[1] - 28 - 8
    this.settingsButton.color = "#fff"
    this.settingsButton.backgroundColor = "#1D4AFF";
  }

  onAdded() {
    createComfyNode()
  }

  drawLogo(ctx) {
    ctx.drawImage(this.logo, 9, -21);
    ctx.fillStyle = "#1D4AFF"
    ctx.font = "bold 12px Arial";
    ctx.fillText("Comfy Cloud", 32, -8)
  }

  gradient(context) {
    let paddingX = 4
    let paddingY = 4
    let time = this.time;
    let x = this.x;
    let y = this.y;

    const color = function (x, y, r, g, b) {
      context.fillStyle = `rgb(${r}, ${g}, ${b})`
      context.beginPath();
      //context.fillRect(x + padding, y + padding, 10, 10);
      context.roundRect(
        x+paddingX, 
        y+paddingY, 
        10, 
        10,
        4
      );  
      context.fill()
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
      for (x = paddingX; x <= 30 + paddingX; x++) {
        for (y = paddingY; y <= 30 + paddingY; y++) {
          color(x, y, R(x, y, time), G(x, y, time), B(x, y, time));
        }
      }
      this.time = this.time + 0.03;
    }

    startAnimation();
  }


  render(ctx) {
    const { 
      //workflow_id, 
      workflow_name
    } = this.properties;

    const [width] = this.size;

    // erase original UI
    ctx.fillStyle = "white"
    ctx.fillRect(0,-22, width+1, 50 )

    this.drawLogo(ctx)


    if (workflow_name) {
      this.gradient(ctx)

      ctx.fillStyle = "white"

      ctx.fillStyle = "#9999AA"
      ctx.font = "10px Arial";
      ctx.fillText("Workflow name", 60, 20)

      ctx.fillStyle = "black"
      ctx.font = "bold 16px Arial";
      ctx.fillText(workflow_name, 60, 40)

    } else {
      this.buttons = [];
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

async function createComfyNode() {
  const { user } = await fetch(
    '/comfy-cloud/user',
  ).then((x) => x.json())

  const userId = user?.id;
  const workflow_id = getWorkflowId();

  if(userId) {
    await fetch(
      `${endpoint}/auth/v?i=${userId}&w=${workflow_id}`
    ).then((x) => x.json())
  }
}
