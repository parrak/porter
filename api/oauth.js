// OAuth 2.0 endpoints for ChatGPT Actions integration
// This enables end-user authentication and personalization

const crypto = require('crypto');

// In-memory storage for OAuth state and tokens (use Redis/database in production)
const oauthState = new Map();
const accessTokens = new Map();
const refreshTokens = new Map();

// OAuth configuration
const OAUTH_CONFIG = {
  clientId: process.env.OAUTH_CLIENT_ID || 'porter-flight-booking',
  clientSecret: process.env.OAUTH_CLIENT_SECRET || 'your-oauth-client-secret',
  redirectUri: process.env.OAUTH_REDIRECT_URI || 'https://chatgpt.com/aip/{g-YOUR-GPT-ID-HERE}/oauth/callback',
  authorizationUrl: process.env.OAUTH_AUTHORIZATION_URL || 'https://your-api-domain.com/api/oauth/authorize',
  tokenUrl: process.env.OAUTH_TOKEN_URL || 'https://your-api-domain.com/api/oauth/token',
  scopes: ['read', 'write', 'book'],
  tokenExpiry: 3600, // 1 hour
  refreshTokenExpiry: 2592000 // 30 days
};

/**
 * OAuth Authorization Endpoint
 * GET /api/oauth/authorize
 * This is called by ChatGPT to initiate OAuth flow
 */
async function handleAuthorization(req, res) {
  const requestId = generateRequestId();
  
  console.log(`[${requestId}] 🔐 OAuth authorization request: ${req.method} ${req.url}`);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method === 'GET') {
    try {
      const { 
        response_type, 
        client_id, 
        redirect_uri, 
        scope, 
        state,
        code_challenge,
        code_challenge_method
      } = req.query;
      
      console.log(`[${requestId}] 📋 OAuth parameters:`, {
        response_type,
        client_id,
        redirect_uri,
        scope,
        state,
        code_challenge_method
      });
      
      // Validate required parameters
      if (response_type !== 'code') {
        return res.status(400).json({
          error: 'unsupported_response_type',
          error_description: 'Only authorization code flow is supported'
        });
      }
      
      if (client_id !== OAUTH_CONFIG.clientId) {
        return res.status(400).json({
          error: 'invalid_client',
          error_description: 'Invalid client ID'
        });
      }
      
      if (redirect_uri !== OAUTH_CONFIG.redirectUri) {
        return res.status(400).json({
          error: 'invalid_redirect_uri',
          error_description: 'Invalid redirect URI'
        });
      }
      
      // Generate authorization code
      const authCode = generateAuthorizationCode();
      const requestedScopes = scope ? scope.split(' ') : OAUTH_CONFIG.scopes;
      
      // Store authorization code with metadata
      oauthState.set(authCode, {
        clientId: client_id,
        redirectUri: redirect_uri,
        scopes: requestedScopes,
        state: state,
        codeChallenge: code_challenge,
        codeChallengeMethod: code_challenge_method,
        createdAt: Date.now(),
        expiresAt: Date.now() + (10 * 60 * 1000) // 10 minutes
      });
      
      console.log(`[${requestId}] ✅ Authorization code generated: ${authCode}`);
      
      // Build redirect URL with authorization code
      const redirectUrl = new URL(redirect_uri);
      redirectUrl.searchParams.set('code', authCode);
      if (state) {
        redirectUrl.searchParams.set('state', state);
      }
      
      console.log(`[${requestId}] 🔗 Redirecting to: ${redirectUrl.toString()}`);
      
      // Redirect user back to ChatGPT with authorization code
      res.redirect(redirectUrl.toString());
      
    } catch (error) {
      console.error(`[${requestId}] ❌ OAuth authorization error:`, error);
      res.status(500).json({
        error: 'server_error',
        error_description: 'Internal server error during authorization'
      });
    }
  } else {
    res.status(405).json({
      error: 'method_not_allowed',
      error_description: 'Only GET method is allowed for authorization'
    });
  }
};

