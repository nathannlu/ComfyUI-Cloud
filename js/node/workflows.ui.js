import { headerHtml } from '../ui.js';
import { ComfyDialog, $el } from '../comfy/comfy.js';
import { infoDialog } from '../comfy/ui.js';
import { 
  getCloudWorkflow, 
  getWorkflowRunOutput, 
  stopRunningTask
} from '../client.js';

class WorkflowTableDialog extends ComfyDialog {
  container = null;

  constructor() {
    super();

    this.element.classList.add("comfy-normal-modal");
    this.element.style.paddingBottom = "20px";
    this.element.style.overflowY = "auto";

    this.container = document.createElement("div");
    this.container.style.color = "white";
    this.container.style.width = "720px";
    this.container.style.minHeight = "540px";

    this.header = document.createElement("div");
    this.header.innerHTML = headerHtml
    this.element.querySelector(".comfy-modal-content").prepend(this.container);
    this.element.querySelector(".comfy-modal-content").prepend(this.header);
  }

  createButtons() {
    return [
      $el(
        "div",
        [
          $el("button", {
            type: "button",
            textContent: "Close",
            onclick: () => this.close(),
          }),
        ],
      ),
    ];
  }

  close() {
    this.element.style.display = "none";
  }

  async show() {
    await this.showWorkflowsTable();
  }

  async showWorkflowDetails(id) {
    const data = await getWorkflowRunOutput(id)

    this.container.innerHTML = workflowDetailsHtml(data);

    const link = this.container.querySelector("#back-button");
    link.onclick = async () => {
      await this.showWorkflowsTable()
    };

    const terminate = this.container.querySelector("#terminate-button");
    terminate.onclick = async () => {
      try {
        await stopRunningTask(id)
        infoDialog.show();
        infoDialog.showMessage(
          "Successfully terminated",
          "You will only be billed for the time your workflow was running.",
        );
        this.close()
      } catch(e) {
        infoDialog.show();
        infoDialog.showMessage(
          "Error",
          `Something went wrong: ${e}`,
        );
        this.close()
      }
    };


    this.element.style.display = "flex";
    this.element.style.zIndex = 1001;
  }

  async showWorkflowsTable() {
    // @todo - call api to set data
    const workflow = await getCloudWorkflow()
    this.runs = workflow.runs || [];

    this.container.innerHTML = tableHtml(this.runs);
    const workflowRows = this.container.querySelectorAll(".workflow-row");
    workflowRows.forEach((row, i) => {
      row.onclick = async () => {
        const rowId = this.runs[i].id
        await this.showWorkflowDetails(rowId)
      }
    });

    this.element.style.display = "flex";
    this.element.style.zIndex = 1001;
  }
}
export const workflowTableDialog = new WorkflowTableDialog()




// Function to handle row click
const workflowDetailsHtml = (rowDetails) => {
  //const imageData = rowDetails.outputs[0]?.data.images[0].filename;

  return`
    <div style="padding: 20px; border: 1px solid #ddd; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
      <h2>Row Details</h2>
      ${rowDetails.status === 'not-started' || rowDetails.status === 'running' ? `<button id="terminate-button">Stop workflow execution</button>` : "" }
      <p><strong>Status:</strong> <span style="color: ${rowDetails.status === 'success' ? '#4CAF50' : '#FFC107'};">${rowDetails.status}</span></p>
      ${generateOutputs(rowDetails.outputs)}
      <button id="back-button">Back</button>
    </div>
  `;
}

const generateOutputs = (outputs) => {
  return outputs?.map((run) => {
    const fileName = run.data.images?.[0].filename ||
      run.data.files?.[0].filename ||
      run.data.gifs?.[0].filename;

    if (!fileName) {
      return`
        <TableRow key={run.id}>
          <TableCell>Output</TableCell>
          <TableCell className="">
            <CodeBlock
              code={JSON.stringify(run.data, null, 2)}
              lang="json"
            />
          </TableCell>
        </TableRow>
      `;
    }

    // const filePath
    return `
      <tr key={run.id}>
        <TableCell className="break-words">${fileName}</TableCell>
        <TableCell>
          ${generateOutputDisplay(run.run_id, fileName)}
        </TableCell>
      </TableRow>
    `;
  }).join('');
}

const generateOutputDisplay = (run_id, filename) => {
  const url = `https://comfyui-output.nyc3.digitaloceanspaces.com/comfyui-output/outputs/runs/${run_id}/${filename}`
  if (filename.endsWith(".mp4") || filename.endsWith(".webm")) {
    return`
      <video controls autoPlay className="w-[400px]">
        <source src="${url}" type="video/mp4" />
        <source src="${url}" type="video/webm" />
        Your browser does not support the video tag.
      </video>
    `;
  }

  if (
    filename.endsWith(".png") ||
    filename.endsWith(".gif") ||
    filename.endsWith(".jpg") ||
    filename.endsWith(".jpeg")
  ) {
    return `<img className="max-w-[200px]" alt="${filename}" src="${url}" />`;
  } else {
    return `<a download href="${url}">${filename}</a>`;
  }
}

// Function to generate HTML rows based on the array of objects
function generateRows(data) {
  return data.map((item, i) => `
    <tr class="workflow-row" style="border-bottom: 1px solid #ddd; cursor: pointer;">
      <td style="padding: 12px;">${i+1}</td>
      <td style="padding: 12px;">${item.created_at}</td>
      <td style="padding: 12px;">0.0s</td>
      <td style="padding: 12px; color: ${item.status === 'success' ? '#4CAF50' : '#FFC107'};">${item.status}</td>
    </tr>
  `).join('');
}

// Generate the table HTML with dynamic rows
const tableHtml = (data) => {
  return`
    <table style="border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
      <thead>
        <tr style="background-color: #f4f4f4; color: #333; border-bottom: 2px solid #ddd; text-align: left;">
          <th style="padding: 12px;">Number</th>
          <th style="padding: 12px;">Time</th>
          <th style="padding: 12px;">Duration</th>
          <th style="padding: 12px;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${generateRows(data)}
      </tbody>
    </table>
  `;
}


