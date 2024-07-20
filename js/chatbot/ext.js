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
const CHAT_SEND_BUTTON_ID = "chat-send-button";

const apiToken = getApiToken();
const doesApiTokenExist = !!apiToken;

let canSendMessage = true;

const toggleChatBox = async () => {
  const chatBox = document.getElementById(CHAT_BOX_ID);
  if (chatBox.style.display === "none") {
    chatBox.style.display = "block";
  } else {
    chatBox.style.display = "none";
  }
};

const createChatButton = () => {
  const chatButton = document.createElement("div");
  chatButton.id = CHAT_BUTTON_ID;

  // Set up the button styles and gradient background
  chatButton.style.position = "fixed";
  chatButton.style.bottom = "0";
  chatButton.style.right = "0";
  chatButton.style.margin = "20px";
  chatButton.style.background = "linear-gradient(160deg, #8A2BE2, #1E90FF)"; // Gradient background
  chatButton.style.color = "white";
  chatButton.style.borderRadius = "50%";
  chatButton.style.width = "60px";
  chatButton.style.height = "60px";
  chatButton.style.zIndex = 9999;
  chatButton.style.display = "flex";
  chatButton.style.alignItems = "center";
  chatButton.style.justifyContent = "center";
  chatButton.style.cursor = "pointer";

  // Create and append SVG chat bubble icon
  const chatIcon = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg"
  );
  chatIcon.setAttribute("viewBox", "0 0 512 512");
  chatIcon.setAttribute("width", "20"); // Adjust size as needed
  chatIcon.setAttribute("height", "20"); // Adjust size as needed
  chatIcon.setAttribute("fill", "currentColor"); // Use current text color

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute(
    "d",
    "M416,0H96C43.072,0,0,43.072,0,96v405.333c0,4.48,2.816,8.491,7.04,10.027c1.195,0.427,2.411,0.64,3.627,0.64c3.115,0,6.123-1.344,8.192-3.84L122.325,384H416c52.928,0,96-43.072,96-96V96C512,43.072,468.928,0,416,0z"
  );
  chatIcon.appendChild(path);

  chatButton.appendChild(chatIcon);

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
  chatBox.style.borderRadius = "10px";
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
  chatInputContainer.style.borderBottomLeftRadius = "10px";
  chatInputContainer.style.borderBottomRightRadius = "10px";

  // Flexbox layout for horizontal alignment
  chatInputContainer.style.display = "flex";
  chatInputContainer.style.alignItems = "center";

  // Input field
  const chatInput = document.createElement("input");
  chatInput.id = CHAT_INPUT_ID;
  chatInput.type = "text";
  chatInput.style.flex = "1"; // Allow the input to grow and take up available space
  chatInput.style.padding = "10px";
  chatInput.style.boxSizing = "border-box";
  chatInput.style.border = "1px solid #ccc";
  chatInput.style.borderRadius = "4px";
  chatInput.placeholder = "Describe your desired workflow...";

  // Send button
  const chatSendButton = document.createElement("button");
  chatSendButton.id = CHAT_SEND_BUTTON_ID;
  chatSendButton.style.width = "40px";
  chatSendButton.style.height = "40px";
  chatSendButton.style.marginLeft = "10px";
  chatSendButton.style.padding = "0"; // Remove default padding
  chatSendButton.style.border = "none";
  chatSendButton.style.backgroundColor = "#007acc";
  chatSendButton.style.color = "white";
  chatSendButton.style.cursor = "pointer";
  chatSendButton.style.borderRadius = "50%";
  chatSendButton.style.display = "flex";
  chatSendButton.style.alignItems = "center";
  chatSendButton.style.justifyContent = "center";

  // Create and style the SVG icon
  const sendIcon = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg"
  );
  sendIcon.setAttribute("fill", "#ffffff"); // Use white color for the icon
  sendIcon.setAttribute("viewBox", "0 0 52 52");
  sendIcon.setAttribute("enable-background", "new 0 0 52 52");
  sendIcon.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  sendIcon.setAttribute("class", "send-icon");
  sendIcon.setAttribute("xml:space", "preserve");
  sendIcon.setAttribute("width", "18px"); // Adjust size as needed
  sendIcon.setAttribute("height", "18px"); // Adjust size as needed

  // Create the path element for the SVG
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute(
    "d",
    "M2.1,44.5l4.4-16.3h18.6c0.5,0,1-0.5,1-1v-2c0-0.5-0.5-1-1-1H6.5l-4.3-16l0,0C2.1,8,2,7.7,2,7.4C2,6.7,2.7,6,3.5,6.1c0.2,0,0.3,0.1,0.5,0.1l0,0l0,0l0,0l0,0l45,18.5c0.6,0.2,1,0.8,1,1.4s-0.4,1.1-0.9,1.3l0,0L4,46.4l0,0c-0.2,0.1-0.4,0.1-0.6,0.1C2.6,46.4,2,45.8,2,45C2,44.8,2,44.7,2.1,44.5L2.1,44.5z"
  );
  sendIcon.appendChild(path);

  // Append SVG to button
  chatSendButton.appendChild(sendIcon);

  // Add event listener
  chatSendButton.addEventListener("click", sendMessage);

  // Append input and button to container
  chatInputContainer.appendChild(chatInput);
  chatInputContainer.appendChild(chatSendButton);
  chatBox.appendChild(chatInputContainer);

  return chatBox;
};

const updateMessageBoxStatus = (canSendMessage) => {
  const button = document.getElementById(CHAT_SEND_BUTTON_ID);
  if (button) {
    button.style.backgroundColor = canSendMessage ? "#007acc" : "#cccccc"; // Change color based on `isActive`
  }
  const input = document.getElementById(CHAT_INPUT_ID);
  if (input) {
    input.placeholder = canSendMessage ? "Describe your desired workflow..." : "Generating workflow...";
    input.disabled = !canSendMessage;
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
    if (!canSendMessage) {
      return;
    } else {
      canSendMessage = false;
      updateMessageBoxStatus(canSendMessage);
    }

    const messageElement = document.createElement("div");
    messageElement.innerText = message;
    messageElement.style.marginBottom = "10px";
    messageElement.style.padding = "10px";
    messageElement.style.backgroundColor = "#A7DBFD";
    messageElement.style.borderRadius = "4px";

    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll to the bottom
    chatInput.value = "";

    try {
      const response = await getBotResponse(message);
      let botMessage = "";

      const parsedBotResponse = parseWorkflowFromBot(response);

      if (isValidWorkflow(parsedBotResponse)) {
        botMessage = JSON.stringify(parsedBotResponse);
      } else {
        botMessage = response.responses.bot;
      }

      const botMessageElement = document.createElement("div");
      botMessageElement.innerText = botMessage;
      botMessageElement.style.marginBottom = "10px";
      botMessageElement.style.padding = "10px";
      botMessageElement.style.backgroundColor = "#DFE8EE";
      botMessageElement.style.borderRadius = "4px";
      botMessageElement.style.wordWrap = "break-word"; // Wrap long words
      botMessageElement.style.overflow = "hidden"; // Hide overflow text
      botMessageElement.style.textOverflow = "ellipsis"; // Show ellipsis if text overflows

      // Optionally, set a max-width if you want to control the width of the message box
      botMessageElement.style.maxWidth = "calc(100% - 20px)"; // Adjust max-width based on container width and padding

      chatMessages.appendChild(botMessageElement);
      chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll to the bottom

      loadGraphFromPrompt(parsedBotResponse);
    } catch (error) {
      console.error(error);
    } finally {
      canSendMessage = true;
      updateMessageBoxStatus(canSendMessage);
    }
  }
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
