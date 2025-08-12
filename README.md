# Flight Booking Agent

A real-time flight search and booking agent using Amadeus API and ChatGPT integration.

## Features

- Real-time flight search using Amadeus API
- ChatGPT integration for natural language queries
- User profile management
- Smart travel suggestions
- Custom GPT support

## Quick Start

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see `env.example`)
4. Run the server: `npm start`

## Deployment

This application is configured for deployment on Vercel with Custom GPT support.

**Live URL**: https://porter-gcdnzaqo6-rakesh-paridas-projects.vercel.app/
**OpenAPI Spec**: https://porter-gcdnzaqo6-rakesh-paridas-projects.vercel.app/openapi.json

**Last updated**: 2025-01-27 15:30 UTC

## API Endpoints

- `GET /` - Main interface
- `GET /health` - Health check
- `POST /api/search-flights` - Flight search
- `POST /api/chatgpt` - ChatGPT integration
- `GET /api/profile/:userId` - User profile
- `GET /api/suggestions/:userId` - Travel suggestions

## Environment Variables

- `OPENAI_API_KEY` - Your OpenAI API key
- `AMADEUS_CLIENT_ID` - Your Amadeus client ID
- `AMADEUS_CLIENT_SECRET` - Your Amadeus client secret
- `PORT` - Server port (default: 3000) 