# 🔐 OAuth 2.0 Setup Guide for ChatGPT Actions

This guide explains how to set up OAuth 2.0 authentication for your Flight Booking Agent API to work with ChatGPT Actions.

## 🎯 **Overview**

OAuth 2.0 enables end-user authentication, allowing ChatGPT to:
- **Identify individual users** accessing your API
- **Access user-specific data** (preferences, booking history)
- **Provide personalized responses** based on user context
- **Maintain user sessions** across conversations

## 🚀 **Setup Steps**

### **Step 1: Configure OAuth in ChatGPT Builder**

1. **Go to ChatGPT Builder** → **Actions** → **Authentication**
2. **Select "OAuth"** (recommended for end-user identity)
3. **Fill in the OAuth configuration:**

```
Authorization URL: https://your-api-domain.com/api/oauth/authorize
Token URL: https://your-api-domain.com/api/oauth/token
Client ID: porter-flight-booking
Client Secret: your_oauth_client_secret_here
Scopes: read write book
```

4. **Save your GPT** to get the GPT ID from the URL bar

### **Step 2: Update Environment Variables**

Set these environment variables in your deployment:

```bash
# OAuth 2.0 Configuration
OAUTH_CLIENT_ID=porter-flight-booking
OAUTH_CLIENT_SECRET=your_secure_client_secret_here
OAUTH_REDIRECT_URI=https://chatgpt.com/aip/{g-YOUR-GPT-ID-HERE}/oauth/callback
OAUTH_AUTHORIZATION_URL=https://your-api-domain.com/api/oauth/authorize
OAUTH_TOKEN_URL=https://your-api-domain.com/api/oauth/token
```

**Replace placeholders:**
- `{g-YOUR-GPT-ID-HERE}` → Your actual GPT ID from ChatGPT Builder
- `your-api-domain.com` → Your deployed API domain
- `your_secure_client_secret_here` → A secure random string

### **Step 3: Deploy OAuth Endpoints**

The OAuth endpoints are automatically deployed with your API:

- **`/api/oauth/authorize`** - Initiates OAuth flow
- **`/api/oauth/token`** - Exchanges code for access token
- **`/api/oauth/refresh`** - Refreshes expired tokens
- **`/api/oauth/userinfo`** - Returns user profile
- **`/api/oauth/introspect`** - Validates tokens

### **Step 4: Test OAuth Flow**

1. **Deploy your changes**
2. **Test the OAuth flow** using the provided test script
3. **Verify in ChatGPT** that users can authenticate

## 🔄 **OAuth Flow Diagram**

```
User → ChatGPT → Your API (/oauth/authorize) → User Consent → Authorization Code
  ↓
ChatGPT → Your API (/oauth/token) → Access Token + Refresh Token
  ↓
ChatGPT → Your API (with Bearer token) → User-specific data
```

## 📋 **OAuth Scopes**

| Scope | Description | Endpoints |
|-------|-------------|-----------|
| `read` | Read user profile and preferences | `/api/users/{id}`, `/api/oauth/userinfo` |
| `write` | Update user preferences | `/api/users/{id}` (POST) |
| `book` | Book flights on behalf of user | `/api/book-flight` |

## 🔧 **Configuration Details**

### **Authorization URL Parameters**

```
GET /api/oauth/authorize?
  response_type=code&
  client_id=porter-flight-booking&
  redirect_uri=https://chatgpt.com/aip/{g-YOUR-GPT-ID-HERE}/oauth/callback&
  scope=read write book&
  state=random_state_string
```

### **Token Exchange Request**

```bash
POST /api/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code=AUTHORIZATION_CODE&
redirect_uri=https://chatgpt.com/aip/{g-YOUR-GPT-ID-HERE}/oauth/callback&
client_id=porter-flight-booking&
client_secret=your_client_secret
```

### **Token Response**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "refresh_token_here",
  "scope": "read write book"
}
```

## 🛡️ **Security Features**

### **PKCE Support**
- **Code Challenge Method**: `S256` (SHA256)
- **Code Verifier**: Random string sent with token request
- **Prevents authorization code interception**

### **Token Security**
- **Access Token Expiry**: 1 hour
- **Refresh Token Expiry**: 30 days
- **Secure Token Generation**: Cryptographically random
- **Scope Validation**: Enforces least privilege access

### **Production Considerations**
- **Use HTTPS** for all OAuth endpoints
- **Implement rate limiting** on OAuth endpoints
- **Store tokens in Redis/database** instead of memory
- **Add CSRF protection** for authorization endpoint
- **Implement token revocation** endpoint

## 🧪 **Testing OAuth**

### **Test Script**

```bash
# Set environment variables
export OAUTH_CLIENT_ID=porter-flight-booking
export OAUTH_CLIENT_SECRET=your_secret
export OAUTH_REDIRECT_URI=https://chatgpt.com/aip/{g-YOUR-GPT-ID-HERE}/oauth/callback

