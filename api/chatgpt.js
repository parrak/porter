// Flight intent parser using ChatGPT
async function parseFlightIntentWithChatGPT(message) {
  const startTime = Date.now();
  const requestId = generateRequestId();
  
  console.log(`[${requestId}] 🚀 Starting ChatGPT intent parsing for message: "${message}"`);
  
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

    console.log(`[${requestId}] 📤 Sending request to OpenAI API...`);
    console.log(`[${requestId}] 📝 Prompt: ${prompt.substring(0, 100)}...`);
    
    const openaiStartTime = Date.now();
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

    const openaiEndTime = Date.now();
    const openaiDuration = openaiEndTime - openaiStartTime;
    
    console.log(`[${requestId}] ⏱️ OpenAI API response time: ${openaiDuration}ms`);
    console.log(`[${requestId}] 📊 OpenAI API status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[${requestId}] ❌ OpenAI API error: ${response.status} - ${errorText}`);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`[${requestId}] ✅ OpenAI API response received successfully`);
    console.log(`[${requestId}] 📈 OpenAI API usage: ${JSON.stringify(data.usage)}`);
    
    const content = data.choices[0].message.content.trim();
    console.log(`[${requestId}] 📄 Raw ChatGPT response: ${content}`);
    
    // Extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error(`[${requestId}] ❌ No valid JSON found in ChatGPT response`);
      throw new Error('No valid JSON found in response');
    }
    
    const intent = JSON.parse(jsonMatch[0]);
    console.log(`[${requestId}] 🎯 Parsed intent: ${JSON.stringify(intent)}`);
    
    // Validate required fields
    if (!intent.from || !intent.to) {
      console.error(`[${requestId}] ❌ Missing required fields in parsed intent: ${JSON.stringify(intent)}`);
      throw new Error('Missing required fields: from, to');
    }
    
    const totalDuration = Date.now() - startTime;
    console.log(`[${requestId}] 🎉 ChatGPT intent parsing completed successfully in ${totalDuration}ms`);
    
    // Log telemetry data
    logTelemetry('chatgpt_intent_parsing', {
      requestId,
      success: true,
      duration: totalDuration,
      openaiDuration,
      messageLength: message.length,
      intent,
      openaiUsage: data.usage
    });
    
    return intent;
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error(`[${requestId}] ❌ ChatGPT intent parsing failed after ${totalDuration}ms:`, error);
    
    // Log error telemetry
    logTelemetry('chatgpt_intent_parsing_error', {
      requestId,
      success: false,
      duration: totalDuration,
      error: error.message,
      messageLength: message.length
    });
    
    // Fallback to basic parsing if ChatGPT fails
    console.log(`[${requestId}] 🔄 Falling back to basic intent parser...`);
    return parseFlightIntentFallback(message);
  }
}

