// Health check endpoint for Vercel
module.exports = (req, res) => {
  // Set CORS headers to allow all origins
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Flight Booking Agent API',
    version: '1.0.0'
  });
};
