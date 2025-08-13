// Flight intent parser using ChatGPT
async function parseFlightIntentWithChatGPT(message) {
  try {
    // Use ChatGPT to parse the flight intent
    const prompt = `Parse this flight request and return ONLY a JSON object with the following structure:
{
  "from": "airport_code",
  "to": "airport_code", 
  "date": "YYYY-MM-DD",
  "passengers": number,
  "class": "economy|business|first"
}

Flight request: "${message}"

Rules:
- Convert city names to airport codes (e.g., "New York" → "JFK", "Los Angeles" → "LAX")
- Parse dates in any format to YYYY-MM-DD
- Default to economy class if not specified
- Default to 1 passenger if not specified
- Use today's date if no date specified
- Return ONLY the JSON, no other text`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a flight intent parser. Return only valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 150
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content.trim();
    
    // Extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in response');
    }
    
    const intent = JSON.parse(jsonMatch[0]);
    
    // Validate required fields
    if (!intent.from || !intent.to) {
      throw new Error('Missing required fields: from, to');
    }
    
    return intent;
  } catch (error) {
    console.error('ChatGPT intent parsing failed:', error);
    
    // Fallback to basic parsing if ChatGPT fails
    return parseFlightIntentFallback(message);
  }
}

// Fallback intent parser (simplified version of the original)
function parseFlightIntentFallback(message) {
  const lowerMessage = message.toLowerCase();
  
  // Extract airport codes (simple pattern matching)
  const airportPattern = /(?:from|departing|leaving)\s+([A-Z]{3})/i;
  const toPattern = /(?:to|arriving|going to)\s+([A-Z]{3})/i;
  
  const fromMatch = message.match(airportPattern);
  const toMatch = message.match(toPattern);
  
  let from = fromMatch ? fromMatch[1].toUpperCase() : "JFK";
  let to = toMatch ? toMatch[1].toUpperCase() : "LAX";
  
  // Extract date patterns
  const datePatterns = [
    /(?:on|for)\s+(\d{1,2}\/\d{1,2}\/\d{4})/i,
    /(?:on|for)\s+(\d{4}-\d{2}-\d{2})/i,
    /(?:on|for)\s+(tomorrow)/i,
    /(?:on|for)\s+(next week)/i
  ];
  
  let date = new Date().toISOString().split('T')[0]; // Today
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
  const passengers = passengerMatch ? parseInt(passengerMatch[1]) : 1;
  
  // Extract travel class
  let travelClass = "economy";
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

    // Parse flight search intent using ChatGPT
    const flightIntent = await parseFlightIntentWithChatGPT(message);
    
    // Generate realistic flight search response
    const mockResponse = {
      success: true,
      message: `Found flights for your request: "${message}"`,
      intent: flightIntent,
      flights: [
        {
          flightNumber: "AA123",
          route: `${flightIntent.from} → ${flightIntent.to}`,
          time: "10:00 AM - 11:30 AM",
          stops: "Direct",
          price: "$299",
          seats: 4,
          airline: "American Airlines",
          class: flightIntent.class
        },
        {
          flightNumber: "DL456",
          route: `${flightIntent.from} → ${flightIntent.to}`,
          time: "2:00 PM - 3:30 PM", 
          stops: "1 stop",
          price: "$249",
          seats: 2,
          airline: "Delta Airlines",
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
