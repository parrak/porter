// Main API endpoint for Vercel - serves the HTML interface
module.exports = (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Flight Booking Agent API</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .endpoint { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px; }
            .method { background: #007bff; color: white; padding: 2px 8px; border-radius: 3px; font-size: 12px; }
            .url { font-family: monospace; background: #e9ecef; padding: 5px; border-radius: 3px; }
        </style>
    </head>
    <body>
        <h1>✈️ Flight Booking Agent API</h1>
        <p>This API provides endpoints for ChatGPT to interact with your flight booking agent.</p>
        
        <h2>🔍 Available Endpoints</h2>
        
        <div class="endpoint">
            <span class="method">GET</span> <span class="url">/api/health</span>
            <p>Health check endpoint</p>
        </div>
        
        <div class="endpoint">
            <span class="method">GET</span> <span class="url">/api/openapi</span>
            <p>OpenAPI specification</p>
        </div>
        
        <div class="endpoint">
            <span class="method">POST</span> <span class="url">/api/search-flights</span>
            <p>Search for flights with parameters: from, to, date, passengers, travelClass, userId</p>
        </div>
        
        <div class="endpoint">
            <span class="method">POST</span> <span class="url">/api/chatgpt</span>
            <p>Main ChatGPT interaction endpoint with message and userId</p>
        </div>
        
        <div class="endpoint">
            <span class="method">GET</span> <span class="url">/api/profile/:userId</span>
            <p>Get user profile</p>
        </div>
        
        <div class="endpoint">
            <span class="method">GET</span> <span class="url">/api/suggestions/:userId</span>
            <p>Get smart suggestions for user</p>
        </div>
        
        <h2>🚀 ChatGPT Integration</h2>
        <p>To use this with ChatGPT:</p>
        <ol>
            <li>This API is now deployed on Vercel</li>
            <li>Create a Custom GPT in ChatGPT</li>
            <li>Add this API URL to your GPT's configuration</li>
            <li>Users can now interact with your flight booking agent through ChatGPT!</li>
        </ol>
        
        <h2>📝 Example Usage</h2>
        <p>Send a POST request to <code>/api/chatgpt</code> with:</p>
        <pre>{
  "message": "I need a flight from Seattle to Vancouver tomorrow",
  "userId": "user_123"
}</pre>
        
        <h2>🔗 API Base URL</h2>
        <p><code>${req.headers.host}</code></p>
    </body>
    </html>
  `);
};
