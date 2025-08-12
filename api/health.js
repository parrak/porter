// Health check endpoint for Vercel
module.exports = (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Flight Booking Agent API',
    version: '1.0.0'
  });
};
