// OAuth middleware for validating OAuth 2.0 access tokens
// This middleware extracts user information from OAuth tokens

const crypto = require('crypto');

// In-memory token storage (use Redis/database in production)
const accessTokens = new Map();

/**
 * Middleware to validate OAuth 2.0 access tokens
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * @param {Array} requiredScopes - Array of required scopes
 */
function validateOAuthToken(req, res, next, requiredScopes = []) {
  const requestId = req.headers['x-request-id'] || generateRequestId();
  
  console.log(`[${requestId}] 🔐 OAuth token validation for ${req.method} ${req.path}`);
  
  // Get authorization header
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log(`[${requestId}] ❌ Missing or invalid Authorization header`);
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Valid OAuth access token is required',
      code: 'MISSING_OAUTH_TOKEN',
      requestId
    });
  }
  
  const accessToken = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  try {
    // Validate access token
    const tokenData = accessTokens.get(accessToken);
    
    if (!tokenData) {
      console.log(`[${requestId}] ❌ Invalid OAuth access token`);
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired OAuth access token',
        code: 'INVALID_OAUTH_TOKEN',
        requestId
      });
    }
    
    // Check if token has expired
    if (Date.now() > tokenData.expiresAt) {
      accessTokens.delete(accessToken);
      console.log(`[${requestId}] ❌ OAuth access token expired`);
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'OAuth access token has expired',
        code: 'EXPIRED_OAUTH_TOKEN',
        requestId
      });
    }
    
    // Check if token has required scopes
    if (requiredScopes.length > 0) {
      const hasRequiredScopes = requiredScopes.every(scope => 
        tokenData.scopes.includes(scope)
      );
      
      if (!hasRequiredScopes) {
        console.log(`[${requestId}] ❌ Insufficient OAuth scopes. Required: ${requiredScopes.join(', ')}, Got: ${tokenData.scopes.join(', ')}`);
        return res.status(403).json({
          error: 'Forbidden',
          message: 'OAuth token does not have required scopes',
          code: 'INSUFFICIENT_OAUTH_SCOPES',
          requiredScopes,
          tokenScopes: tokenData.scopes,
          requestId
        });
      }
    }
    
    // Add user information to request
    req.user = {
      id: tokenData.userId,
      clientId: tokenData.clientId,
      scopes: tokenData.scopes,
      tokenIssuedAt: tokenData.createdAt,
      tokenExpiresAt: tokenData.expiresAt
    };
    
    console.log(`[${requestId}] ✅ OAuth token validated successfully for user: ${tokenData.userId}`);
    next();
    
  } catch (error) {
    console.error(`[${requestId}] ❌ OAuth token validation error:`, error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error validating OAuth token',
      code: 'OAUTH_VALIDATION_ERROR',
      requestId
    });
  }
}

/**
 * Middleware for endpoints requiring read scope
 */
function requireReadScope(req, res, next) {
  return validateOAuthToken(req, res, next, ['read']);
}

/**
 * Middleware for endpoints requiring write scope
 */
function requireWriteScope(req, res, next) {
  return validateOAuthToken(req, res, next, ['read', 'write']);
}

/**
 * Middleware for endpoints requiring book scope
 */
function requireBookScope(req, res, next) {
  return validateOAuthToken(req, res, next, ['read', 'book']);
}

/**
 * Middleware for endpoints requiring all scopes
 */
function requireAllScopes(req, res, next) {
  return validateOAuthToken(req, res, next, ['read', 'write', 'book']);
}

/**
 * Generate a unique request ID for tracking
 * @returns {string} Unique request ID
 */
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Store access token data (called by OAuth endpoints)
 * @param {string} accessToken - The access token
 * @param {Object} tokenData - Token metadata
 */
function storeAccessToken(accessToken, tokenData) {
  accessTokens.set(accessToken, tokenData);
}

/**
 * Remove access token (for logout/token revocation)
 * @param {string} accessToken - The access token to remove
 */
function removeAccessToken(accessToken) {
  accessTokens.delete(accessToken);
}

/**
 * Get token data (for debugging/admin purposes)
 * @param {string} accessToken - The access token
 * @returns {Object|null} Token data or null if not found
 */
function getTokenData(accessToken) {
  return accessTokens.get(accessToken) || null;
}

/**
 * Clean up expired tokens (call periodically in production)
 */
function cleanupExpiredTokens() {
  const now = Date.now();
  let cleanedCount = 0;
  
  for (const [token, data] of accessTokens.entries()) {
    if (now > data.expiresAt) {
      accessTokens.delete(token);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`🧹 Cleaned up ${cleanedCount} expired OAuth tokens`);
  }
}

// Clean up expired tokens every hour
setInterval(cleanupExpiredTokens, 60 * 60 * 1000);

module.exports = {
  validateOAuthToken,
  requireReadScope,
  requireWriteScope,
  requireBookScope,
  requireAllScopes,
  storeAccessToken,
  removeAccessToken,
  getTokenData,
  cleanupExpiredTokens,
  generateRequestId
};
