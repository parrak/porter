// Vercel Serverless Function Entry Point
// This file is specifically for Vercel deployment

const app = require('../web-api.js');

// Export the Express app for Vercel
module.exports = app;
