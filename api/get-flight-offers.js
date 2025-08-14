// Endpoint to retrieve full flight offers using context ID
// This allows the frontend to get complete Amadeus flight offer data for booking

const { generateRequestId, logTelemetry } = require('../utils/telemetry');

// In-memory storage for flight offer contexts (in production, use Redis or database)
const flightOfferContexts = new Map();

// Store flight offers in context (called by ChatGPT API)
function storeFlightOffersInContext(contextId, flightOffers) {
  flightOfferContexts.set(contextId, {
    flightOffers,
    timestamp: Date.now(),
    expiresAt: Date.now() + (30 * 60 * 1000) // 30 minutes expiry
  });
  
  // Clean up expired contexts
  cleanupExpiredContexts();
}

// Clean up expired contexts
function cleanupExpiredContexts() {
  const now = Date.now();
  for (const [contextId, context] of flightOfferContexts.entries()) {
    if (context.expiresAt < now) {
      flightOfferContexts.delete(contextId);
    }
  }
}

module.exports = async (req, res) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  console.log(`[${requestId}] 🎫 Get flight offers endpoint called: GET /api/get-flight-offers`);
  
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method Not Allowed',
      message: 'Only GET requests are allowed',
      allowedMethods: ['GET']
    });
  }
  
  try {
    const { contextId } = req.query;
    
    if (!contextId) {
      return res.status(400).json({
        error: 'Missing required parameter',
        message: 'contextId is required',
        required: ['contextId']
      });
    }
    
    console.log(`[${requestId}] 🔍 Retrieving flight offers for context: ${contextId}`);
    
    // Get the context
    const context = flightOfferContexts.get(contextId);
    
    if (!context) {
      return res.status(404).json({
        error: 'Context not found',
        message: 'The provided contextId is invalid or has expired',
        contextId
      });
    }
    
    // Check if context has expired
    if (context.expiresAt < Date.now()) {
      flightOfferContexts.delete(contextId);
      return res.status(410).json({
        error: 'Context expired',
        message: 'The flight offer context has expired',
        contextId
      });
    }
    
    console.log(`[${requestId}] ✅ Found ${context.flightOffers.length} flight offers in context`);
    
    // Log telemetry
    logTelemetry('flight_offers_retrieved', {
      requestId,
      contextId,
      flightOfferCount: context.flightOffers.length,
      success: true
    });
    
    const totalDuration = Date.now() - startTime;
    console.log(`[${requestId}] 🎉 Flight offers retrieved in ${totalDuration}ms`);
    
    res.status(200).json({
      success: true,
      message: `Retrieved ${context.flightOffers.length} flight offers`,
      contextId,
      flightOffers: context.flightOffers,
      expiresAt: new Date(context.expiresAt).toISOString(),
      requestId,
      duration: totalDuration
    });
    
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error(`[${requestId}] ❌ Get flight offers failed after ${totalDuration}ms:`, error);
    
    logTelemetry('flight_offers_retrieval_error', {
      requestId,
      success: false,
      error: error.message,
      duration: totalDuration
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve flight offers',
      message: error.message,
      requestId,
      duration: totalDuration
    });
  }
};

// Export the storage function for use by ChatGPT API
module.exports.storeFlightOffersInContext = storeFlightOffersInContext;
