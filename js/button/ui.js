import { onGeneration } from "./actions.js";
import { loadingIcon, cloudIconWhite } from "../ui/html.js";
import { helpHandler } from "./support.js";


/**
 * HTML, UI dialogs, etc
 */
const generateOnCloudButtonHTML = `
  <div style="display: flex; align-items: center;">
    <div style="padding: 0 6px; margin-right: 8px;">
      ${cloudIconWhite}
    </div>
    <div>
      Generate 
      <div style='font-size: 12px;'>on cloud GPU</div>
    </div>
  </div>
`;

const cloudButtonLoadingHTML = `
  <div style="display: flex; align-items: center; justify-content: center; height: 40px;">
    Executing...
  </div>
`;

const feedbackButtonHTML = `
  <div style="font-size: 10px; display: flex; align-items: center;">
    Give Feedback
  </div>
`;

const supportButtonHTML = `
  <div style="font-size: 10px; display: flex; align-items: center;">
    Get Support
  </div>
`;

const docsButtonHTML = `
  <div style="font-size: 10px; display: flex; align-items: center; justify-content: center; width: 100%;">
    Read Docs
  </div>
`;

export function addInterface() {
  //const menu = document.querySelector(".comfy-menu");
  const queueButton = document.getElementById("queue-button");

  const cloudInference = document.createElement("button");
  cloudInference.id = "comfycloud-gpu-button";
  cloudInference.style.position = "relative";
  cloudInference.style.borderRadius = "12px";
  cloudInference.style.marginBottom = "12px";
  cloudInference.style.display = "block";
  cloudInference.style.background =
    "linear-gradient(to right, #0e42ed, #02a5db)";
  cloudInference.innerHTML = generateOnCloudButtonHTML;
  cloudInference.onclick = async () => {
    await onGeneration();
  };

  const supportButton = document.createElement("button");
  supportButton.id = "comfycloud-support-button";
  supportButton.style.position = "relative";
  supportButton.style.borderRadius = "12px";
  supportButton.style.height = "16px";
  supportButton.style.display = "flex";
  supportButton.style.alignItems = "center";
  supportButton.style.justifyContent = "center";
  supportButton.innerHTML = supportButtonHTML;
  supportButton.onclick = async () => {
    helpHandler("support");
    window.open("https://discord.gg/2PTNx3VCYa", "_blank");
  };

  const feedbackButton = document.createElement("button");
  feedbackButton.id = "comfycloud-bugfixes-button";
  feedbackButton.style.position = "relative";
  feedbackButton.style.borderRadius = "12px";
  feedbackButton.style.height = "16px";
  feedbackButton.style.display = "flex";
  feedbackButton.style.alignItems = "center";
  feedbackButton.style.justifyContent = "center";
  feedbackButton.innerHTML = feedbackButtonHTML;
  feedbackButton.onclick = async () => {
    helpHandler("feedback");
    window.open("https://discord.gg/2PTNx3VCYa", "_blank");
  };

  const docsButton = document.createElement("button");
  docsButton.id = "comfycloud-docs-button";
  docsButton.style.position = "relative";
  docsButton.style.borderRadius = "12px";
  docsButton.style.height = "16px";
  docsButton.style.display = "flex";
  docsButton.style.alignItems = "center";
  docsButton.style.justifyContent = "center";
  docsButton.innerHTML = docsButtonHTML;
  docsButton.onclick = () => {
    helpHandler("docs");
    window.open(
      "https://github.com/nathannlu/ComfyUI-Cloud/blob/main/docs/get-started.md",
      "_blank"
    );
  };

  const dividerTop = document.createElement("hr");
  dividerTop.style.width = "100%";
  dividerTop.style.color = "#000";
  dividerTop.style.margin = "10px 0";

  const dividerBottom = document.createElement("hr");
  dividerBottom.style.width = "100%";
  dividerBottom.style.color = "#000";
  dividerBottom.style.marginTop = "12px";

  const titleElement = document.createElement("div");
  titleElement.id = "comfycloud-title";
  titleElement.innerText = "ComfyUI-Cloud";
  titleElement.style.marginBottom = "10px";
  titleElement.style.fontSize = "14px";
  titleElement.style.textAlign = "center";
  titleElement.style.display = "flex";
  titleElement.style.justifyContent = "center";
  titleElement.style.alignItems = "center";

  const tooltipButton = document.createElement("button");
  tooltipButton.id = "comfycloud-tooltip-button";
  tooltipButton.innerText = "?";
  tooltipButton.style.fontSize = "14px";
  tooltipButton.style.marginLeft = "10px";
  tooltipButton.style.borderRadius = "50%";
  tooltipButton.style.border = "none";
  tooltipButton.style.backgroundColor = "#b5b5b5";
  tooltipButton.style.color = "white";
  tooltipButton.style.width = "20px";
  tooltipButton.style.height = "20px";
  tooltipButton.style.display = "flex";
  tooltipButton.style.justifyContent = "center";
  tooltipButton.style.alignItems = "center";
  tooltipButton.style.cursor = "pointer";
  tooltipButton.style.position = "relative";
  tooltipButton.onclick = () => {
    helpHandler("tooltipDocs");
    window.open(
      "https://github.com/nathannlu/ComfyUI-Cloud/blob/main/docs/get-started.md",
      "_blank"
    );
  };
  tooltipButton.onmouseover = function () {
    helpHandler("tooltipHover");
    tooltipText.style.visibility = "visible";
    tooltipText.style.opacity = "1";
  };
  tooltipButton.onmouseout = function () {
    tooltipText.style.visibility = "hidden";
    tooltipText.style.opacity = "0";
  };

  const tooltipText = document.createElement("div");
  tooltipText.id = "comfycloud-tooltip-text";
  tooltipText.style.visibility = "hidden";
  tooltipText.style.width = "250px";
  tooltipText.style.backgroundColor = "#555";
  tooltipText.style.color = "#fff";
  tooltipText.style.textAlign = "center";
  tooltipText.style.borderRadius = "6px";
  tooltipText.style.paddingInline = "16px";
  tooltipText.style.position = "absolute";
  tooltipText.style.zIndex = "1";
  tooltipText.style.bottom = "125%";
  tooltipText.style.left = "50%";
  tooltipText.style.marginLeft = "-290px";
  tooltipText.style.marginBottom = "-220px";
  tooltipText.style.opacity = "0";
  tooltipText.style.transition = "opacity 0.3s";
  tooltipText.innerHTML = `
    <div style="text-align: left;">
      <p>
        <strong>How to run a cloud workflow:</strong>
      </p>
      <ol type="1" style="padding-left: 16px;">
        <li style="padding-bottom: 8px;">Click "Generate on cloud GPU"</li>
        <li style="padding-bottom: 8px;">Name your workflow and wait for it to be uploaded.</li>
        <li style="padding-bottom: 8px;">Your workflow will be automatically executed.</li>
      </ol>
      <p style="font-size: 10px; color: #aba6a6;">Need more help? Click me to view the docs, or hit us up on Discord!</p>
    </div>
  `;

  const box = document.createElement("div");
  box.innerHTML = `
  <div id='comfycloud-message'>
  </div>
  `;

  tooltipButton.appendChild(tooltipText);
  titleElement.appendChild(tooltipButton);

  queueButton.after(dividerTop);
  dividerTop.after(titleElement);
  titleElement.after(cloudInference);
  cloudInference.after(feedbackButton);
  feedbackButton.after(supportButton);
  supportButton.after(docsButton);
  docsButton.after(box);
  box.after(dividerBottom);
}

export const setButtonLoading = () => {
  const menu = document.querySelector(".comfy-menu");
  const btn = menu.querySelector("#comfycloud-gpu-button");
  btn.innerHTML = cloudButtonLoadingHTML;
  btn.style.color = "#ddd";
  btn.disabled = true;
};

export const setButtonDefault = () => {
  const menu = document.querySelector(".comfy-menu");
  const btn = menu.querySelector("#comfycloud-gpu-button");
  btn.innerHTML = generateOnCloudButtonHTML;
  btn.style.color = "#ddd";
  btn.disabled = false;
};

export const setMessage = (text) => {
  const menu = document.querySelector(".comfy-menu");
  const title = menu.querySelector("#comfycloud-message");

  if (text.length > 0) {
    title.innerHTML = `${loadingIcon} ${text}`;
  } else {
    title.innerHTML = "";
  }
  //title.style.color = "orange";
};
