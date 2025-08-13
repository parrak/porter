#!/usr/bin/env node

// 🚀 Quick Deploy Script for Flight Booking Agent
// This script helps you deploy your app quickly

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Flight Booking Agent - Quick Deploy Helper');
console.log('=============================================\n');

// Check if we're in the right directory
if (!fs.existsSync('package.json')) {
    console.log('❌ Please run this script from the porter directory');
    process.exit(1);
}

// Check if .env exists
if (!fs.existsSync('.env')) {
    console.log('⚠️  .env file not found!');
    console.log('📝 Create a .env file with your API keys:');
    console.log('   OPENAI_API_KEY=your_openai_key');
    console.log('   AMADEUS_CLIENT_ID=your_amadeus_id');
    console.log('   AMADEUS_CLIENT_SECRET=your_amadeus_secret');
    console.log('');
}

// Check if git is initialized
if (!fs.existsSync('.git')) {
    console.log('📁 Initializing git repository...');
    try {
        execSync('git init', { stdio: 'inherit' });
        execSync('git add .', { stdio: 'inherit' });
        execSync('git commit -m "Initial commit for deployment"', { stdio: 'inherit' });
        console.log('✅ Git repository initialized\n');
    } catch (error) {
        console.log('❌ Failed to initialize git. Please do it manually:');
        console.log('   git init');
        console.log('   git add .');
        console.log('   git commit -m "Initial commit"');
        console.log('');
    }
}

// Check if render.yml exists
if (!fs.existsSync('render.yml')) {
    console.log('📝 Creating render.yml for automated deployment...');
    const renderConfig = `services:
  - type: web
    name: flight-booking-agent
    env: node
    plan: free
    buildCommand: npm install
    startCommand: node web-api.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
    healthCheckPath: /health
    autoDeploy: true`;
    
    fs.writeFileSync('render.yml', renderConfig);
    console.log('✅ render.yml created\n');
}

console.log('🎯 Ready to deploy! Choose your deployment method:\n');

console.log('1️⃣  Render (Recommended - Free, Easy)');
console.log('   - Go to https://render.com');
console.log('   - Sign up and connect your GitHub repo');
console.log('   - Create Web Service from your repo');
console.log('   - Deploy automatically with render.yml\n');

console.log('2️⃣  Railway (Alternative - Free tier available)');
console.log('   - Go to https://railway.app');
console.log('   - Connect your GitHub repo');
console.log('   - Deploy and get your URL\n');

console.log('3️⃣  Vercel (Alternative - Free tier available)');
console.log('   - Go to https://vercel.com');
console.log('   - Import your GitHub repo');
console.log('   - Deploy and get your URL\n');

console.log('📋 After deployment:');
console.log('1. Get your public URL (e.g., https://your-app.onrender.com)');
console.log('2. Update public/openapi.json with your new URL');
console.log('3. Test your API endpoints');
console.log('4. Create your Custom GPT in ChatGPT\n');

console.log('🧪 Test your API before deployment:');
console.log('   node test-api.js\n');

console.log('📚 For detailed instructions, see CUSTOM-GPT-SETUP.md');
console.log('🚀 Happy deploying!');

// Check if user wants to test the API
console.log('\n❓ Would you like to test your API now? (y/n)');
process.stdin.once('data', (data) => {
    const answer = data.toString().trim().toLowerCase();
    if (answer === 'y' || answer === 'yes') {
        console.log('\n🧪 Running API tests...');
        try {
            execSync('node test-api.js', { stdio: 'inherit' });
        } catch (error) {
            console.log('❌ API tests failed. Check your server is running.');
        }
    }
    process.exit(0);
});

