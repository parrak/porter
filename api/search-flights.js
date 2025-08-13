// Flight Search API endpoint for Vercel
module.exports = async (req, res) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  console.log(`[${requestId}] 🌐 Flight search request received: ${req.method} ${req.url}`);
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
    const { from, to, date, passengers = 1, travelClass = 'ECONOMY', userId } = req.body;
    
    console.log(`[${requestId}] 👤 User ID: ${userId || 'anonymous'}`);
    console.log(`[${requestId}] 🔍 Search parameters: from=${from}, to=${to}, date=${date}, passengers=${passengers}, class=${travelClass}`);
    
    if (!from || !to || !date) {
      console.log(`[${requestId}] ❌ Missing required parameters: from=${from}, to=${to}, date=${date}`);
      return res.status(400).json({ error: 'from, to, and date are required' });
    }

    // Log search attempt
    logTelemetry('flight_search_attempt', {
      requestId,
      searchParams: { from, to, date, passengers, travelClass },
      userId: userId || 'anonymous'
    });

    // Check if we should use Amadeus API for real flight data
    if (process.env.AMADEUS_CLIENT_ID && process.env.AMADEUS_CLIENT_SECRET) {
      console.log(`[${requestId}] 🚀 Attempting real flight search via Amadeus API...`);
      
      try {
        const amadeusStartTime = Date.now();
        const realFlights = await searchAmadeusFlights(from, to, date, passengers, travelClass, requestId);
        const amadeusDuration = Date.now() - amadeusStartTime;
        
        console.log(`[${requestId}] ✅ Amadeus API search completed in ${amadeusDuration}ms`);
        
        // Log successful Amadeus search
        logTelemetry('amadeus_search_success', {
          requestId,
          success: true,
          duration: amadeusDuration,
          searchParams: { from, to, date, passengers, travelClass },
          flightsFound: realFlights.length,
          userId: userId || 'anonymous'
        });
        
        const response = {
          success: true,
          searchParams: { from, to, date, passengers, travelClass },
          flightsFound: realFlights.length,
          flights: realFlights,
          message: `Found ${realFlights.length} real flights from ${from} to ${to} on ${date}`,
          requestId,
          dataSource: 'amadeus_api'
        };
        
        const totalDuration = Date.now() - startTime;
        console.log(`[${requestId}] 🎉 Flight search completed successfully in ${totalDuration}ms (Amadeus)`);
        
        res.status(200).json(response);
        return;
        
      } catch (amadeusError) {
        console.error(`[${requestId}] ❌ Amadeus API search failed:`, amadeusError);
        
        // Log Amadeus error telemetry
        logTelemetry('amadeus_search_error', {
          requestId,
          success: false,
          error: amadeusError.message,
          searchParams: { from, to, date, passengers, travelClass },
          userId: userId || 'anonymous'
        });
        
        console.log(`[${requestId}] 🔄 Falling back to mock flight data...`);
      }
    } else {
      console.log(`[${requestId}] ⚠️ Amadeus credentials not configured, using mock data`);
    }

    // Mock flight search response (fallback)
    console.log(`[${requestId}] 🎭 Generating mock flight data...`);
    
    const mockFlights = [
      {
        flightNumber: 123,
        route: `${from} → ${to}`,
        time: "10:00 AM - 11:30 AM",
        stops: "Direct",
        price: "$299",
        seats: 4,
        airline: "Mock Airlines",
        class: travelClass
      },
      {
        flightNumber: 456,
        route: `${from} → ${to}`,
        time: "2:00 PM - 3:30 PM", 
        stops: "1 stop",
        price: "$249",
        seats: 2,
        airline: "Mock Airlines",
        class: travelClass
      }
    ];

    const response = {
      success: true,
      searchParams: { from, to, date, passengers, travelClass },
      flightsFound: mockFlights.length,
      flights: mockFlights,
      message: `Found ${mockFlights.length} flights from ${from} to ${to} on ${date}`,
      requestId,
      dataSource: 'mock_data'
    };

    const totalDuration = Date.now() - startTime;
    console.log(`[${requestId}] 🎉 Flight search completed successfully in ${totalDuration}ms (Mock)`);
    
    // Log successful mock search
    logTelemetry('flight_search_success', {
      requestId,
      success: true,
      duration: totalDuration,
      searchParams: { from, to, date, passengers, travelClass },
      flightsFound: mockFlights.length,
      dataSource: 'mock_data',
      userId: userId || 'anonymous'
    });

    res.status(200).json(response);
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error(`[${requestId}] ❌ Flight search failed after ${totalDuration}ms:`, error);
    
    // Log error telemetry
    logTelemetry('flight_search_error', {
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

// Amadeus flight search function
async function searchAmadeusFlights(from, to, date, passengers, travelClass, requestId) {
  console.log(`[${requestId}] 🔑 Getting Amadeus access token...`);
  
  try {
    // Get Amadeus access token
    const tokenResponse = await fetch('https://test.api.amadeus.com/v1/security/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.AMADEUS_CLIENT_ID,
        client_secret: process.env.AMADEUS_CLIENT_SECRET
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error(`[${requestId}] ❌ Amadeus token request failed: ${tokenResponse.status} - ${errorText}`);
      throw new Error(`Amadeus token request failed: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();
    console.log(`[${requestId}] ✅ Amadeus access token obtained successfully`);
    
    // Search for flights
    console.log(`[${requestId}] 🔍 Searching Amadeus for flights: ${from} → ${to} on ${date}`);
    
    const searchResponse = await fetch(`https://test.api.amadeus.com/v2/shopping/flight-offers?originLocationCode=${from}&destinationLocationCode=${to}&departureDate=${date}&adults=${passengers}&travelClass=${travelClass}&max=5`, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error(`[${requestId}] ❌ Amadeus flight search failed: ${searchResponse.status} - ${errorText}`);
      throw new Error(`Amadeus flight search failed: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    console.log(`[${requestId}] ✅ Amadeus flight search completed, found ${searchData.data?.length || 0} flights`);
    
    // Transform Amadeus data to our format
    const flights = (searchData.data || []).map((flight, index) => ({
      flightNumber: flight.itineraries[0]?.segments[0]?.carrierCode + flight.itineraries[0]?.segments[0]?.number || `AM${index + 1}`,
      route: `${from} → ${to}`,
      time: `${flight.itineraries[0]?.segments[0]?.departure?.at?.substring(11, 16)} - ${flight.itineraries[0]?.segments[flight.itineraries[0]?.segments.length - 1]?.arrival?.at?.substring(11, 16)}`,
      stops: flight.itineraries[0]?.segments.length > 1 ? `${flight.itineraries[0]?.segments.length - 1} stop(s)` : "Direct",
      price: flight.pricingOptions[0]?.price?.total || "N/A",
      seats: flight.numberOfBookableSeats || 1,
      airline: flight.validatingAirlineCodes?.[0] || "Amadeus Airlines",
      class: travelClass,
      amadeusData: flight
    }));
    
    return flights;
    
  } catch (error) {
    console.error(`[${requestId}] ❌ Amadeus API error:`, error);
    throw error;
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