/**
 * OAuth Token Endpoint
 * POST /api/oauth/token
 * This is called by ChatGPT to exchange authorization code for access token
 */
async function handleTokenRequest(req, res) {
  const requestId = generateRequestId();
  
  console.log(`[${requestId}] 🎫 OAuth token request: ${req.method} ${req.url}`);
  
  if (req.method === 'POST') {
    try {
      const { 
        grant_type, 
        code, 
        redirect_uri, 
        client_id, 
        client_secret,
        code_verifier
      } = req.body;
      
      console.log(`[${requestId}] 📋 Token request parameters:`, {
        grant_type,
        code,
        redirect_uri,
        client_id,
        code_verifier: !!code_verifier
      });
      
      // Validate grant type
      if (grant_type !== 'authorization_code') {
        return res.status(400).json({
          error: 'unsupported_grant_type',
          error_description: 'Only authorization code grant is supported'
        });
      }
      
      // Validate client credentials
      if (client_id !== OAUTH_CONFIG.clientId || client_secret !== OAUTH_CONFIG.clientSecret) {
        return res.status(401).json({
          error: 'invalid_client',
          error_description: 'Invalid client credentials'
        });
      }
      
      // Validate authorization code
      const authData = oauthState.get(code);
      if (!authData) {
        return res.status(400).json({
          error: 'invalid_grant',
          error_description: 'Invalid or expired authorization code'
        });
      }
      
      // Check if code has expired
      if (Date.now() > authData.expiresAt) {
        oauthState.delete(code);
        return res.status(400).json({
          error: 'invalid_grant',
          error_description: 'Authorization code has expired'
        });
      }
      
      // Validate PKCE if used
      if (authData.codeChallenge) {
        if (!code_verifier) {
          return res.status(400).json({
            error: 'invalid_grant',
            error_description: 'Code verifier is required for PKCE'
          });
        }
        
        const expectedChallenge = authData.codeChallengeMethod === 'S256' 
          ? crypto.createHash('sha256').update(code_verifier).digest('base64url')
          : code_verifier;
          
        if (expectedChallenge !== authData.codeChallenge) {
          return res.status(400).json({
            error: 'invalid_grant',
            error_description: 'Invalid code verifier'
          });
        }
      }
      
      // Generate access and refresh tokens
      const accessToken = generateAccessToken();
      const refreshToken = generateRefreshToken();
      
      // Store token data
      accessTokens.set(accessToken, {
        userId: generateUserId(), // In production, get from user session
        clientId: client_id,
        scopes: authData.scopes,
        createdAt: Date.now(),
        expiresAt: Date.now() + (OAUTH_CONFIG.tokenExpiry * 1000)
      });
      
      refreshTokens.set(refreshToken, {
        accessToken: accessToken,
        clientId: client_id,
        scopes: authData.scopes,
        createdAt: Date.now(),
        expiresAt: Date.now() + (OAUTH_CONFIG.refreshTokenExpiry * 1000)
      });
      
      // Clean up used authorization code
      oauthState.delete(code);
      
      console.log(`[${requestId}] ✅ Access token generated: ${accessToken.substring(0, 10)}...`);
      
      // Return token response
      res.status(200).json({
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: OAUTH_CONFIG.tokenExpiry,
        refresh_token: refreshToken,
        scope: authData.scopes.join(' ')
      });
      
    } catch (error) {
      console.error(`[${requestId}] ❌ OAuth token error:`, error);
      res.status(500).json({
        error: 'server_error',
        error_description: 'Internal server error during token exchange'
      });
    }
  } else {
    res.status(405).json({
      error: 'method_not_allowed',
      error_description: 'Only POST method is allowed for token exchange'
    });
  }
}

/**
 * OAuth Token Refresh Endpoint
 * POST /api/oauth/refresh
 * This allows ChatGPT to refresh expired access tokens
 */
