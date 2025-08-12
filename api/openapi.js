// OpenAPI specification endpoint for Vercel
const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  try {
    // Always serve the simplified, GPT-5 compatible version
    const openapiPath = path.join(__dirname, '../public/openapi-simple.json');
    
    if (!fs.existsSync(openapiPath)) {
      return res.status(404).json({
        error: 'OpenAPI specification not found'
      });
    }
    
    const openapiContent = fs.readFileSync(openapiPath, 'utf8');
    
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(openapiContent);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to load OpenAPI specification',
      message: error.message
    });
  }
};
