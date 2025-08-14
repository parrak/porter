const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  try {
    // Read the HTML file
    const htmlPath = path.join(__dirname, 'public', 'index.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    // Set headers
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-cache');
    
    // Send the HTML content
    res.status(200).send(htmlContent);
  } catch (error) {
    console.error('Error serving index.html:', error);
    res.status(500).send('Internal Server Error');
  }
};
