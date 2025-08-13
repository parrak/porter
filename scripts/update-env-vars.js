#!/usr/bin/env node

/**
 * Update environment variables for new deployment
 * This script updates all environment-related files with new deployment URLs
 * Usage: node scripts/update-env-vars.js [deployment-url]
 */

const fs = require('fs');
const path = require('path');

// Get deployment URL from command line or use current
const deploymentUrl = process.argv[2] || 'porter-pxjgnn1nm-rakesh-paridas-projects.vercel.app';
const fullUrl = deploymentUrl.startsWith('http') ? deploymentUrl : `https://${deploymentUrl}`;

console.log(`🚀 Updating environment variables for deployment: ${fullUrl}`);

// Environment configuration to update
const envConfig = {
  // OAuth Configuration
  OAUTH_CLIENT_ID: 'porter-flight-booking',
  OAUTH_CLIENT_SECRET: 'your_oauth_client_secret_here',
  OAUTH_REDIRECT_URI: 'https://chatgpt.com/aip/{g-YOUR-GPT-ID-HERE}/oauth/callback',
  OAUTH_AUTHORIZATION_URL: `${fullUrl}/api/oauth/authorize`,
  OAUTH_TOKEN_URL: `${fullUrl}/api/oauth/token`,
  
  // API Configuration
  API_BASE_URL: fullUrl,
  API_HEALTH_URL: `${fullUrl}/api/health`,
  API_OPENAPI_URL: `${fullUrl}/api/openapi`,
  
  // Server Configuration
  PORT: '3000',
  NODE_ENV: 'production',
  
  // Deployment Info
  DEPLOYMENT_URL: deploymentUrl,
  DEPLOYMENT_TIMESTAMP: new Date().toISOString()
};

// Update env.example file
const envExamplePath = path.join(__dirname, '..', 'env.example');
updateEnvExample(envExamplePath, envConfig);

// Update or create .env file
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  console.log('📝 Updating .env file...');
  updateEnvFile(envPath, envConfig);
} else {
  console.log('⚠️  .env file not found, creating new one...');
  createEnvFile(envPath, envConfig);
}

// Update OpenAPI specification
const openapiPath = path.join(__dirname, '..', 'api', 'openapi.js');
updateOpenAPISpec(fullUrl);

// Update package.json scripts
updatePackageJson(deploymentUrl);

// Create deployment summary
createDeploymentSummary(deploymentUrl, fullUrl, envConfig);

console.log('✅ Environment variables updated successfully!');
console.log('');
console.log('📋 Updated Configuration:');
console.log(`  Deployment URL: ${deploymentUrl}`);
console.log(`  Full URL: ${fullUrl}`);
console.log(`  OAuth Authorization: ${envConfig.OAUTH_AUTHORIZATION_URL}`);
console.log(`  OAuth Token: ${envConfig.OAUTH_TOKEN_URL}`);
console.log(`  API Base: ${envConfig.API_BASE_URL}`);

console.log('');
console.log('🔧 Next Steps:');
console.log('1. Set your actual OAuth client secret in .env file');
console.log('2. Configure ChatGPT Builder with the URLs above');
console.log('3. Replace {g-YOUR-GPT-ID-HERE} with your actual GPT ID');
console.log('4. Deploy to Vercel - environment variables will auto-update');

function updateEnvExample(filePath, config) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Update OAuth configuration
    const oauthKeys = ['OAUTH_CLIENT_ID', 'OAUTH_CLIENT_SECRET', 'OAUTH_REDIRECT_URI', 'OAUTH_AUTHORIZATION_URL', 'OAUTH_TOKEN_URL'];
    oauthKeys.forEach(key => {
      const regex = new RegExp(`^${key}=.*`, 'm');
      if (regex.test(content)) {
        content = content.replace(regex, `${key}=${config[key]}`);
        console.log(`  ✅ Updated ${key}=${config[key]}`);
      }
    });
    
    // Add new environment variables if they don't exist
    const newVars = ['API_BASE_URL', 'API_HEALTH_URL', 'API_OPENAPI_URL', 'DEPLOYMENT_URL'];
    let addedNewVars = false;
    newVars.forEach(key => {
      const regex = new RegExp(`^${key}=.*`, 'm');
      if (!regex.test(content) && !addedNewVars) {
        content += `\n# API Configuration\n`;
        content += `${key}=${config[key]}\n`;
        console.log(`  ➕ Added ${key}=${config[key]}`);
        addedNewVars = true;
      }
    });
    
    fs.writeFileSync(filePath, content);
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
  }
}

