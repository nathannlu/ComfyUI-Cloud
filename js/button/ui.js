import { onGeneration } from './actions.js';
import { loadingIcon, cloudIcon } from '../ui/html.js';

/**
 * HTML, UI dialogs, etc
 */
const generateOnCloudButtonHTML = `
  <div style="display: flex; align-items: center;">
    <div style="padding: 0 6px; margin-right: 8px">
      ${cloudIcon}
    </div>
    <div>
      Generate 
      <div style='font-size: 12px;'>on cloud GPU</div>
    </div>
  </div>
`

const cloudButtonLoadingHTML = `
  <div style="display: flex; align-items: center; justify-content: center; height: 40px;">
    Executing...
  </div>
`

export function addButton() {
  //const menu = document.querySelector(".comfy-menu");
  const queueButton = document.getElementById("queue-button");

  const cloudInference = document.createElement("button");
  cloudInference.id = 'comfycloud-gpu-button';
  cloudInference.style.position = "relative";
  cloudInference.style.display = "block";
  cloudInference.innerHTML = generateOnCloudButtonHTML;
  cloudInference.onclick = async () => {
    await onGeneration();
  };

  const box = document.createElement("div");
  box.innerHTML = `
    <div id='comfycloud-message'>
    </div>
  `;

  queueButton.after(cloudInference);
  cloudInference.after(box);
}

export const setButtonLoading = () => {
  const menu = document.querySelector(".comfy-menu");
  const btn = menu.querySelector("#comfycloud-gpu-button");
  btn.innerHTML = cloudButtonLoadingHTML;
  btn.style.color = "orange";
  btn.disabled = true;
}

export const setButtonDefault = () => {
  const menu = document.querySelector(".comfy-menu");
  const btn = menu.querySelector("#comfycloud-gpu-button");
  btn.innerHTML = generateOnCloudButtonHTML;
  btn.style.color = "#ddd";
  btn.disabled = false;
}

export const setMessage = (text) => {
  const menu = document.querySelector(".comfy-menu");
  const title = menu.querySelector("#comfycloud-message");

  if(text.length > 0) {
    title.innerHTML = `${loadingIcon} ${text}`;
  } else {
    title.innerHTML = "";
  }
  //title.style.color = "orange";
}

