import { onGeneration } from "./actions.js";
import { loadingIcon, cloudIconWhite } from "../ui/html.js";

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
  supportButton.onclick = () => {
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
  feedbackButton.onclick = () => {
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

  const box = document.createElement("div");
  box.innerHTML = `
  <div id='comfycloud-message'>
  </div>
  `;

  queueButton.after(dividerTop);
  dividerTop.after(titleElement);
  titleElement.after(cloudInference);
  cloudInference.after(feedbackButton);
  feedbackButton.after(supportButton);
  supportButton.after(docsButton);
  docsButton.after(dividerBottom);
  dividerBottom.after(box);
}

export const setButtonLoading = () => {
  const menu = document.querySelector(".comfy-menu");
  const btn = menu.querySelector("#comfycloud-gpu-button");
  btn.innerHTML = cloudButtonLoadingHTML;
  btn.style.color = "#000";
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
