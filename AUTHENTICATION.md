# 🔐 API Authentication Guide

This document explains how to use the authentication system for the Flight Booking Agent API.

## Overview

The API now requires authentication for all protected endpoints. Two authentication methods are supported:

1. **API Key Authentication** (Primary method)
2. **JWT Token Authentication** (Alternative method)

## 🔑 API Key Authentication

### Setup

1. **Set your API key** in your environment variables:
   ```bash
   export API_KEY=your_secret_api_key_here
   ```

2. **Update your `.env` file**:
   ```env
   API_KEY=your_secret_api_key_here
   ```

### Usage

Include the API key in the `X-API-Key` header with every request:

```bash
curl -X POST https://your-api-url.com/api/search-flights \
  -H "X-API-Key: your_secret_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "JFK",
    "to": "LAX",
    "date": "2025-02-15"
  }'
```

### JavaScript/Node.js Example

```javascript
const response = await fetch('https://your-api-url.com/api/search-flights', {
  method: 'POST',
  headers: {
    'X-API-Key': 'your_secret_api_key_here',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    from: 'JFK',
    to: 'LAX',
    date: '2025-02-15'
  })
});
```

### Python Example

```python
import requests

headers = {
    'X-API-Key': 'your_secret_api_key_here',
    'Content-Type': 'application/json'
}

data = {
    'from': 'JFK',
    'to': 'LAX',
    'date': '2025-02-15'
}

response = requests.post(
    'https://your-api-url.com/api/search-flights',
    headers=headers,
    json=data
)
```

## 🎫 JWT Token Authentication

### Setup

1. **Set your JWT secret** in your environment variables:
   ```bash
   export JWT_SECRET=your_jwt_secret_here
   ```

2. **Update your `.env` file**:
   ```env
   JWT_SECRET=your_jwt_secret_here
   ```

### Usage

Include the JWT token in the `Authorization` header:

```bash
curl -X POST https://your-api-url.com/api/search-flights \
  -H "Authorization: Bearer your_jwt_token_here" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "JFK",
    "to": "LAX",
    "date": "2025-02-15"
  }'
```

## 📍 Authentication Requirements

### **🔓 Public Endpoints (No Authentication Required)**

| Endpoint | Method | Description | Authentication Required |
|-----------|--------|-------------|------------------------|
| `/api/chatgpt` | POST | Natural language flight search | ❌ No |
| `/api/search-flights` | POST | Direct flight search | ❌ No |
| `/api/health` | GET | Health check | ❌ No |
| `/api/openapi` | GET | OpenAPI specification | ❌ No |

### **🔐 Protected Endpoints (OAuth 2.0 Required)**

| Endpoint | Method | Description | Authentication Required |
|-----------|--------|-------------|------------------------|
| `/api/book-flight` | POST | Book a flight | ✅ Yes (OAuth: book scope) |
| `/api/users/{id}` | GET | Get user profile | ✅ Yes (OAuth: read scope) |
| `/api/oauth/*` | Various | OAuth 2.0 endpoints | ✅ Yes (OAuth flow) |

## 🌐 Public Endpoints

The following endpoints are public (no authentication required):

| Endpoint | Method | Description | Authentication Required |
|-----------|--------|-------------|------------------------|
| `/api/health` | GET | Health check | ❌ No |
| `/api/openapi` | GET | OpenAPI specification | ❌ No |

## 🔒 Error Responses

### Missing API Key (401)

```json
{
  "error": "Unauthorized",
  "message": "API key is required for this endpoint",
  "code": "MISSING_API_KEY",
  "requestId": "req_1234567890_abc123"
}
```

### Invalid API Key (401)

```json
{
  "error": "Unauthorized",
  "message": "Invalid API key",
  "code": "INVALID_API_KEY",
  "requestId": "req_1234567890_abc123"
}
```

### Server Configuration Error (500)

```json
{
  "error": "Server Configuration Error",
  "message": "API authentication not properly configured",
  "code": "AUTH_NOT_CONFIGURED",
  "requestId": "req_1234567890_abc123"
}
```

## 🧪 Testing Authentication

Use the provided test script to verify your authentication setup:

```bash
# Set your API key
export API_KEY=your_secret_api_key_here

# Run the test suite
node test-auth.js
```

## 🔧 Environment Variables

Make sure these variables are set in your environment:

```env
# Required for API Key Authentication
API_KEY=your_secret_api_key_here

# Required for JWT Authentication
JWT_SECRET=your_jwt_secret_here

# Other required variables
OPENAI_API_KEY=your_openai_api_key_here
AMADEUS_CLIENT_ID=your_amadeus_client_id_here
AMADEUS_CLIENT_SECRET=your_amadeus_client_secret_here
```

## 🚀 Deployment

### Vercel

1. **Set environment variables** in your Vercel dashboard:
   - Go to your project settings
   - Navigate to Environment Variables
   - Add `API_KEY` with your secret value

2. **Deploy your changes**:
   ```bash
   git add .
   git commit -m "Add API authentication"
   git push origin main
   ```

### Local Development

1. **Copy the environment template**:
   ```bash
   cp env.example .env
   ```

2. **Fill in your values**:
   ```bash
   # Edit .env file with your actual values
   nano .env
   ```

3. **Start your server**:
   ```bash
   npm start
   ```

## 🔐 Security Best Practices

1. **Use strong, unique API keys** - Generate random, complex strings
2. **Never commit API keys** to version control
3. **Rotate API keys regularly** - Change them periodically
4. **Use HTTPS** in production - Always encrypt API communications
5. **Monitor API usage** - Track authentication attempts and failures
6. **Rate limiting** - Consider implementing rate limiting for additional security

## 🆘 Troubleshooting

### Common Issues

1. **"Missing API key" error**
   - Check that you're including the `X-API-Key` header
   - Verify the header name is exactly `X-API-Key`

2. **"Invalid API key" error**
   - Verify your API key matches the one in your environment
   - Check for extra spaces or characters

3. **"Authentication not configured" error**
   - Ensure `API_KEY` is set in your environment variables
   - Restart your server after setting environment variables

### Debug Mode

Enable debug logging by setting:

```bash
export DEBUG=auth:*
```

This will show detailed authentication logs.

## 📚 Additional Resources

- [OpenAPI Specification](./api/openapi.js) - Complete API documentation
- [Test Script](./test-auth.js) - Authentication testing examples
- [Environment Template](./env.example) - Configuration template

## 🤝 Support

If you encounter authentication issues:

1. Check the error response for specific error codes
2. Verify your environment variables are set correctly
3. Test with the provided test script
4. Check the server logs for authentication details

---

**Note**: This authentication system is designed to protect your API while maintaining ease of use. Always keep your API keys secure and never share them publicly.