function updateEnvFile(filePath, config) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Update each configuration
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
    content += `# Auto-generated for deployment: ${config.DEPLOYMENT_TIMESTAMP}\n`;
    content += `# Deployment URL: ${config.DEPLOYMENT_URL}\n\n`;
    
    // Add OAuth configuration
    content += `# OAuth 2.0 Configuration\n`;
    content += `OAUTH_CLIENT_ID=${config.OAUTH_CLIENT_ID}\n`;
    content += `OAUTH_CLIENT_SECRET=${config.OAUTH_CLIENT_SECRET}\n`;
    content += `OAUTH_REDIRECT_URI=${config.OAUTH_REDIRECT_URI}\n`;
    content += `OAUTH_AUTHORIZATION_URL=${config.OAUTH_AUTHORIZATION_URL}\n`;
    content += `OAUTH_TOKEN_URL=${config.OAUTH_TOKEN_URL}\n\n`;
    
    // Add API configuration
    content += `# API Configuration\n`;
    content += `API_BASE_URL=${config.API_BASE_URL}\n`;
    content += `API_HEALTH_URL=${config.API_HEALTH_URL}\n`;
    content += `API_OPENAPI_URL=${config.API_OPENAPI_URL}\n\n`;
    
    // Add other required environment variables
    content += `# OpenAI API Configuration\n`;
    content += `OPENAI_API_KEY=your_openai_api_key_here\n\n`;
    content += `# Amadeus API Configuration\n`;
    content += `AMADEUS_CLIENT_ID=your_amadeus_client_id_here\n`;
    content += `AMADEUS_CLIENT_SECRET=your_amadeus_client_secret_here\n\n`;
    content += `# Server Configuration\n`;
    content += `PORT=${config.PORT}\n`;
    content += `NODE_ENV=${config.NODE_ENV}\n`;
    content += `DEPLOYMENT_URL=${config.DEPLOYMENT_URL}\n`;
    content += `DEPLOYMENT_TIMESTAMP=${config.DEPLOYMENT_TIMESTAMP}\n`;
    
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

function createDeploymentSummary(deploymentUrl, fullUrl, config) {
  try {
    const summaryPath = path.join(__dirname, '..', 'DEPLOYMENT_SUMMARY.md');
    const content = `# Deployment Summary

## 🚀 Latest Deployment
- **Deployment URL**: ${deploymentUrl}
- **Full URL**: ${fullUrl}
- **Timestamp**: ${config.DEPLOYMENT_TIMESTAMP}

## 🔧 OAuth Configuration
- **Client ID**: ${config.OAUTH_CLIENT_ID}
- **Authorization URL**: ${config.OAUTH_AUTHORIZATION_URL}
- **Token URL**: ${config.OAUTH_TOKEN_URL}
- **Redirect URI**: ${config.OAUTH_REDIRECT_URI}

## 📡 API Endpoints
- **Health Check**: ${config.API_HEALTH_URL}
- **OpenAPI Spec**: ${config.API_OPENAPI_URL}
- **ChatGPT**: ${fullUrl}/api/chatgpt
- **Flight Search**: ${fullUrl}/api/search-flights
- **Flight Booking**: ${fullUrl}/api/book-flight

## 🎯 ChatGPT Action Configuration
\`\`\`
Action URL: ${config.API_OPENAPI_URL}
Client ID: ${config.OAUTH_CLIENT_ID}
Authorization URL: ${config.OAUTH_AUTHORIZATION_URL}
Token URL: ${config.OAUTH_TOKEN_URL}
Redirect URI: ${config.OAUTH_REDIRECT_URI}
\`\`\`

## 📝 Next Steps
1. Set your actual OAuth client secret in .env file
2. Configure ChatGPT Builder with the URLs above
3. Replace {g-YOUR-GPT-ID-HERE} with your actual GPT ID
4. Test the OAuth flow and flight search endpoints

---
*Auto-generated on ${config.DEPLOYMENT_TIMESTAMP}*
`;
    
    fs.writeFileSync(summaryPath, content);
    console.log(`  ✅ Created deployment summary: DEPLOYMENT_SUMMARY.md`);
  } catch (error) {
    console.error(`❌ Error creating deployment summary:`, error.message);
  }
}
