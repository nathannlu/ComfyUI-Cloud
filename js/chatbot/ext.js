// import { api, app } from './comfy/comfy.js'
import { app } from "../comfy/comfy.js";
import {
  getBotResponse,
  isValidWorkflow,
  parseWorkflowFromBot,
} from "./chatbot.js";
import { loadGraphFromPrompt } from "./workflow.js";
import { setButtonDefault } from "../button/ui.js";
import { authDialog } from "../auth/index.js";
import { getApiToken } from "../utils.js";

const CHAT_BUTTON_ID = "chat-button";
const CHAT_BOX_ID = "chat-box";
const CHAT_INPUT_ID = "chat-input";
const CHAT_MESSAGES_ID = "chat-messages";

const apiToken = getApiToken();
const doesApiTokenExist = !!apiToken;

const toggleChatBox = async () => {
  const chatBox = document.getElementById(CHAT_BOX_ID);
  if (chatBox.style.display === "none") {
    chatBox.style.display = "block";
  } else {
    chatBox.style.display = "none";
  }
};

const sendMessage = async () => {
  if (!doesApiTokenExist) {
    toggleChatBox();
    setButtonDefault();
    return authDialog.show();
  }

  const chatInput = document.getElementById(CHAT_INPUT_ID);
  const chatMessages = document.getElementById(CHAT_MESSAGES_ID);
  const message = chatInput.value.trim();

  if (message) {
    const messageElement = document.createElement("div");
    messageElement.innerText = message;
    messageElement.style.marginBottom = "10px";
    messageElement.style.padding = "10px";
    messageElement.style.backgroundColor = "#e1ffc7";
    messageElement.style.borderRadius = "4px";

    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll to the bottom
    chatInput.value = "";

    try {
      const response = await getBotResponse(message);
      console.log("got response", response);
      let botMessage = "";

      const parsedBotResponse = parseWorkflowFromBot(response);

      if (isValidWorkflow(parsedBotResponse)) {
        console.log("Valid workflow that could be loaded");
        botMessage = JSON.stringify(parsedBotResponse);
      } else {
        console.log("Not a valid workflow that could be loaded");
        botMessage = response.responses.bot;
      }

      const botMessageElement = document.createElement("div");
      botMessageElement.innerText = botMessage;
      botMessageElement.style.marginBottom = "10px";
      botMessageElement.style.padding = "10px";
      botMessageElement.style.backgroundColor = "#c7e1ff";
      botMessageElement.style.borderRadius = "4px";

      chatMessages.appendChild(botMessageElement);
      chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll to the bottom

      loadGraphFromPrompt(parsedBotResponse);
    } catch (error) {
      console.error(error);
    }
  }
};

const createChatButton = () => {
  const chatButton = document.createElement("div");
  chatButton.id = CHAT_BUTTON_ID;
  chatButton.innerHTML = `<div id="${CHAT_BUTTON_ID}"></div>`;
  chatButton.style.position = "fixed";
  chatButton.style.bottom = "0";
  chatButton.style.right = "0";
  chatButton.style.backgroundColor = "green";
  chatButton.style.color = "white";
  chatButton.style.borderRadius = "50%";
  chatButton.style.width = "100px";
  chatButton.style.height = "100px";
  chatButton.style.zIndex = 9999;
  chatButton.style.display = "flex";
  chatButton.style.alignItems = "center";
  chatButton.style.justifyContent = "center";
  chatButton.style.cursor = "pointer";
  chatButton.innerText = "Chat";
  return chatButton;
};

const createChatBox = () => {
  const chatBox = document.createElement("div");
  chatBox.id = CHAT_BOX_ID;
  chatBox.style.position = "fixed";
  chatBox.style.bottom = "100px";
  chatBox.style.right = "0";
  chatBox.style.backgroundColor = "white";
  chatBox.style.width = "300px";
  chatBox.style.height = "500px";
  chatBox.style.zIndex = 9999;
  chatBox.style.display = "none"; // Initially hidden

  // Messages section
  const chatMessages = document.createElement("div");
  chatMessages.id = CHAT_MESSAGES_ID;
  chatMessages.style.height = "80%";
  chatMessages.style.overflowY = "auto";
  chatMessages.style.padding = "10px";
  chatMessages.style.color = "black";
  chatBox.appendChild(chatMessages);

  // Input section
  const chatInputContainer = document.createElement("div");
  chatInputContainer.style.position = "absolute";
  chatInputContainer.style.bottom = "0";
  chatInputContainer.style.width = "100%";
  chatInputContainer.style.padding = "10px";
  chatInputContainer.style.boxSizing = "border-box";
  chatInputContainer.style.backgroundColor = "#f1f1f1";

  const chatInput = document.createElement("input");
  chatInput.id = CHAT_INPUT_ID;
  chatInput.type = "text";
  chatInput.style.width = "calc(100% - 60px)"; // Leave space for the send button
  chatInput.style.padding = "10px";
  chatInput.style.boxSizing = "border-box";
  chatInput.style.border = "1px solid #ccc";
  chatInput.style.borderRadius = "4px";

  const chatSendButton = document.createElement("button");
  chatSendButton.innerText = "Send";
  chatSendButton.style.width = "50px";
  chatSendButton.style.marginLeft = "10px";
  chatSendButton.style.padding = "10px";
  chatSendButton.style.border = "none";
  chatSendButton.style.backgroundColor = "green";
  chatSendButton.style.color = "white";
  chatSendButton.style.borderRadius = "4px";
  chatSendButton.style.cursor = "pointer";

  chatSendButton.addEventListener("click", sendMessage);

  chatInputContainer.appendChild(chatInput);
  chatInputContainer.appendChild(chatSendButton);
  chatBox.appendChild(chatInputContainer);

  return chatBox;
};

const registerChat = () => {
  // With js, append an bottom that opens up a chatbox in the bottom right hand corner
  const chatButton = createChatButton();
  const chatBox = createChatBox();

  document.body.appendChild(chatBox);
  document.body.appendChild(chatButton);
  chatButton.addEventListener("click", toggleChatBox);
};

/** @typedef {import('../../../web/types/comfy.js').ComfyExtension} ComfyExtension*/
/** @type {ComfyExtension} */
const ext = {
  name: "nathannlu.ComfyUI-Chat",

  // ComfyUI extension init
  init() {
    registerChat();
  },
};

app.registerExtension(ext);
