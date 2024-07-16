// import { endpoint } from "../constants";

const endpoint = 'http://localhost:4000/'; // Switch to live  as needed

export async function getBotResponse(message) {
    // TODO: add auth 
    console.log("calling the gpt bot woith message", message);
    try {
        const response = await fetch(`${endpoint}chat/send-message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: message, origin: "ComfyUI Chat" })
        });

        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }

        console.log('response', response);

        const responseData = await response.json();
        
        return responseData;
    } catch (error) {
        console.error('There was a problem with the fetch operation:', error);
        throw error;
    }
}

