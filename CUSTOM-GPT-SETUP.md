# 🚀 Custom GPT Setup Guide for Flight Booking Agent

This guide will walk you through setting up your Flight Booking Agent as a Custom GPT in ChatGPT. This is the fastest way to get your agent working with real users!

## 📋 Prerequisites

- ✅ Your server is running (you've confirmed this)
- ✅ OpenAI API key configured
- ✅ Amadeus API credentials configured
- ✅ Server accessible from the internet (for production)

## 🎯 Step 1: Deploy Your API (if not already done)

Your server is currently running locally. For Custom GPT to work, you need to deploy it to a public URL.

### Option A: Quick Deploy with Render (Recommended for testing)

1. **Create Render Account**: Go to [render.com](https://render.com) and sign up
2. **Connect GitHub**: Connect your repository
3. **Create Web Service**: 
   - Choose your repository
   - Build Command: `npm install`
   - Start Command: `node web-api.js`
   - Environment Variables: Add your `.env` variables
4. **Deploy**: Click deploy and wait for it to complete
5. **Get URL**: Copy the provided URL (e.g., `https://your-app.onrender.com`)

### Option B: Deploy with Railway

1. Go to [railway.app](https://railway.app)
2. Connect your GitHub repo
3. Deploy and get your public URL

### Option C: Deploy with Vercel

1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repo
3. Deploy and get your public URL

## 🔧 Step 2: Update OpenAPI Specification

Once deployed, update your `public/openapi.json` file with your new public URL:

```json
{
  "servers": [
    {
      "url": "https://your-actual-deployed-url.com",
      "description": "Production server"
    }
  ]
}
```

## 🤖 Step 3: Create Custom GPT

1. **Open ChatGPT**: Go to [chat.openai.com](https://chat.openai.com)
2. **Click "Explore"**: In the left sidebar
3. **Click "Create a GPT"**: Green button
4. **Configure Your GPT**:

### Basic Configuration
- **Name**: "Flight Booking Agent" or "Travel Assistant"
- **Description**: "Your personal AI travel agent that can search for real flights, remember your preferences, and help you plan trips."

### Instructions (Copy this exactly)
```
You are a Flight Booking Agent, an AI travel assistant that helps users find and book flights. You have access to real flight data through the Amadeus API.

Your capabilities:
- Search for real flights using departure/destination cities and dates
- Remember user preferences and travel history
- Provide personalized travel recommendations
- Help with travel planning and itineraries

When users ask about flights:
1. Extract flight details from their request
2. Use the search-flights API to find real options
3. Present results clearly with prices, times, and stops
4. Offer to help with booking or provide additional information

Always be helpful, professional, and accurate. If you can't find flights, suggest alternatives or help users refine their search.

IMPORTANT: You have access to real flight data, so always provide accurate, current information.
```

### Knowledge (Optional)
- Upload any travel guides, airline information, or travel tips you want the GPT to know

### Actions
- **Click "Add Action"**
- **Import from URL**: Paste your OpenAPI spec URL: `https://your-deployed-url.com/openapi.json`
- **Test the connection**: Click "Test" to verify it works

## 🧪 Step 4: Test Your Custom GPT

1. **Save and Test**: Click "Save" and test your GPT
2. **Try these test queries**:
   - "I need a flight from Seattle to Vancouver tomorrow"
   - "What flights are available from JFK to LAX next Friday?"
   - "Can you find me a business class flight from London to Tokyo?"

## 🚀 Step 5: Share Your Custom GPT

### For Testing (Free)
- Share the link with friends/family
- They can use it immediately

### For Production (Paid)
- Users need ChatGPT Plus subscription
- They can access your GPT through the link

## 🔍 Troubleshooting

### Common Issues:

1. **"Action not found" error**
   - Check your OpenAPI spec URL is accessible
   - Verify your server is running and deployed

2. **"Failed to fetch" errors**
   - Check your server logs
   - Verify CORS is enabled
   - Check your API endpoints are working

3. **Flight search not working**
   - Verify Amadeus API credentials
   - Check server logs for API errors
   - Test endpoints manually

### Testing Your API Manually:

```bash
# Test health endpoint
curl https://your-deployed-url.com/health

# Test flight search
curl -X POST https://your-deployed-url.com/api/search-flights \
  -H "Content-Type: application/json" \
  -d '{"from":"SEA","to":"YVR","date":"2025-01-15"}'
```

## 📱 Next Steps

Once your Custom GPT is working:

1. **Monitor Usage**: Check your server logs and analytics
2. **Improve Responses**: Refine the GPT instructions based on user feedback
3. **Add Features**: Enhance your API with more travel services
4. **Scale Up**: Consider moving to ChatGPT Plugin (Option 1) for wider distribution

## 🎉 Congratulations!

You now have a working AI travel agent that users can access through ChatGPT! Your agent can:
- Search real flights
- Remember user preferences
- Provide personalized recommendations
- Help with travel planning

Users can simply chat with your GPT and get real flight information without leaving ChatGPT!

---

**Need Help?** Check your server logs and the troubleshooting section above. Most issues are related to deployment or API configuration.