// Fallback intent parser (simplified version of the original)
function parseFlightIntentFallback(message) {
  const requestId = generateRequestId();
  console.log(`[${requestId}] 🔄 Using fallback intent parser for message: "${message}"`);
  
  const startTime = Date.now();
  
  try {
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
    
    const intent = { from, to, date, passengers, class: travelClass };
    const duration = Date.now() - startTime;
    
    console.log(`[${requestId}] ✅ Fallback parser completed in ${duration}ms: ${JSON.stringify(intent)}`);
    
    // Log fallback telemetry
    logTelemetry('fallback_intent_parsing', {
      requestId,
      success: true,
      duration,
      method: 'regex_patterns',
      intent
    });
    
    return intent;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] ❌ Fallback parser failed after ${duration}ms:`, error);
    
    logTelemetry('fallback_intent_parsing_error', {
      requestId,
      success: false,
      duration,
      error: error.message
    });
    
    // Return default values as last resort
    return { from: "JFK", to: "LAX", date: new Date().toISOString().split('T')[0], passengers: 1, class: "economy" };
  }
}

// Utility functions
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

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

// ChatGPT API endpoint for Vercel
module.exports = async (req, res) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  console.log(`[${requestId}] 🌐 New request received: ${req.method} ${req.url}`);
  console.log(`[${requestId}] 📋 Request headers: ${JSON.stringify(req.headers)}`);
  
  // Set CORS headers to allow all origins
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    console.log(`[${requestId}] ✅ Preflight OPTIONS request handled`);
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
    console.log(`[${requestId}] ❌ Method not allowed: ${req.method}`);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, userId } = req.body;
    
    if (!message) {
      console.log(`[${requestId}] ❌ Missing message in request body`);
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log(`[${requestId}] 👤 User ID: ${userId || 'anonymous'}`);
    console.log(`[${requestId}] 💬 Processing message: "${message}"`);

    // Parse flight search intent using ChatGPT
    const flightIntent = await parseFlightIntentWithChatGPT(message);
    
    // Generate realistic flight search response
    console.log(`[${requestId}] 🔍 Making actual flight search call to search-flights endpoint...`);
    
    try {
      // Call the search-flights endpoint with the parsed intent
      const searchStartTime = Date.now();
      
      // Prepare search parameters
      const searchParams = {
        from: flightIntent.from,
        to: flightIntent.to,
        date: flightIntent.date,
        passengers: flightIntent.passengers,
        travelClass: flightIntent.class.toUpperCase(),
        userId: userId || 'anonymous'
      };
      
      console.log(`[${requestId}] 📤 Calling search-flights with params:`, searchParams);
      
      // Make internal call to search-flights endpoint
      const searchResponse = await fetch(`${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/search-flights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
          'X-Source': 'chatgpt-endpoint'
        },
        body: JSON.stringify(searchParams)
      });
      
      if (!searchResponse.ok) {
        throw new Error(`Search flights API returned ${searchResponse.status}: ${await searchResponse.text()}`);
      }
      
      const searchData = await searchResponse.json();
      const searchDuration = Date.now() - searchStartTime;
      
      console.log(`[${requestId}] ✅ Search flights completed in ${searchDuration}ms, found ${searchData.flights?.length || 0} flights`);
      
      // Log successful search telemetry
      logTelemetry('chatgpt_flight_search_success', {
        requestId,
        success: true,
        searchDuration,
        flightsFound: searchData.flights?.length || 0,
        dataSource: searchData.dataSource || 'unknown',
        userId: userId || 'anonymous',
        intent: flightIntent
      });
      
      // Return the actual search results
      const response = {
        success: true,
        message: `Found ${searchData.flights?.length || 0} flights for your request: "${message}"`,
        intent: flightIntent,
        requestId,
        flights: searchData.flights || [],
        searchParams: searchData.searchParams || searchParams,
        dataSource: searchData.dataSource || 'unknown',
        searchDuration: searchDuration
      };
      
      const totalDuration = Date.now() - startTime;
      console.log(`[${requestId}] 🎉 Request completed successfully in ${totalDuration}ms (with real flight search)`);
      
      // Log successful request telemetry
      logTelemetry('chatgpt_api_request', {
        requestId,
        success: true,
        duration: totalDuration,
        searchDuration: searchDuration,
        userId: userId || 'anonymous',
        messageLength: message.length,
        intent: flightIntent,
        flightsFound: searchData.flights?.length || 0,
        dataSource: searchData.dataSource || 'unknown'
      });

      res.status(200).json(response);
      
    } catch (searchError) {
      console.error(`[${requestId}] ❌ Flight search failed:`, searchError);
      
      // Log search error telemetry
      logTelemetry('chatgpt_flight_search_error', {
        requestId,
        success: false,
        error: searchError.message,
        userId: userId || 'anonymous',
        intent: flightIntent
      });
      
      // Fallback to mock response if search fails
      console.log(`[${requestId}] 🔄 Falling back to mock flight data due to search failure...`);
      
      const mockResponse = {
        success: true,
        message: `Found flights for your request: "${message}" (using fallback data)`,
        intent: flightIntent,
        requestId,
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
        },
        dataSource: 'fallback_mock_data',
        note: 'Real flight search failed, showing sample data'
      };

      const totalDuration = Date.now() - startTime;
      console.log(`[${requestId}] 🎉 Request completed with fallback data in ${totalDuration}ms`);
      
      // Log fallback telemetry
      logTelemetry('chatgpt_api_request_fallback', {
        requestId,
        success: true,
        duration: totalDuration,
        userId: userId || 'anonymous',
        messageLength: message.length,
        intent: flightIntent,
        dataSource: 'fallback_mock_data',
        searchError: searchError.message
      });

      res.status(200).json(mockResponse);
    }
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error(`[${requestId}] ❌ Request failed after ${totalDuration}ms:`, error);
    
    // Log error telemetry
    logTelemetry('chatgpt_api_error', {
      requestId,
      success: false,
      duration: totalDuration,
      error: error.message,
      userId: req.body?.userId || 'anonymous'
    });
    
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      requestId
    });
  }
};
