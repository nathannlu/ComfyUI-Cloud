/* eslint-disable no-undef */
const express = require('express');
const bodyParser = require('body-parser');
const ngrok = require('ngrok');

const app = express();
const port = 3000; // Change to whatever port you are comfortable with

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Example POST endpoint to receive data
app.post('/api/receive-data', (req, res) => {
  console.log('Received data:', req.body);

  res.json({ message: 'Data received successfully' });
});

// Start ngrok and create a tunnel
(async () => {
  const ngrokUrl = await ngrok.connect({
    addr: port,
    region: 'us',
  });
  console.log(`Ngrok tunnel running at ${ngrokUrl}`);

  // Start the server
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
})();
