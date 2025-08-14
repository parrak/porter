/**
 * Common utilities for Porter Travel API
 */

// Generate a unique request ID for tracking
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Log telemetry data
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

// Validate email format
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Generate a random string
function generateRandomString(length = 8) {
  return Math.random().toString(36).substring(2, length + 2);
}

// Format currency
function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

// Parse date string to ISO format
function parseDate(dateString) {
  if (!dateString) return null;
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
  } catch (error) {
    return null;
  }
}

// Validate airport code format (3 letters)
function isValidAirportCode(code) {
  return /^[A-Z]{3}$/.test(code);
}

// Sanitize user input
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>]/g, '');
}

module.exports = {
  generateRequestId,
  logTelemetry,
  isValidEmail,
  generateRandomString,
  formatCurrency,
  parseDate,
  isValidAirportCode,
  sanitizeInput
};
