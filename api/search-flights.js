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

  // API Key Authentication
  const apiKey = req.headers['x-api-key'] || req.headers['X-API-Key'];
  if (!apiKey) {
    console.log(`[${requestId}] ❌ Missing API key`);
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'API key is required for this endpoint',
      code: 'MISSING_API_KEY',
      requestId
    });
  }

  // Validate API key
  const validApiKey = process.env.API_KEY;
  if (!validApiKey) {
    console.log(`[${requestId}] ⚠️ No API_KEY environment variable configured`);
    return res.status(500).json({
      error: 'Server Configuration Error',
      message: 'API authentication not properly configured',
      code: 'AUTH_NOT_CONFIGURED',
      requestId
    });
  }

  if (apiKey !== validApiKey) {
    console.log(`[${requestId}] ❌ Invalid API key`);
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid API key',
      code: 'INVALID_API_KEY',
      requestId
    });
  }

  console.log(`[${requestId}] ✅ API key validated successfully`);

  try {
    const { from, to, date, passengers = 1, travelClass = 'ECONOMY', userId } = req.body;
    
    console.log(`[${requestId}] 👤 User ID: ${userId || 'anonymous'}`);
    console.log(`[${requestId}] 🔍 Search parameters: from=${from}, to=${to}, date=${date}, passengers=${passengers}, class=${travelClass}`);
    
    if (!from || !to || !date) {
      console.log(`[${requestId}] ❌ Missing required parameters: from=${from}, to=${to}, date=${date}`);
      return res.status(400).json({ error: 'from, to, and date are required' });
    }

    // Validate date format and check if it's in the past
    let parsedDate;
    try {
      // Try to parse the date string
      parsedDate = new Date(date);
      
      // Check if the date is valid
      if (isNaN(parsedDate.getTime())) {
        console.log(`[${requestId}] ❌ Invalid date format: ${date}`);
        return res.status(400).json({ 
          error: 'Invalid date format',
          message: 'Please provide a valid date in YYYY-MM-DD format (e.g., 2025-01-15)',
          receivedDate: date,
          examples: ['2025-01-15', '2025-12-25', '2026-06-10']
        });
      }
      
      // Check if the date is in the past
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Start of today
      
      if (parsedDate < today) {
        console.log(`[${requestId}] ❌ Date is in the past: ${date} (today is ${today.toISOString().split('T')[0]})`);
        
        // Generate helpful date suggestions
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        
        const nextMonth = new Date(today);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        
        return res.status(400).json({ 
          error: 'Date cannot be in the past',
          message: 'Please select a future date for your flight search',
          receivedDate: date,
          today: today.toISOString().split('T')[0],
          suggestions: [
            'Try searching for tomorrow or later dates',
            'Use format: YYYY-MM-DD (e.g., 2025-01-15)',
            'Check that you\'re using the correct year'
          ],
          suggestedDates: [
            tomorrow.toISOString().split('T')[0],
            nextWeek.toISOString().split('T')[0],
            nextMonth.toISOString().split('T')[0]
          ],
          note: 'Suggested dates are automatically calculated from today'
        });
      }
      
      // Check if the date is too far in the future (Amadeus typically allows up to 1 year)
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
      
      if (parsedDate > oneYearFromNow) {
        console.log(`[${requestId}] ⚠️ Date is very far in the future: ${date}`);
        // Don't fail, but log a warning
        console.log(`[${requestId}] ⚠️ Date ${date} is more than 1 year away - Amadeus API may not support this`);
      }
      
      console.log(`[${requestId}] ✅ Date validation passed: ${date} (${parsedDate.toISOString().split('T')[0]})`);
      
    } catch (dateError) {
      console.error(`[${requestId}] ❌ Date parsing error:`, dateError);
      return res.status(400).json({ 
        error: 'Date parsing failed',
        message: 'Unable to parse the provided date. Please use YYYY-MM-DD format.',
        receivedDate: date,
        examples: ['2025-01-15', '2025-12-25', '2026-06-10']
      });
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
        
        // Check if this is a user-friendly error that we should return directly
        if (amadeusError.statusCode === 400 && amadeusError.userFriendlyMessage) {
          console.log(`[${requestId}] 📝 Returning user-friendly error: ${amadeusError.userFriendlyMessage}`);
          
          // Log Amadeus error telemetry
          logTelemetry('amadeus_search_error', {
            requestId,
            success: false,
            error: amadeusError.message,
            errorCode: amadeusError.errorCode,
            userFriendlyMessage: amadeusError.userFriendlyMessage,
            searchParams: { from, to, date, passengers, travelClass },
            userId: userId || 'anonymous'
          });
          
          // Return the user-friendly error instead of falling back to mock data
          return res.status(400).json({
            error: 'Flight search failed',
            message: amadeusError.userFriendlyMessage,
            suggestions: amadeusError.suggestions || [],
            requestId,
            errorCode: amadeusError.errorCode,
            searchParams: { from, to, date, passengers, travelClass }
          });
        }
        
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
      
      // Try to parse the error response for more details
      let errorDetails = {};
      try {
        errorDetails = JSON.parse(errorText);
      } catch (parseError) {
        console.log(`[${requestId}] ⚠️ Could not parse Amadeus error response:`, parseError);
      }
      
      // Provide specific error messages based on common Amadeus error codes
      let userFriendlyMessage = 'Flight search failed';
      let suggestions = [];
      
      if (errorDetails.errors && errorDetails.errors.length > 0) {
        const error = errorDetails.errors[0];
        
        switch (error.code) {
          case 425: // INVALID DATE
            if (error.detail && error.detail.includes('past')) {
              userFriendlyMessage = 'The selected date is in the past';
              suggestions = [
                'Please select a future date for your flight search',
                'Check that you\'re using the correct year',
                'Try searching for tomorrow or later dates'
              ];
            } else {
              userFriendlyMessage = 'Invalid date format or date';
              suggestions = [
                'Use YYYY-MM-DD format (e.g., 2025-01-15)',
                'Ensure the date is not in the past',
                'Check that the date is within the next 12 months'
              ];
            }
            break;
            
          case 400: // BAD REQUEST
            if (error.detail && error.detail.includes('origin')) {
              userFriendlyMessage = 'Invalid departure airport code';
              suggestions = [
                'Please use valid 3-letter airport codes (e.g., JFK, LAX, ORD)',
                'Check the spelling of your departure city',
                'Ensure the airport code exists in our system'
              ];
            } else if (error.detail && error.detail.includes('destination')) {
              userFriendlyMessage = 'Invalid arrival airport code';
              suggestions = [
                'Please use valid 3-letter airport codes (e.g., JFK, LAX, ORD)',
                'Check the spelling of your arrival city',
                'Ensure the airport code exists in our system'
              ];
            } else {
              userFriendlyMessage = 'Invalid search parameters';
              suggestions = [
                'Check all your search parameters',
                'Ensure airport codes are valid 3-letter codes',
                'Verify the date format is YYYY-MM-DD'
              ];
            }
            break;
            
          case 401: // UNAUTHORIZED
            userFriendlyMessage = 'Authentication failed';
            suggestions = [
              'This appears to be a system configuration issue',
              'Please try again later or contact support'
            ];
            break;
            
          case 429: // TOO MANY REQUESTS
            userFriendlyMessage = 'Too many search requests';
            suggestions = [
              'Please wait a moment before searching again',
              'Try reducing the frequency of your searches'
            ];
            break;
            
          case 500: // INTERNAL SERVER ERROR
          case 502: // BAD GATEWAY
          case 503: // SERVICE UNAVAILABLE
            userFriendlyMessage = 'Flight search service temporarily unavailable';
            suggestions = [
              'Please try again in a few minutes',
              'The flight search service may be experiencing issues'
            ];
            break;
            
          default:
            userFriendlyMessage = error.title || 'Flight search failed';
            suggestions = [
              'Please check your search parameters',
              'Try again with different dates or routes'
            ];
        }
      }
      
      // Log detailed error information
      logTelemetry('amadeus_search_error_detailed', {
        requestId,
        success: false,
        statusCode: searchResponse.status,
        errorCode: errorDetails.errors?.[0]?.code,
        errorTitle: errorDetails.errors?.[0]?.title,
        errorDetail: errorDetails.errors?.[0]?.detail,
        searchParams: { from, to, date, passengers, travelClass },
        userFriendlyMessage,
        suggestions
      });
      
      // Throw a more informative error
      const enhancedError = new Error(`Amadeus flight search failed: ${searchResponse.status} - ${userFriendlyMessage}`);
      enhancedError.statusCode = searchResponse.status;
      enhancedError.errorCode = errorDetails.errors?.[0]?.code;
      enhancedError.userFriendlyMessage = userFriendlyMessage;
      enhancedError.suggestions = suggestions;
      enhancedError.originalError = errorDetails;
      
      throw enhancedError;
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
