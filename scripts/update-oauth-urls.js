#!/usr/bin/env node

/**
 * Update OAuth URLs after successful Vercel deployment
 * This script updates OAUTH_TOKEN_URL and other OAuth-related URLs
 * to match the current deployment URL
 */

const fs = require('fs');
const path = require('path');

// Get the deployment URL from Vercel environment
const deploymentUrl = process.env.VERCEL_URL || process.env.VERCEL_BRANCH_URL;

if (!deploymentUrl) {
  console.log('❌ No Vercel deployment URL found. Skipping OAuth URL update.');
  process.exit(0);
}

const fullUrl = `https://${deploymentUrl}`;
console.log(`🚀 Updating OAuth URLs for deployment: ${fullUrl}`);

// Update environment variables
const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', 'env.example');

// OAuth configuration to update
const oauthConfig = {
  OAUTH_AUTHORIZATION_URL: `${fullUrl}/api/oauth/authorize`,
  OAUTH_TOKEN_URL: `${fullUrl}/api/oauth/token`,
  OAUTH_REDIRECT_URI: `https://chatgpt.com/aip/{g-YOUR-GPT-ID-HERE}/oauth/callback`
};

// Update .env file if it exists
if (fs.existsSync(envPath)) {
  console.log('📝 Updating .env file...');
  updateEnvFile(envPath, oauthConfig);
}

// Update env.example file
console.log('📝 Updating env.example file...');
updateEnvFile(envExamplePath, oauthConfig);

// Update OpenAPI specification
console.log('📝 Updating OpenAPI specification...');
updateOpenAPISpec(fullUrl);

console.log('✅ OAuth URLs updated successfully!');

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
    const openapiPath = path.join(__dirname, '..', 'api', 'openapi.js');
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