# Run OAuth test
node test-oauth.js
```

### **Manual Testing**

1. **Test Authorization Endpoint:**
   ```bash
   curl "https://your-api.com/api/oauth/authorize?response_type=code&client_id=porter-flight-booking&redirect_uri=https://chatgpt.com/aip/{g-YOUR-GPT-ID-HERE}/oauth/callback&scope=read write book"
   ```

2. **Test Token Endpoint:**
   ```bash
   curl -X POST "https://your-api.com/api/oauth/token" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "grant_type=authorization_code&code=AUTH_CODE&client_id=porter-flight-booking&client_secret=your_secret&redirect_uri=https://chatgpt.com/aip/{g-YOUR-GPT-ID-HERE}/oauth/callback"
   ```

## 🔍 **Troubleshooting**

### **Common Issues**

1. **"Invalid redirect URI" error**
   - Check that redirect URI exactly matches ChatGPT configuration
   - Verify GPT ID in the callback URL

2. **"Invalid client credentials" error**
   - Verify `OAUTH_CLIENT_ID` and `OAUTH_CLIENT_SECRET` match
   - Check environment variables are set correctly

3. **"Authorization code expired" error**
   - Authorization codes expire after 10 minutes
   - This is normal security behavior

4. **"Insufficient scopes" error**
   - Check that requested scopes match token scopes
   - Verify scope names are exactly: `read`, `write`, `book`

### **Debug Mode**

Enable detailed OAuth logging:

```bash
export DEBUG=oauth:*
```

### **Token Validation**

Use the introspection endpoint to debug tokens:

```bash
curl -X POST "https://your-api.com/api/oauth/introspect" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "token=your_access_token_here"
```

## 📚 **Integration Examples**

### **Using OAuth in Protected Endpoints**

```javascript
// In your API endpoints
const { requireReadScope, requireBookScope } = require('./oauth-middleware');

// Endpoint requiring read scope
app.get('/api/users/:id', requireReadScope, (req, res) => {
  // req.user contains authenticated user info
  const userId = req.user.id;
  // ... handle request
});

// Endpoint requiring book scope
app.post('/api/book-flight', requireBookScope, (req, res) => {
  // req.user contains authenticated user info
  const userId = req.user.id;
  // ... handle booking
});
```

### **User Context in ChatGPT**

Once OAuth is configured, ChatGPT will automatically:
- **Include user context** in API calls
- **Pass access tokens** in Authorization headers
- **Handle token refresh** when tokens expire
- **Provide personalized responses** based on user data

## 🚀 **Deployment Checklist**

- [ ] **OAuth endpoints deployed** (`/api/oauth/*`)
- [ ] **Environment variables set** (client ID, secret, URLs)
- [ ] **ChatGPT Builder configured** with OAuth settings
- [ ] **Redirect URI updated** with actual GPT ID
- [ ] **HTTPS enabled** for production
- [ ] **OAuth flow tested** end-to-end
- [ ] **User authentication working** in ChatGPT

## 🔐 **Security Best Practices**

1. **Use strong client secrets** (32+ random characters)
2. **Implement PKCE** for public clients
3. **Validate all OAuth parameters** strictly
4. **Log OAuth events** for security monitoring
5. **Implement token revocation** for compromised tokens
6. **Use short-lived access tokens** (1 hour max)
7. **Secure refresh token storage** in ChatGPT
8. **Monitor for suspicious OAuth activity**

## 📞 **Support**

If you encounter OAuth issues:

1. **Check the logs** for detailed error messages
2. **Verify environment variables** are set correctly
3. **Test OAuth flow** step by step
4. **Check ChatGPT Builder** configuration
5. **Review OAuth standards** compliance

---

**Note**: OAuth 2.0 provides enterprise-grade security for user authentication. This implementation follows OAuth 2.0 RFC 6749 standards and is compatible with ChatGPT Actions.
