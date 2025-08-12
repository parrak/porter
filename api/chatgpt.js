// ChatGPT API endpoint for Vercel
const axios = require('axios');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, userId } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // For now, return a mock response since we can't access the full web-api.js
    // In production, you'd want to integrate with your actual flight search logic
    const mockResponse = {
      success: true,
      message: `I received your flight request: "${message}". This is a test response from your deployed API.`,
      intent: {
        from: "SEA",
        to: "YVR", 
        date: "2025-01-15",
        passengers: 1,
        class: "economy"
      },
      flights: 1
    };

    res.status(200).json(mockResponse);
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};
