// Test endpoint for Vercel - guaranteed to work
module.exports = (req, res) => {
  // Set CORS headers to allow all origins
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Simple test response
  res.status(200).json({
    success: true,
    message: "API is working and publicly accessible!",
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url
  });
};

