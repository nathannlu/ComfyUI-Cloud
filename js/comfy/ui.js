import { ComfyDialog, $el } from './comfy.js';
import { getData, setData } from '../store.js';
import { headerHtml, chevronUpIcon } from '../ui/html.js';
import van from '../lib/van.js';

export class ComfyCloudPopover extends ComfyDialog {
  container = null;

  constructor(ui, title = "") {
    super();

    this.element.classList.add("comfy-normal-modal");
    this.element.style.padding = "16px";
    this.element.style.overflowY = "auto";
    this.element.style.top = "24px";
    this.element.style.left = "14px";
    this.element.style.transform = "none";

    // hotfix: set all p elements inside this.element to have 0 margin
    this.element.querySelectorAll("p").forEach((p) => {
      p.style.margin = "0";
    });


    // VanJS content
    this.container = document.createElement("div");
    this.container.style.color = "white";
    this.container.style.overflow = "hidden";


    // Title
    this.title = document.createElement("div");
    this.title.style.fontSize = "18px";
    this.title.style.fontWeight = "bold";
    this.title.style.color = "white";
    this.title.innerHTML = title;

    // Collapse button
    this.collapsed = false;
    this.collapseButton = document.createElement("button");
    this.collapseButton.style.width = "36px";
    this.collapseButton.innerHTML = chevronUpIcon;
    this.collapseButton.onclick = () => { 
      this.collapsed = !this.collapsed;
      this.component.style.height = this.collapsed ? "0" : "auto";
      this.collapseButton.style.transform = this.collapsed ? "rotate(180deg)" : "rotate(0deg)";
      this.container.style.overflow = this.collapsed ? "hidden" : "auto";
      this.container.style.overflowY = this.collapsed ? "hidden" : "scroll";
    }

    // Title + collapse button wrapper
    this.header = document.createElement("div");
    this.header.style.display = "flex";
    this.header.style.alignItems = "center";
    this.header.style.justifyContent = "space-between";
    this.header.style.gap = "8px";
    this.header.append(this.title);
    this.header.append(this.collapseButton);


    this.component = null;
    this.ui = ui


    this.element.querySelector(".comfy-modal-content").prepend(this.container);
    this.element.querySelector(".comfy-modal-content").prepend(this.header);
  }

  createButtons() {
    return [
      $el(
        "div",
        [],
      ),
    ];
  }

  _renderComponent() {
    this.component = document.createElement("div");
    van.add(this.component, this.ui(this))
    this.container.append(this.component)
  }

  _clearComponent() {
    this.container.removeChild(this.component)
    this.component.remove()
    this.component = null;
  }

  show() {
    if(this.component == null) {
      this._renderComponent();
    } else {
      // clear component
      this._clearComponent();

      // read component
      this._renderComponent();
    }

    this.element.style.display = "flex";
    this.element.style.zIndex = 1001;

  }

  close() {
    this._clearComponent();
    this.element.style.display = "none";
    this.closeCallback(this)
  }

  closeCallback() {
    /**
     * For extensions to implement
     */
  }
}

export class ComfyCloudDialog extends ComfyDialog {
  container = null;

  constructor(ui) {
    super();

    this.element.classList.add("comfy-normal-modal");
    this.element.style.paddingBottom = "20px";
    this.element.style.overflowY = "auto";

    this.container = document.createElement("div");
    this.container.style.color = "white";

    this.header = document.createElement("div");
    this.header.innerHTML = headerHtml
    this.element.querySelector(".comfy-modal-content").prepend(this.container);
    this.element.querySelector(".comfy-modal-content").prepend(this.header);

    this.component = null;
    this.ui = ui
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

  _renderComponent() {
    this.component = document.createElement("div");
    van.add(this.component, this.ui(this))
    this.container.append(this.component)

  }

  _clearComponent() {
    this.container.removeChild(this.component)
    this.component.remove()
    this.component = null;
  }

  show() {
    if(this.component == null) {
      this._renderComponent();
    } else {
      // clear component
      this._clearComponent();

      // read component
      this._renderComponent();
    }

    this.element.style.display = "flex";
    this.element.style.zIndex = 1001;
  }

  close() {
    this._clearComponent();
    this.element.style.display = "none";
    this.closeCallback(this)
  }

  closeCallback() {
    /**
     * For extensions to implement
     */
  }
}


export class InfoDialog extends ComfyDialog {
  constructor() {
    super();
    this.element.classList.add("comfy-normal-modal");
    this.element.style.paddingBottom = "20px";
  }

  button = undefined;

