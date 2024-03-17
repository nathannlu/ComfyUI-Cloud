import { headerHtml, loadingIcon } from '../ui.js';
import { ComfyDialog, $el } from '../comfy/comfy.js';
import { infoDialog } from '../comfy/ui.js';
import { 
  getCloudWorkflow, 
  getWorkflowRunOutput, 
  stopRunningTask,
  pollWorkflowRun
} from '../client.js';
import { formatTimestamp, formatDuration } from '../utils.js';


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

    this.poll = null;
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
    this.container.innerHTML = workflowDetailsHtml();
    const progressBar = this.container.querySelector("#comfycloud-progress-bar")
    const statusContainer = this.container.querySelector("#comfycloud-status-container")
    const link = this.container.querySelector("#back-button");
    const terminate = this.container.querySelector("#terminate-button");
    const outputBox = this.container.querySelector("#comfycloud-output-box");
    terminate.onclick = async (e) => {
      try {
        e.target.innerHTML = loadingIcon;
        e.target.disabled = true;
        
        await stopRunningTask(id)
        infoDialog.show();
        infoDialog.showMessage(
          "Successfully terminated",
          "You will only be billed for the time your workflow was running.",
        );
      } catch(error) {
        infoDialog.show();
        infoDialog.showMessage(
          "Error",
          `Something went wrong: ${e}`,
        );
      } finally {
        e.target.innerHTML = "Stop workflow execution";
        e.target.disabled = false;
        this.close()
        clearInterval(this.poll)
      }
    };
    
    // Main polling function
    const getWorkflowRunData = async () => {
      try {
        const { 
          workflowRun, 
          progress
        } = await pollWorkflowRun(id)

        // Stop polling once its successful
        // handle terminal states (success, failed, terminated)

        if(workflowRun?.status == "success" || workflowRun?.status == "failed" || workflowRun?.status == "terminated") {
          terminate.remove();
          progressBar.remove();
          this.stopPolling()

          // query output only for failed / succeeded runs
          if (workflowRun?.status != "terminated") {
            const data = await getWorkflowRunOutput(id)
            outputBox.innerHTML = generateOutputs(data)
          }
        } else if(workflowRun) {
          // queue the poll

          if(this.poll == null) {
            this.poll = setInterval(getWorkflowRunData, 2000);
          }
        }

        // update status
        if (workflowRun?.status) {
          statusContainer.innerHTML = workflowRun.status
        }

        // update progress
        if(progress) {
          progressBar.style.width = `${progress.value/progress.max * 100}%`
          progressBar.style.height = "24px"
          progressBar.style.backgroundColor = "#1D4AFF"
          progressBar.style.transition = "all .2s"

          progressBar.innerHTML = `${progress.value/progress.max * 100}%`
        }

      } catch(error) {
        console.error("Error:", error);
        this.stopPolling()
      }
    }
    getWorkflowRunData()

    // Handle button clicks
    link.onclick = async () => {
      await this.showWorkflowsTable()
      this.stopPolling()
    };

    this.element.style.display = "flex";
    this.element.style.zIndex = 1001;
  }

  stopPolling() {
    clearInterval(this.poll)
    this.poll = null
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
const workflowDetailsHtml = () => {
  //const imageData = rowDetails.outputs[0]?.data.images[0].filename;

  return`
    <div style="padding: 20px; border: 1px solid #ddd; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
      <button id="back-button">Back</button>
      <h2>Row Details</h2>
      <p><strong>Status:</strong> <span id="comfycloud-status-container"></span></p>
      <div style="width: 100%;">
        <div id="comfycloud-progress-bar"></div>
      </div>
      <div id="comfycloud-output-box">
      </div>
      <button id="terminate-button">Stop workflow execution</button>
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
            ${JSON.stringify(run.data, null, 2)}
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
      <td style="padding: 12px;">${formatTimestamp(item.created_at)}</td>
      <td style="padding: 12px;">${formatDuration(item.duration)}</td>
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


