// Authentication middleware for API endpoints
// This middleware validates API keys for protected endpoints

/**
 * Middleware to validate API key authentication
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function validateApiKey(req, res, next) {
  // Skip authentication for health check and OpenAPI spec endpoints
  if (req.path === '/api/health' || req.path === '/api/openapi') {
    return next();
  }

  // Get API key from header
  const apiKey = req.headers['x-api-key'] || req.headers['X-API-Key'];
  
  // Check if API key is provided
  if (!apiKey) {
    console.log(`[AUTH] ❌ Missing API key for ${req.method} ${req.path}`);
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'API key is required for this endpoint',
      code: 'MISSING_API_KEY',
      requestId: req.headers['x-request-id'] || generateRequestId()
    });
  }

  // Validate API key against environment variable
  const validApiKey = process.env.API_KEY;
  
  if (!validApiKey) {
    console.log(`[AUTH] ⚠️ No API_KEY environment variable configured`);
    return res.status(500).json({
      error: 'Server Configuration Error',
      message: 'API authentication not properly configured',
      code: 'AUTH_NOT_CONFIGURED',
      requestId: req.headers['x-request-id'] || generateRequestId()
    });
  }

  // Check if API key matches
  if (apiKey !== validApiKey) {
    console.log(`[AUTH] ❌ Invalid API key for ${req.method} ${req.path}`);
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid API key',
      code: 'INVALID_API_KEY',
      requestId: req.headers['x-request-id'] || generateRequestId()
    });
  }

  // API key is valid
  console.log(`[AUTH] ✅ Valid API key for ${req.method} ${req.path}`);
  next();
}

/**
 * Middleware to validate JWT token authentication (alternative to API key)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function validateJWT(req, res, next) {
  // Skip authentication for health check and OpenAPI spec endpoints
  if (req.path === '/api/health' || req.path === '/api/openapi') {
    return next();
  }

  // Get JWT token from Authorization header
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log(`[AUTH] ❌ Missing or invalid Authorization header for ${req.method} ${req.path}`);
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Valid JWT token is required for this endpoint',
      code: 'MISSING_JWT_TOKEN',
      requestId: req.headers['x-request-id'] || generateRequestId()
    });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  try {
    // In a production environment, you would verify the JWT token here
    // For now, we'll just check if it's not empty
    if (!token || token.trim() === '') {
      throw new Error('Empty token');
    }
    
    // TODO: Implement proper JWT verification
    // const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // req.user = decoded;
    
    console.log(`[AUTH] ✅ Valid JWT token for ${req.method} ${req.path}`);
    next();
    
  } catch (error) {
    console.log(`[AUTH] ❌ Invalid JWT token for ${req.method} ${req.path}: ${error.message}`);
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired JWT token',
      code: 'INVALID_JWT_TOKEN',
      requestId: req.headers['x-request-id'] || generateRequestId()
    });
  }
}

/**
 * Generate a unique request ID for tracking
 * @returns {string} Unique request ID
 */
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Middleware to add request ID to headers if not present
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function addRequestId(req, res, next) {
  if (!req.headers['x-request-id']) {
    req.headers['x-request-id'] = generateRequestId();
  }
  next();
}

module.exports = {
  validateApiKey,
  validateJWT,
  addRequestId,
  generateRequestId
};
