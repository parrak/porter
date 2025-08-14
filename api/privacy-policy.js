// Privacy Policy API endpoint for Vercel
module.exports = (req, res) => {
  // Set CORS headers to allow all origins
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Read the privacy policy HTML file
    const fs = require('fs');
    const path = require('path');
    
    const privacyPolicyPath = path.join(__dirname, '..', 'privacy-policy.html');
    
    if (!fs.existsSync(privacyPolicyPath)) {
      console.error('Privacy policy file not found');
      return res.status(404).json({ error: 'Privacy policy not found' });
    }
    
    const privacyPolicyContent = fs.readFileSync(privacyPolicyPath, 'utf8');
    
    // Set appropriate headers for HTML content
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    
    res.status(200).send(privacyPolicyContent);
    
  } catch (error) {
    console.error('Error serving privacy policy:', error);
    res.status(500).json({
      error: 'Failed to serve privacy policy',
      message: error.message
    });
  }
};