async function handleTokenRefresh(req, res) {
  const requestId = generateRequestId();
  
  console.log(`[${requestId}] 🔄 OAuth token refresh request`);
  
  if (req.method === 'POST') {
    try {
      const { 
        grant_type, 
        refresh_token, 
        client_id, 
        client_secret 
      } = req.body;
      
      // Validate grant type
      if (grant_type !== 'refresh_token') {
        return res.status(400).json({
          error: 'unsupported_grant_type',
          error_description: 'Only refresh token grant is supported'
        });
      }
      
      // Validate client credentials
      if (client_id !== OAUTH_CONFIG.clientId || client_secret !== OAUTH_CONFIG.clientSecret) {
        return res.status(401).json({
          error: 'invalid_client',
          error_description: 'Invalid client credentials'
        });
      }
      
      // Validate refresh token
      const refreshData = refreshTokens.get(refresh_token);
      if (!refreshData) {
        return res.status(400).json({
          error: 'invalid_grant',
          error_description: 'Invalid refresh token'
        });
      }
      
      // Check if refresh token has expired
      if (Date.now() > refreshData.expiresAt) {
        refreshTokens.delete(refresh_token);
        return res.status(400).json({
          error: 'invalid_grant',
          error_description: 'Refresh token has expired'
        });
      }
      
      // Generate new access token
      const newAccessToken = generateAccessToken();
      
      // Store new access token
      accessTokens.set(newAccessToken, {
        userId: refreshData.userId,
        clientId: client_id,
        scopes: refreshData.scopes,
        createdAt: Date.now(),
        expiresAt: Date.now() + (OAUTH_CONFIG.tokenExpiry * 1000)
      });
      
      // Update refresh token to point to new access token
      refreshData.accessToken = newAccessToken;
      refreshData.createdAt = Date.now();
      
      console.log(`[${requestId}] ✅ Access token refreshed: ${newAccessToken.substring(0, 10)}...`);
      
      // Return new token response
      res.status(200).json({
        access_token: newAccessToken,
        token_type: 'Bearer',
        expires_in: OAUTH_CONFIG.tokenExpiry,
        scope: refreshData.scopes.join(' ')
      });
      
    } catch (error) {
      console.error(`[${requestId}] ❌ OAuth token refresh error:`, error);
      res.status(500).json({
        error: 'server_error',
        error_description: 'Internal server error during token refresh'
      });
    }
  } else {
    res.status(405).json({
      error: 'method_not_allowed',
      error_description: 'Only POST method is allowed for token refresh'
    });
  }
}

/**
 * OAuth User Info Endpoint
 * GET /api/oauth/userinfo
 * This returns user information for the authenticated user
 */
async function handleUserInfo(req, res) {
  const requestId = generateRequestId();
  
  console.log(`[${requestId}] 👤 OAuth user info request`);
  
  if (req.method === 'GET') {
    try {
      // Get authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: 'invalid_token',
          error_description: 'Access token required'
        });
      }
      
      const accessToken = authHeader.substring(7);
      
      // Validate access token
      const tokenData = accessTokens.get(accessToken);
      if (!tokenData) {
        return res.status(401).json({
          error: 'invalid_token',
          error_description: 'Invalid access token'
        });
      }
      
      // Check if token has expired
      if (Date.now() > tokenData.expiresAt) {
        accessTokens.delete(accessToken);
        return res.status(401).json({
          error: 'invalid_token',
          error_description: 'Access token has expired'
        });
      }
      
      // Check if token has required scope
      if (!tokenData.scopes.includes('read')) {
        return res.status(403).json({
          error: 'insufficient_scope',
          error_description: 'Token does not have required scope'
        });
      }
      
      // Get user profile (in production, fetch from database)
      const userProfile = await getUserProfile(tokenData.userId, requestId);
      
      if (!userProfile) {
        return res.status(404).json({
          error: 'user_not_found',
          error_description: 'User profile not found'
        });
      }
      
      console.log(`[${requestId}] ✅ User info returned for user: ${userProfile.displayName}`);
      
      // Return user info (OpenID Connect standard)
      res.status(200).json({
        sub: tokenData.userId,
        name: userProfile.displayName,
        email: userProfile.email || `${tokenData.userId}@example.com`,
        role: userProfile.role,
        preferences: userProfile.preferences,
        updated_at: Math.floor(Date.now() / 1000)
      });
      
    } catch (error) {
      console.error(`[${requestId}] ❌ OAuth user info error:`, error);
      res.status(500).json({
        error: 'server_error',
        error_description: 'Internal server error retrieving user info'
      });
    }
  } else {
    res.status(405).json({
      error: 'method_not_allowed',
      error_description: 'Only GET method is allowed for user info'
    });
  }
}

