#!/usr/bin/env node

/**
 * Manually update OAuth URLs for current deployment
 * Usage: node scripts/update-current-oauth.js [deployment-url]
 */

const fs = require('fs');
const path = require('path');

// Get deployment URL from command line or use current
const deploymentUrl = process.argv[2] || 'porter-pxjgnn1nm-rakesh-paridas-projects.vercel.app';
const fullUrl = deploymentUrl.startsWith('http') ? deploymentUrl : `https://${deploymentUrl}`;

console.log(`🚀 Updating OAuth URLs for deployment: ${fullUrl}`);

// OAuth configuration to update
const oauthConfig = {
  OAUTH_AUTHORIZATION_URL: `${fullUrl}/api/oauth/authorize`,
  OAUTH_TOKEN_URL: `${fullUrl}/api/oauth/token`,
  OAUTH_REDIRECT_URI: `https://chatgpt.com/aip/{g-YOUR-GPT-ID-HERE}/oauth/callback`
};

// Update env.example file
const envExamplePath = path.join(__dirname, '..', 'env.example');
updateEnvFile(envExamplePath, oauthConfig);

// Update or create .env file
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  console.log('📝 Updating .env file...');
  updateEnvFile(envPath, oauthConfig);
} else {
  console.log('⚠️  .env file not found, creating new one...');
  createEnvFile(envPath, oauthConfig);
}

// Update OpenAPI specification
const openapiPath = path.join(__dirname, '..', 'api', 'openapi.js');
updateOpenAPISpec(fullUrl);

// Update package.json scripts
updatePackageJson(deploymentUrl);

console.log('✅ OAuth URLs updated successfully!');
console.log('');
console.log('📋 Updated URLs:');
Object.entries(oauthConfig).forEach(([key, value]) => {
  console.log(`  ${key}: ${value}`);
});

console.log('');
console.log('🔧 Next Steps:');
console.log('1. Set your actual OAuth client secret in .env file');
console.log('2. Configure ChatGPT Builder with the URLs above');
console.log('3. Replace {g-YOUR-GPT-ID-HERE} with your actual GPT ID');

function updateEnvFile(filePath, config) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Update each OAuth configuration
    Object.entries(config).forEach(([key, value]) => {
      const regex = new RegExp(`^${key}=.*`, 'm');
      if (regex.test(content)) {
        content = content.replace(regex, `${key}=${value}`);
        console.log(`  ✅ Updated ${key}=${value}`);
      } else {
        // Add if not exists
        if (content && !content.endsWith('\n')) {
          content += '\n';
        }
        content += `${key}=${value}\n`;
        console.log(`  ➕ Added ${key}=${value}`);
      }
    });
    
    fs.writeFileSync(filePath, content);
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
  }
}

function createEnvFile(filePath, config) {
  try {
    let content = `# Flight Booking Agent Environment Variables\n`;
    content += `# Auto-generated for deployment: ${new Date().toISOString()}\n`;
    content += `# Deployment URL: ${fullUrl}\n\n`;
    
    // Add OAuth configuration
    Object.entries(config).forEach(([key, value]) => {
      content += `${key}=${value}\n`;
    });
    
    // Add other required environment variables
    content += `\n# OAuth Client Secret (REQUIRED - Generate a secure random string)\n`;
    content += `OAUTH_CLIENT_SECRET=your_oauth_client_secret_here\n\n`;
    content += `# OpenAI API Configuration\n`;
    content += `OPENAI_API_KEY=your_openai_api_key_here\n\n`;
    content += `# Amadeus API Configuration\n`;
    content += `AMADEUS_CLIENT_ID=your_amadeus_client_id_here\n`;
    content += `AMADEUS_CLIENT_SECRET=your_amadeus_client_secret_here\n\n`;
    content += `# Server Configuration\n`;
    content += `PORT=3000\n`;
    content += `NODE_ENV=production\n`;
    
    fs.writeFileSync(filePath, content);
    console.log(`  ✅ Created new .env file with deployment URLs`);
  } catch (error) {
    console.error(`❌ Error creating ${filePath}:`, error.message);
  }
}

function updateOpenAPISpec(deploymentUrl) {
  try {
    let content = fs.readFileSync(openapiPath, 'utf8');
    
    // Update OAuth URLs in OpenAPI spec
    const updates = [
      {
        search: /"authorizationUrl":\s*"[^"]*"/,
        replace: `"authorizationUrl": "${deploymentUrl}/api/oauth/authorize"`
      },
      {
        search: /"tokenUrl":\s*"[^"]*"/,
        replace: `"tokenUrl": "${deploymentUrl}/api/oauth/token"`
      }
    ];
    
    updates.forEach(({ search, replace }) => {
      if (search.test(content)) {
        content = content.replace(search, replace);
        console.log(`  ✅ Updated OpenAPI OAuth URL`);
      }
    });
    
    fs.writeFileSync(openapiPath, content);
  } catch (error) {
    console.error(`❌ Error updating OpenAPI spec:`, error.message);
  }
}

function updatePackageJson(deploymentUrl) {
  try {
    const packagePath = path.join(__dirname, '..', 'package.json');
    let content = fs.readFileSync(packagePath, 'utf8');
    
    // Update update-current script with new deployment URL
    const updateScriptRegex = /"update-current":\s*"node scripts\/update-current-oauth\.js[^"]*"/;
    const newUpdateScript = `"update-current": "node scripts/update-current-oauth.js ${deploymentUrl}"`;
    
    if (updateScriptRegex.test(content)) {
      content = content.replace(updateScriptRegex, newUpdateScript);
      console.log(`  ✅ Updated package.json update-current script`);
    }
    
    fs.writeFileSync(packagePath, content);
  } catch (error) {
    console.error(`❌ Error updating package.json:`, error.message);
  }
}
