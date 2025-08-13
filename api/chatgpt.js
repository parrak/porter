// Flight intent parser function
function parseFlightIntent(message) {
  const lowerMessage = message.toLowerCase();
  
  // Default values
  let from = "SEA";
  let to = "YVR";
  let date = new Date().toISOString().split('T')[0]; // Today
  let passengers = 1;
  let travelClass = "economy";
  
  // Extract airport codes (simple pattern matching)
  const airportPattern = /(?:from|departing|leaving)\s+([A-Z]{3})/i;
  const toPattern = /(?:to|arriving|going to)\s+([A-Z]{3})/i;
  
  const fromMatch = message.match(airportPattern);
  const toMatch = message.match(toPattern);
  
  if (fromMatch) from = fromMatch[1].toUpperCase();
  if (toMatch) to = toMatch[1].toUpperCase();
  
  // Extract date patterns
  const datePatterns = [
    /(?:on|for)\s+(\d{1,2}\/\d{1,2}\/\d{4})/i,
    /(?:on|for)\s+(\d{4}-\d{2}-\d{2})/i,
    /(?:on|for)\s+(tomorrow)/i,
    /(?:on|for)\s+(next week)/i
  ];
  
  for (const pattern of datePatterns) {
    const match = message.match(pattern);
    if (match) {
      if (match[1] === "tomorrow") {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        date = tomorrow.toISOString().split('T')[0];
      } else if (match[1] === "next week") {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        date = nextWeek.toISOString().split('T')[0];
      } else {
        date = match[1];
      }
      break;
    }
  }
  
  // Extract passenger count
  const passengerPattern = /(\d+)\s+(?:passenger|person|people)/i;
  const passengerMatch = message.match(passengerPattern);
  if (passengerMatch) {
    passengers = parseInt(passengerMatch[1]);
  }
  
  // Extract travel class
  if (lowerMessage.includes("business")) travelClass = "business";
  if (lowerMessage.includes("first")) travelClass = "first";
  
  return { from, to, date, passengers, class: travelClass };
}

// ChatGPT API endpoint for Vercel
module.exports = async (req, res) => {
  // Set CORS headers to allow all origins
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, userId } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Parse flight search intent from natural language
    const flightIntent = parseFlightIntent(message);
    
    // Generate realistic flight search response
    const mockResponse = {
      success: true,
      message: `Found flights for your request: "${message}"`,
      intent: flightIntent,
      flights: [
        {
          flightNumber: "AC123",
          route: `${flightIntent.from} → ${flightIntent.to}`,
          time: "10:00 AM - 11:30 AM",
          stops: "Direct",
          price: "$299",
          seats: 4,
          airline: "Air Canada",
          class: flightIntent.class
        },
        {
          flightNumber: "WS456",
          route: `${flightIntent.from} → ${flightIntent.to}`,
          time: "2:00 PM - 3:30 PM", 
          stops: "1 stop",
          price: "$249",
          seats: 2,
          airline: "WestJet",
          class: flightIntent.class
        }
      ],
      searchParams: {
        from: flightIntent.from,
        to: flightIntent.to,
        date: flightIntent.date,
        passengers: flightIntent.passengers,
        travelClass: flightIntent.class.toUpperCase()
      }
    };

    res.status(200).json(mockResponse);
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};
