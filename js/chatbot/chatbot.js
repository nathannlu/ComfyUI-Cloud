import { nimbus } from "../resource/index.js";

export async function getBotResponse(message) {
  try {
    const data = await nimbus.chatbot.sendMessage({
      message: message,
      origin: "ComfyUI Cloud Chat",
    });

    return data;
  } catch (e) {
    throw new Error(e.message);
  }
}

export function isValidWorkflow(workflow) {
  return workflow && workflow.nodes && workflow.edges;
}

export function parseWorkflowFromBot(response) {
  const cleanedResponse = response.responses.bot
    .replace(/^\s*```json\s*/, "")
    .replace(/\s*```\s*$/, "");

  try {
    return JSON.parse(cleanedResponse);
  } catch (error) {
    console.error("Failed to parse JSON:", error);
    return cleanedResponse;
  }
}
