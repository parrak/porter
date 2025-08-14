#!/bin/bash

# Porter Web App Deployment Script
echo "🚀 Deploying Porter Web App..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the web-app directory."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the application
echo "🔨 Building the application..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    
    # Deploy to Vercel (if available)
    if command -v vercel &> /dev/null; then
        echo "🚀 Deploying to Vercel..."
        vercel --prod
    else
        echo "⚠️  Vercel CLI not found. You can deploy manually:"
        echo "   1. Install Vercel CLI: npm i -g vercel"
        echo "   2. Run: vercel --prod"
        echo ""
        echo "   Or deploy to other platforms:"
        echo "   - Netlify: netlify deploy --prod"
        echo "   - Railway: git push railway main"
        echo "   - Render: Connect your GitHub repo"
    fi
else
    echo "❌ Build failed. Please check the errors above."
    exit 1
fi

echo "🎉 Deployment script completed!"