  createButtons() {
    this.button = $el("button", {
      type: "button",
      textContent: "Close",
      onclick: () => this.close(),
    });
    return [this.button];
  }

  close() {
    this.element.style.display = "none";
  }

  show(html) {
    this.textElement.style["white-space"] = "normal";
    this.textElement.style.color = "white";
    this.textElement.style.marginTop = "0px";
    if (typeof html === "string") {
      this.textElement.innerHTML = html;
    } else {
      this.textElement.replaceChildren(html);
    }
    this.element.style.display = "flex";
    this.element.style.zIndex = 1002;
  }

  showMessage(title, message) {
    this.show(`
      <div style="width: 100%; max-width: 600px; display: flex; gap: 18px; flex-direction: column; overflow: unset">
        <h3 style="margin: 0px;">${title}</h3>
        <label>
          ${message}
        </label>
        </div>
      `);
  }

  loadingIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><g fill="none" stroke="#888888" stroke-linecap="round" stroke-width="2"><path stroke-dasharray="60" stroke-dashoffset="60" stroke-opacity=".3" d="M12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3Z"><animate fill="freeze" attributeName="stroke-dashoffset" dur="1.3s" values="60;0"/></path><path stroke-dasharray="15" stroke-dashoffset="15" d="M12 3C16.9706 3 21 7.02944 21 12"><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.3s" values="15;0"/><animateTransform attributeName="transform" dur="1.5s" repeatCount="indefinite" type="rotate" values="0 12 12;360 12 12"/></path></g></svg>`;

  showLoading(title, message) {
    this.show(`
      <div style="width: 400px; display: flex; gap: 18px; flex-direction: column; overflow: unset">
        <h3 style="margin: 0px; display: flex; align-items: center; justify-content: center;">${title} ${this.loadingIcon}</h3>
        <label>
          ${message}
        </label>
        </div>
      `);
  }
}

export class LoadingDialog extends ComfyDialog {
  constructor() {
    super();
    this.element.classList.add("comfy-normal-modal");
    // this.element.style.paddingBottom = "20px";
  }

  createButtons() {
    return [];
  }

  close() {
    this.element.style.display = "none";
  }

  show(html) {
    this.textElement.style["white-space"] = "normal";
    this.textElement.style.color = "white";
    this.textElement.style.marginTop = "0px";
    if (typeof html === "string") {
      this.textElement.innerHTML = html;
    } else {
      this.textElement.replaceChildren(html);
    }
    this.element.style.display = "flex";
    this.element.style.zIndex = 1001;
  }

  loadingIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><g fill="none" stroke="#888888" stroke-linecap="round" stroke-width="2"><path stroke-dasharray="60" stroke-dashoffset="60" stroke-opacity=".3" d="M12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3Z"><animate fill="freeze" attributeName="stroke-dashoffset" dur="1.3s" values="60;0"/></path><path stroke-dasharray="15" stroke-dashoffset="15" d="M12 3C16.9706 3 21 7.02944 21 12"><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.3s" values="15;0"/><animateTransform attributeName="transform" dur="1.5s" repeatCount="indefinite" type="rotate" values="0 12 12;360 12 12"/></path></g></svg>`;

  showLoading(title, message) {
    this.show(`
      <div style="width: 400px; display: flex; gap: 18px; flex-direction: column; overflow: unset">
        <h3 style="margin: 0px; display: flex; align-items: center; justify-content: center; gap: 12px;">${title} ${
          this.loadingIcon
        }</h3>
          ${message ? `<label>${message}</label>` : ""}
        </div>
      `);
  }
}

export class InputDialog extends InfoDialog {
  callback = undefined;

  constructor() {
    super();
  }

  createButtons() {
    return [
      $el(
        "div",
        {
          type: "div",
          style: {
            display: "flex",
            gap: "6px",
            justifyContent: "flex-end",
            width: "100%",
          },
        },
        [
          $el("button", {
            type: "button",
            textContent: "Close",
            onclick: () => {
              this.callback?.(undefined);
              this.close();
            },
          }),
          $el("button", {
            type: "button",
            textContent: "Save",
            onclick: () => {
              const input = this.textElement.querySelector("#input").value;
              if (input.trim() === "") {
                showError("Input validation", "Input cannot be empty");
              } else {
                this.callback?.(input);
                this.close();
                this.textElement.querySelector("#input").value = "";
              }
            },
          }),
        ],
      ),
    ];
  }

