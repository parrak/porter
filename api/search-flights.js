// Flight Search API endpoint for Vercel
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { from, to, date, passengers = 1, travelClass = 'ECONOMY', userId } = req.body;
    
    if (!from || !to || !date) {
      return res.status(400).json({ error: 'from, to, and date are required' });
    }

    // Mock flight search response
    const mockFlights = [
      {
        flightNumber: 123,
        route: `${from} → ${to}`,
        time: "10:00 AM - 11:30 AM",
        stops: "Direct",
        price: "$299",
        seats: 4,
        airline: "Mock Airlines"
      },
      {
        flightNumber: 456,
        route: `${from} → ${to}`,
        time: "2:00 PM - 3:30 PM", 
        stops: "1 stop",
        price: "$249",
        seats: 2,
        airline: "Mock Airlines"
      }
    ];

    const response = {
      success: true,
      searchParams: { from, to, date, passengers, travelClass },
      flightsFound: mockFlights.length,
      flights: mockFlights,
      message: `Found ${mockFlights.length} flights from ${from} to ${to} on ${date}`
    };

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};
