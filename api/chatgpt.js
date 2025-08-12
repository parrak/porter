// ChatGPT API endpoint for Vercel
module.exports = async (req, res) => {
  // Set CORS headers to allow all origins
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, userId } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Mock flight search response for testing
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
