#!/usr/bin/env node

/**
 * Manually update OAuth URLs for current deployment
 * Usage: node scripts/update-current-oauth.js [deployment-url]
 */

const fs = require('fs');
const path = require('path');

// Get deployment URL from command line or use current
const deploymentUrl = process.argv[2] || 'porter-jm0igivgv-rakesh-paridas-projects.vercel.app';
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

// Update OpenAPI specification
const openapiPath = path.join(__dirname, '..', 'api', 'openapi.js');
updateOpenAPISpec(fullUrl);

console.log('✅ OAuth URLs updated successfully!');
console.log('');
console.log('📋 Updated URLs:');
Object.entries(oauthConfig).forEach(([key, value]) => {
  console.log(`  ${key}: ${value}`);
});

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
        content += `\n${key}=${value}`;
        console.log(`  ➕ Added ${key}=${value}`);
      }
    });
    
    fs.writeFileSync(filePath, content);
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
  }
}

function updateOpenAPISpec(deploymentUrl) {
  try {
    let content = fs.readFileSync(openapiPath, 'utf8');
    
    // Update OAuth URLs in OpenAPI spec
    const updates = [
      {
        search: /authorizationUrl.*https:\/\/chatgpt\.com\/aip\/\{g-YOUR-GPT-ID-HERE\}\/oauth\/authorize/,
        replace: `authorizationUrl: "${deploymentUrl}/api/oauth/authorize"`
      },
      {
        search: /tokenUrl.*https:\/\/your-api-domain\.com\/api\/oauth\/token/,
        replace: `tokenUrl: "${deploymentUrl}/api/oauth/token"`
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
