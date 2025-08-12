#!/bin/bash

# 🚀 Render Deployment Script for Flight Booking Agent
# This script helps you deploy your app to Render

echo "🚀 Flight Booking Agent - Render Deployment Helper"
echo "=================================================="

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Git repository not found. Please initialize git first:"
    echo "   git init"
    echo "   git add ."
    echo "   git commit -m 'Initial commit'"
    exit 1
fi

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found. Please make sure you're in the right directory."
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. You'll need to create one with your API keys:"
    echo "   OPENAI_API_KEY=your_openai_key"
    echo "   AMADEUS_CLIENT_ID=your_amadeus_id"
    echo "   AMADEUS_CLIENT_SECRET=your_amadeus_secret"
    echo ""
fi

echo "✅ Prerequisites check passed!"
echo ""

echo "📋 Next Steps:"
echo "1. Go to https://render.com and create an account"
echo "2. Connect your GitHub repository"
echo "3. Create a new Web Service"
echo "4. Use these settings:"
echo "   - Build Command: npm install"
echo "   - Start Command: node web-api.js"
echo "   - Environment Variables: Add your .env variables"
echo "5. Deploy and get your public URL"
echo ""

echo "🔧 After deployment, update your openapi.json with the new URL:"
echo "   servers[0].url = 'https://your-app.onrender.com'"
echo ""

echo "🤖 Then create your Custom GPT:"
echo "   - Go to chat.openai.com"
echo "   - Click Explore → Create a GPT"
echo "   - Add your OpenAPI spec URL as an Action"
echo ""

echo "🎯 Ready to deploy? Go to https://render.com now!"
echo ""

# Check if render.yml exists
if [ -f "render.yml" ]; then
    echo "✅ render.yml found - you can use this for automated deployment"
else
    echo "💡 Tip: Create a render.yml file for automated deployments"
fi

echo ""
echo "📚 For detailed instructions, see CUSTOM-GPT-SETUP.md"