  input(title, message) {
    return new Promise((resolve) => {
      this.callback = resolve;
      this.show(`
      <div style="width: 400px; display: flex; gap: 18px; flex-direction: column; overflow: unset">
        <h3 style="margin: 0px;">${title}</h3>
        <label>
          ${message}
          <input id="input" style="margin-top: 8px; width: 100%; height:40px; padding: 0px 6px; box-sizing: border-box; outline-offset: -1px;">
        </label>
        </div>
      `);
    });
  }
}

export class ConfirmDialog extends InfoDialog {
  callback = undefined;

  constructor() {
    super();
  }

  createButtons() {
    return [
      $el(
        "div",
        {
          type: "div",
          style: {
            display: "flex",
            gap: "6px",
            justifyContent: "flex-end",
            width: "100%",
          },
        },
        [
          $el("button", {
            type: "button",
            textContent: "Close",
            onclick: () => {
              this.callback?.(false);
              this.close();
            },
          }),
          $el("button", {
            type: "button",
            textContent: "Confirm",
            style: {
              color: "green",
            },
            onclick: () => {
              this.callback?.(true);
              this.close();
            },
          }),
        ],
      ),
    ];
  }

  confirm(title, message) {
    return new Promise((resolve) => {
      this.callback = resolve;
      this.show(`
      <div style="width: 100%; max-width: 600px; display: flex; gap: 18px; flex-direction: column; overflow: unset">
        <h3 style="margin: 0px;">${title}</h3>
        <label>
          ${message}
        </label>
        </div>
      `);
    });
  }
}

export class ConfigDialog extends ComfyDialog {
  container = null;
  poll = null;
  timeout = null;

  constructor() {
    super();
    this.element.classList.add("comfy-normal-modal");
    this.element.style.paddingBottom = "20px";

    this.container = document.createElement("div");
    this.element.querySelector(".comfy-modal-content").prepend(this.container);
  }

  createButtons() {
    return [
      $el(
        "div",
        {
          type: "div",
          style: {
            display: "flex",
            gap: "6px",
            justifyContent: "flex-end",
            width: "100%",
          },
          //onclick: () => this.save(),
        },
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
    clearInterval(this.poll);
    clearTimeout(this.timeout);
  }

  save(api_key, displayName) {
    //console.log('save',api_key)
    if (!displayName) displayName = getData().displayName;

    const deployOption = 'cloud'
    //const deployOption = this.container.querySelector("#deployOption").value;
    //localStorage.setItem("comfy_cloud_env", deployOption);

    const endpoint = this.endpoint
    setData({
      endpoint,
      apiKey: api_key,
      displayName,
      environment: deployOption,
    });
    this.close();
  }

  show() {
    this.container.style.color = "white";

    const data = getData();

    this.container.innerHTML = `
      <div style="width: 400px; display: flex; gap: 18px; flex-direction: column;">
        <h3 style="margin: 0px;">Get started</h3>
        <p>Log in through our website to get started!</p>
        <label style="color: white;">
          <button id="loginButton" style="margin-top: 8px; width: 100%; height:40px; box-sizing: border-box; padding: 0px 6px;">
            Login
          </button>
        </label>
      </div>
    `;

    // Get auth request
    const button = this.container.querySelector("#loginButton");
    button.onclick = () => {
      const uuid =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
      window.open(data.endpoint + "/auth-request/" + uuid, "_blank");

      this.timeout = setTimeout(() => {
        clearInterval(this.poll);
        infoDialog.showMessage(
          "Timeout",
          "Wait too long for the response, please try re-login",
        );
      }, 30000); // Stop polling after 30 seconds

      this.poll = setInterval(() => {
        fetch(data.endpoint + "/api/auth-response/" + uuid)
          .then((response) => {
            console.log('response', response)
            return response.json()
          })
          .then((json) => {
            console.log('json',json)

            if (json.api_key) {
              this.save(json.api_key, json.name);
              infoDialog.show();
              clearInterval(this.poll);
              clearTimeout(this.timeout);
              infoDialog.showMessage(
                "Authenticated",
                "You will be able to upload workflow to " + json.name,
              );
            }
          })
          .catch((error) => {
            console.error("Error:", error);
            clearInterval(this.poll);
            clearTimeout(this.timeout);
            infoDialog.showMessage("Error", error);
          });
      }, 2000);
    };

    this.element.style.display = "flex";
    this.element.style.zIndex = 1001;
  }
}

export const inputDialog = new InputDialog();
export const loadingDialog = new LoadingDialog();
export const infoDialog = new InfoDialog();
export const confirmDialog = new ConfirmDialog();
export const configDialog = new ConfigDialog();

export function showError(title, message) {
  infoDialog.show(
    `<h3 style="margin: 0px; color: red;">${title}</h3><br><span>${message}</span> `,
  );
}