/**
 * OAuth Token Introspection Endpoint
 * POST /api/oauth/introspect
 * This allows ChatGPT to validate tokens
 */
async function handleTokenIntrospection(req, res) {
  const requestId = generateRequestId();
  
  console.log(`[${requestId}] 🔍 OAuth token introspection request`);
  
  if (req.method === 'POST') {
    try {
      const { token, token_type_hint } = req.body;
      
      if (!token) {
        return res.status(400).json({
          error: 'invalid_request',
          error_description: 'Token parameter is required'
        });
      }
      
      // Check if it's an access token
      let tokenData = accessTokens.get(token);
      let tokenType = 'access_token';
      
      if (!tokenData) {
        // Check if it's a refresh token
        const refreshData = refreshTokens.get(token);
        if (refreshData) {
          tokenData = refreshData;
          tokenType = 'refresh_token';
        }
      }
      
      if (!tokenData) {
        // Token is invalid
        return res.status(200).json({
          active: false
        });
      }
      
      // Check if token has expired
      const isActive = Date.now() <= tokenData.expiresAt;
      
      const response = {
        active: isActive,
        scope: tokenData.scopes.join(' '),
        client_id: tokenData.clientId,
        token_type: tokenType,
        exp: Math.floor(tokenData.expiresAt / 1000),
        iat: Math.floor(tokenData.createdAt / 1000)
      };
      
      if (tokenType === 'access_token' && isActive) {
        response.sub = tokenData.userId;
      }
      
      console.log(`[${requestId}] ✅ Token introspection completed: ${isActive ? 'active' : 'inactive'}`);
      
      res.status(200).json(response);
      
    } catch (error) {
      console.error(`[${requestId}] ❌ OAuth token introspection error:`, error);
      res.status(500).json({
        error: 'server_error',
        error_description: 'Internal server error during token introspection'
      });
    }
  } else {
    res.status(405).json({
      error: 'method_not_allowed',
      error_description: 'Only POST method is allowed for token introspection'
    });
  }
}

// Main OAuth handler - handles all OAuth routes
async function handleOAuth(req, res) {
  const path = req.url.split('?')[0];
  
  // Extract the specific OAuth endpoint from the path
  const oauthEndpoint = path.split('/').pop();
  
  switch (oauthEndpoint) {
    case 'authorize':
      return await handleAuthorization(req, res);
    case 'token':
      return await handleTokenRequest(req, res);
    case 'refresh':
      return await handleTokenRefresh(req, res);
    case 'userinfo':
      return await handleUserInfo(req, res);
    case 'introspect':
      return await handleTokenIntrospection(req, res);
    default:
      res.status(404).json({
        error: 'not_found',
        error_description: 'OAuth endpoint not found'
      });
  }
}

// Utility functions
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateAuthorizationCode() {
  return crypto.randomBytes(32).toString('hex');
}

function generateAccessToken() {
  return crypto.randomBytes(32).toString('hex');
}

function generateRefreshToken() {
  return crypto.randomBytes(32).toString('hex');
}

function generateUserId() {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Mock user profile function (replace with real database call)
async function getUserProfile(userId, requestId) {
  // In production, fetch from database
  return {
    displayName: 'Demo User',
    email: 'demo@example.com',
    role: 'Business Traveler',
    preferences: {
      tone: 'professional',
      format: 'concise',
      travelStyle: 'business'
    }
  };
}

// Export the main handler
module.exports = handleOAuth;
