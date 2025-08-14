// Telemetry utilities for logging and request tracking

// Generate a unique request ID
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Log telemetry events
function logTelemetry(event, data) {
  const timestamp = new Date().toISOString();
  const telemetryData = {
    timestamp,
    event,
    ...data,
    environment: process.env.NODE_ENV || 'production',
    deployment: process.env.VERCEL_URL || 'local'
  };
  
  console.log(`[TELEMETRY] ${JSON.stringify(telemetryData)}`);
  
  // In production, you could send this to a logging service like:
  // - Vercel Analytics
  // - LogRocket
  // - Sentry
  // - Custom logging endpoint
}

module.exports = {
  generateRequestId,
  logTelemetry
};
