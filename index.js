const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  try {
    const url = req.url;
    
    // Handle favicon requests
    if (url === '/favicon.png') {
      try {
        // Try to read from public directory first (for local development)
        const faviconPath = path.join(__dirname, 'public', 'favicon.png');
        const faviconBuffer = fs.readFileSync(faviconPath);
        
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
        res.status(200).send(faviconBuffer);
        return;
      } catch (error) {
        // If file doesn't exist, return 404
        res.status(404).send('Favicon not found');
        return;
      }
    }
    
    // Handle root path - serve the HTML
    if (url === '/') {
      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Porter Travel - AI-Powered Travel Planning</title>
    
    <!-- Favicon -->
    <link rel="icon" type="image/png" href="/favicon.png">
    <link rel="shortcut icon" type="image/png" href="/favicon.png">
    
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f8fafc;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 1rem 2rem;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .logo {
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2rem;
            font-weight: bold;
            margin-bottom: 0.5rem;
        }
        
        .logo img {
            width: 40px;
            height: 40px;
            margin-right: 12px;
            border-radius: 8px;
        }
        
        .tagline {
            font-size: 1rem;
            opacity: 0.9;
        }
        
        .options {
            background: white;
            padding: 1rem 2rem;
            text-align: center;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .option-button {
            background: #667eea;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 6px;
            cursor: pointer;
            font-size: 1rem;
            margin: 0 0.5rem;
            transition: background 0.3s ease;
        }
        
        .option-button:hover {
            background: #5a6fd8;
        }
        
        .option-button.secondary {
            background: transparent;
            color: #667eea;
            border: 2px solid #667eea;
        }
        
        .option-button.secondary:hover {
            background: #667eea;
            color: white;
        }
        
        .webapp-container {
            width: 100%;
            height: calc(100vh - 180px);
            border: none;
            background: white;
        }
        
        .loading {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 200px;
            font-size: 1.2rem;
            color: #666;
        }
        
        .spinner {
            border: 3px solid #f3f3f3;
            border-top: 3px solid #667eea;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            animation: spin 1s linear infinite;
            margin-right: 1rem;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .error-message {
            text-align: center;
            padding: 2rem;
            color: #666;
        }
        
        .retry-button {
            background: #667eea;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 6px;
            cursor: pointer;
            font-size: 1rem;
            margin-top: 1rem;
        }
        
        .retry-button:hover {
            background: #5a6fd8;
        }
        
        .hidden {
            display: none !important;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">
            <img src="/favicon.png" alt="Porter Travel Logo">
            ✈️ Porter Travel
        </div>
        <div class="tagline">AI-Powered Travel Planning & Flight Search</div>
    </div>
    
    <div class="options">
        <button class="option-button" onclick="showEmbedded()">Use Embedded App</button>
        <button class="option-button secondary" onclick="openDirect()">Open in New Tab</button>
    </div>
    
    <div id="loading" class="loading">
        <div class="spinner"></div>
        Loading your AI travel assistant...
    </div>
    
    <div id="error" class="error-message hidden">
        <h3>Unable to load the travel planner</h3>
        <p>The web app is currently unavailable. Please try again later.</p>
        <button class="retry-button" onclick="loadWebApp()">Retry</button>
    </div>
    
    <iframe 
        id="webapp"
        class="webapp-container"
        src="https://porter-g0ay7qcvw-rakesh-paridas-projects.vercel.app"
        class="hidden"
        onload="webAppLoaded()"
        onerror="webAppError()">
    </iframe>
    
    <script>
        function showEmbedded() {
            document.getElementById('loading').style.display = 'flex';
            document.getElementById('error').classList.add('hidden');
            document.getElementById('webapp').classList.remove('hidden');
        }
        
        function openDirect() {
            window.open('https://porter-g0ay7qcvw-rakesh-paridas-projects.vercel.app', '_blank');
        }
        
        function webAppLoaded() {
            document.getElementById('loading').classList.add('hidden');
        }
        
        function webAppError() {
            document.getElementById('loading').classList.add('hidden');
            document.getElementById('error').classList.remove('hidden');
        }
        
        function loadWebApp() {
            document.getElementById('error').classList.add('hidden');
            document.getElementById('loading').classList.remove('hidden');
            
            // Reload the iframe
            const iframe = document.getElementById('webapp');
            iframe.src = iframe.src;
        }
        
        // Show embedded app by default
        showEmbedded();
        
        // Fallback: if iframe doesn't load within 10 seconds, show error
        setTimeout(() => {
            if (!document.getElementById('loading').classList.contains('hidden')) {
                webAppError();
            }
        }, 10000);
    </script>
</body>
</html>`;
      
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Cache-Control', 'no-cache');
      res.status(200).send(htmlContent);
      return;
    }
    
    // For any other path, return 404
    res.status(404).send('Not Found');
    
  } catch (error) {
    console.error('Error serving content:', error);
    res.status(500).send('Internal Server Error');
  }
};
