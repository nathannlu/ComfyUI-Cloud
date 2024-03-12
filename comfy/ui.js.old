import { ComfyDialog, $el } from './comfy.js';

// @todo - pet games

class GameDialog extends ComfyDialog {
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
      onclick: () => {
        this.element.style.display = "none";
        this.close()
      },
    });
    return [this.button];
  }

  close() {
  }

  show(canvas) {
    this.textElement.style["white-space"] = "normal";
    this.textElement.style.color = "white";
    this.textElement.style.marginTop = "0px";

    this.textElement.replaceChildren(canvas);

    this.element.style.display = "flex";
    this.element.style.zIndex = 1001;
  }
}
export const gameDialog = new GameDialog();

