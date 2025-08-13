// Comprehensive Telemetry System for Flight Booking Agent
// Sends data to multiple services for proper monitoring and analytics

class TelemetryService {
  constructor() {
    this.enabled = process.env.NODE_ENV === 'production';
    this.services = {
      vercel: this.enabled && !!process.env.VERCEL_URL,
      console: true, // Always log to console for debugging
      custom: this.enabled && !!process.env.TELEMETRY_ENDPOINT
    };
    
    console.log(`[TELEMETRY] Service initialized - Vercel: ${this.services.vercel}, Custom: ${this.services.custom}`);
  }

  // Main telemetry logging method
  async log(event, data) {
    const timestamp = new Date().toISOString();
    const telemetryData = {
      timestamp,
      event,
      ...data,
      environment: process.env.NODE_ENV || 'production',
      deployment: process.env.VERCEL_URL || 'local',
      version: '1.0.0'
    };

    // Always log to console for immediate visibility
    if (this.services.console) {
      console.log(`[TELEMETRY] ${JSON.stringify(telemetryData)}`);
    }

    // Send to Vercel Analytics (if available)
    if (this.services.vercel) {
      await this.sendToVercel(event, telemetryData);
    }

    // Send to custom telemetry endpoint (if configured)
    if (this.services.custom) {
      await this.sendToCustomEndpoint(telemetryData);
    }

    return telemetryData;
  }

  // Send telemetry to Vercel Analytics
  async sendToVercel(event, data) {
    try {
      // Vercel Analytics automatically captures function invocations
      // We can enhance this with custom events
      if (typeof process.env.VERCEL_ANALYTICS_ID !== 'undefined') {
        // Custom Vercel Analytics implementation
        console.log(`[TELEMETRY] Vercel Analytics event: ${event}`);
      }
    } catch (error) {
      console.error('[TELEMETRY] Vercel Analytics error:', error);
    }
  }

  // Send telemetry to custom endpoint
  async sendToCustomEndpoint(data) {
    try {
      const endpoint = process.env.TELEMETRY_ENDPOINT;
      if (!endpoint) return;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.TELEMETRY_API_KEY || ''}`,
          'User-Agent': 'Flight-Booking-Agent/1.0'
        },
        body: JSON.stringify(data),
        timeout: 5000
      });

      if (!response.ok) {
        throw new Error(`Telemetry endpoint returned ${response.status}`);
      }

      console.log(`[TELEMETRY] Custom endpoint success: ${event}`);
    } catch (error) {
      console.error('[TELEMETRY] Custom endpoint error:', error);
    }
  }

  // Specific telemetry methods for different events
  async logUserInteraction(userId, action, details = {}) {
    return this.log('user_interaction', {
      userId,
      action,
      details,
      category: 'user_behavior'
    });
  }

  async logAPICall(endpoint, method, duration, success, userId = null) {
    return this.log('api_call', {
      endpoint,
      method,
      duration,
      success,
      userId,
      category: 'performance'
    });
  }

  async logFlightSearch(searchParams, results, duration, userId = null) {
    return this.log('flight_search', {
      searchParams,
      resultsCount: results?.length || 0,
      duration,
      userId,
      category: 'business_metrics'
    });
  }

  async logChatGPTCall(message, response, duration, success, userId = null) {
    return this.log('chatgpt_call', {
      messageLength: message?.length || 0,
      responseLength: response?.length || 0,
      duration,
      success,
      userId,
      category: 'ai_usage'
    });
  }

  async logAmadeusCall(endpoint, duration, success, userId = null) {
    return this.log('amadeus_call', {
      endpoint,
      duration,
      success,
      userId,
      category: 'external_api'
    });
  }

  async logError(error, context, userId = null) {
    return this.log('error', {
      error: error.message,
      stack: error.stack,
      context,
      userId,
      category: 'error_tracking'
    });
  }

  async logPerformance(operation, duration, metadata = {}) {
    return this.log('performance', {
      operation,
      duration,
      metadata,
      category: 'performance'
    });
  }

  // Batch telemetry for high-volume events
  async logBatch(events) {
    if (!Array.isArray(events) || events.length === 0) return;

    const batchData = {
      batchSize: events.length,
      events: events.map(event => ({
        ...event,
        timestamp: new Date().toISOString()
      }))
    };

    return this.log('telemetry_batch', batchData);
  }

  // Health check for telemetry system
  async healthCheck() {
    const health = {
      enabled: this.enabled,
      services: this.services,
      timestamp: new Date().toISOString()
    };

    try {
      // Test custom endpoint if configured
      if (this.services.custom) {
        const endpoint = process.env.TELEMETRY_ENDPOINT;
        const response = await fetch(endpoint, { method: 'HEAD', timeout: 3000 });
        health.customEndpointStatus = response.ok ? 'healthy' : 'unhealthy';
      }

      health.status = 'healthy';
    } catch (error) {
      health.status = 'unhealthy';
      health.error = error.message;
    }

    return health;
  }
}

// Create singleton instance
const telemetryService = new TelemetryService();

// Export the service and convenience functions
module.exports = {
  telemetryService,
  
  // Convenience functions for backward compatibility
  logTelemetry: (event, data) => telemetryService.log(event, data),
  
  // Specific logging functions
  logUserInteraction: (userId, action, details) => 
    telemetryService.logUserInteraction(userId, action, details),
  
  logAPICall: (endpoint, method, duration, success, userId) => 
    telemetryService.logAPICall(endpoint, method, duration, success, userId),
  
  logFlightSearch: (searchParams, results, duration, userId) => 
    telemetryService.logFlightSearch(searchParams, results, duration, userId),
  
  logChatGPTCall: (message, response, duration, success, userId) => 
    telemetryService.logChatGPTCall(message, response, duration, success, userId),
  
  logAmadeusCall: (endpoint, duration, success, userId) => 
    telemetryService.logAmadeusCall(endpoint, duration, success, userId),
  
  logError: (error, context, userId) => 
    telemetryService.logError(error, context, userId),
  
  logPerformance: (operation, duration, metadata) => 
    telemetryService.logPerformance(operation, duration, metadata),
  
  // Health check
  healthCheck: () => telemetryService.healthCheck()
};

