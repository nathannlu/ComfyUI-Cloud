import { headerHtml } from '../ui.js';
import { ComfyDialog, $el } from '../comfy/comfy.js';
import { infoDialog } from '../comfy/ui.js';

import { WorkflowRunsTable } from '../ui/table.js';
import { RunDetails } from '../ui/runDetails.js';
import van from '../lib/van.js';

const activeTab = van.state(0)
const runId = van.state(null)

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
    this.container.removeChild(this.component)
    this.component.remove()

    activeTab.val = 0
    runId.val = null
    
    //this.innerContainer.remove()
    this.element.style.display = "none";
  }

  async show() {
    activeTab.val = 0

    const closeDialogWithMessage = (header, message) => {
      infoDialog.show();
      infoDialog.showMessage(
        header,
        message,
      );
      clearInterval(this.poll)
      this.close()
    }

    this.component = document.createElement("div");
    van.add(this.component, () => van.tags.div(
      activeTab.val == 0 ? WorkflowRunsTable(activeTab, runId) : RunDetails(activeTab, runId, this.poll, closeDialogWithMessage)
    ))

    this.container.append(this.component)

    this.element.style.display = "flex";
    this.element.style.zIndex = 1001;
  }
}
export const workflowTableDialog = new WorkflowTableDialog()

