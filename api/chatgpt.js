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

    console.log(`[${requestId}] 👤 User ID: ${userId || 'missing - will prompt for one'}`);
    console.log(`[${requestId}] 💬 Processing message: "${message}"`);

    // If userId is missing, prompt the user to provide one
    if (!userId) {
      console.log(`[${requestId}] 🔍 No user ID provided - prompting user for identification`);
      
      const promptResponse = {
        success: false,
        requiresUserId: true,
        message: "To provide you with a personalized flight search experience, I need to know who you are. Please provide one of the following:\n\n" +
                 "• Your email address (e.g., 'demo@example.com')\n" +
                 "• A unique identifier code\n" +
                 "• Or just tell me your name and I'll create a profile for you\n\n" +
                 "Once you provide this, I'll remember your preferences and travel history for future searches.",
        requestId,
        nextStep: "Please respond with your identifier, and I'll search for flights with your personalized context.",
        examples: [
          "demo@example.com",
          "traveler123", 
          "My name is John and I'm a business traveler",
          "I'm Sarah, I prefer budget flights and window seats"
        ]
      };
      
      // Log the prompt telemetry
      logTelemetry('chatgpt_userid_prompt', {
        requestId,
        success: false,
        messageLength: message.length,
        promptType: 'user_identification'
      });
      
      return res.status(200).json(promptResponse);
    }

    // Parse flight search intent using ChatGPT
    const flightIntent = await parseFlightIntentWithChatGPT(message);
    
    // Now that we have a userId, let's get their profile for personalization
    console.log(`[${requestId}] 👤 Fetching user profile for personalization: ${userId}`);
    
    let userProfile = null;
    let profileFetchDuration = 0;
    
    try {
      const profileStartTime = Date.now();
      
      // Call the users endpoint to get profile data
      const profileResponse = await fetch(`${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/users/${encodeURIComponent(userId)}`, {
        method: 'GET',
        headers: {
          'X-Request-ID': requestId,
          'X-Source': 'chatgpt-endpoint'
        }
      });
      
      if (profileResponse.ok) {
        userProfile = await profileResponse.json();
        profileFetchDuration = Date.now() - profileStartTime;
        console.log(`[${requestId}] ✅ User profile retrieved: ${userProfile.displayName} (${userProfile.role})`);
        
        // Log successful profile retrieval
        logTelemetry('chatgpt_user_profile_retrieved', {
          requestId,
          success: true,
          duration: profileFetchDuration,
          userId,
          hasPreferences: !!userProfile.preferences,
          hasRecentContext: !!userProfile.recentContext,
          userRole: userProfile.role
        });
        
        // Personalize the response based on user profile
        if (userProfile.preferences) {
          console.log(`[${requestId}] 🎨 Applying user preferences:`, userProfile.preferences);
          
          // Adjust flight search based on preferences
          if (userProfile.preferences.preferredAirlines && userProfile.preferences.preferredAirlines.length > 0) {
            console.log(`[${requestId}] ✈️ User prefers airlines:`, userProfile.preferences.preferredAirlines);
          }
          
          if (userProfile.preferences.travelStyle) {
            console.log(`[${requestId}] 🎯 User travel style:`, userProfile.preferences.travelStyle);
          }
        }
        
        // Show recent context to user
        if (userProfile.recentContext && userProfile.recentContext.length > 0) {
          console.log(`[${requestId}] 📚 User recent context:`, userProfile.recentContext);
        }
        
      } else if (profileResponse.status === 404) {
        // User profile doesn't exist, create one
        console.log(`[${requestId}] 🆕 User profile not found, will create one after flight search`);
        
        logTelemetry('chatgpt_user_profile_not_found', {
          requestId,
          success: false,
          userId,
          action: 'will_create_after_search'
        });
        
      } else {
        console.log(`[${requestId}] ⚠️ Profile fetch failed: ${profileResponse.status}`);
      }
      
    } catch (profileError) {
      console.error(`[${requestId}] ❌ Profile fetch error:`, profileError);
      
      logTelemetry('chatgpt_user_profile_error', {
        requestId,
        success: false,
        error: profileError.message,
        userId
      });
      
      // Continue without profile - don't fail the entire request
    }
    
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
        searchDuration: searchDuration,
        userProfile: userProfile ? {
          displayName: userProfile.displayName,
          role: userProfile.role,
          preferences: userProfile.preferences,
          recentContext: userProfile.recentContext
        } : null
      };
      
      // If user profile doesn't exist, create one with the search context
      if (!userProfile && searchData.flights && searchData.flights.length > 0) {
        console.log(`[${requestId}] 🆕 Creating new user profile for: ${userId}`);
        
        try {
          const createProfileResponse = await fetch(`${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/users/${encodeURIComponent(userId)}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Request-ID': requestId,
              'X-Source': 'chatgpt-endpoint'
            },
            body: JSON.stringify({
              displayName: userId.includes('@') ? userId.split('@')[0] : userId,
              role: 'Traveler',
              preferences: {
                tone: 'friendly',
                format: 'detailed',
                travelStyle: 'flexible'
              },
              recentContext: [
                `First flight search: ${flightIntent.from} → ${flightIntent.to}`,
                `Searched for ${flightIntent.passengers} passenger(s)`,
                `Preferred class: ${flightIntent.class}`,
                `Found ${searchData.flights.length} flights`
              ],
              consent: true
            })
          });
          
          if (createProfileResponse.ok) {
            const newProfile = await createProfileResponse.json();
            console.log(`[${requestId}] ✅ New user profile created successfully`);
            
            // Update response with new profile
            response.userProfile = {
              displayName: newProfile.displayName || userId,
              role: newProfile.role || 'Traveler',
              preferences: newProfile.preferences || {},
              recentContext: newProfile.recentContext || [],
              isNewProfile: true
            };
            
            logTelemetry('chatgpt_user_profile_created', {
              requestId,
              success: true,
              userId,
              profileData: response.userProfile
            });
            
          } else {
            console.log(`[${requestId}] ⚠️ Failed to create user profile: ${createProfileResponse.status}`);
          }
          
        } catch (createError) {
          console.error(`[${requestId}] ❌ Profile creation error:`, createError);
          
          logTelemetry('chatgpt_user_profile_creation_error', {
            requestId,
            success: false,
            error: createError.message,
            userId
          });
        }
      }
      
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
        dataSource: searchData.dataSource || 'unknown',
        hasUserProfile: !!response.userProfile,
        profileFetchDuration: profileFetchDuration
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
        note: 'Real flight search failed, showing sample data',
        userProfile: userProfile ? {
          displayName: userProfile.displayName,
          role: userProfile.role,
          preferences: userProfile.preferences,
          recentContext: userProfile.recentContext
        } : null
      };

      // If user profile doesn't exist, create one with the fallback context
      if (!userProfile) {
        console.log(`[${requestId}] 🆕 Creating new user profile for: ${userId} (fallback mode)`);
        
        try {
          const createProfileResponse = await fetch(`${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/users/${encodeURIComponent(userId)}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Request-ID': requestId,
              'X-Source': 'chatgpt-endpoint-fallback'
            },
            body: JSON.stringify({
              displayName: userId.includes('@') ? userId.split('@')[0] : userId,
              role: 'Traveler',
              preferences: {
                tone: 'friendly',
                format: 'detailed',
                travelStyle: 'flexible'
              },
              recentContext: [
                `First flight search (fallback): ${flightIntent.from} → ${flightIntent.to}`,
                `Searched for ${flightIntent.passengers} passenger(s)`,
                `Preferred class: ${flightIntent.class}`,
                `Used fallback data due to search failure`
              ],
              consent: true
            })
          });
          
          if (createProfileResponse.ok) {
            const newProfile = await createProfileResponse.json();
            console.log(`[${requestId}] ✅ New user profile created successfully (fallback mode)`);
            
            // Update response with new profile
            mockResponse.userProfile = {
              displayName: newProfile.displayName || userId,
              role: newProfile.role || 'Traveler',
              preferences: newProfile.preferences || {},
              recentContext: newProfile.recentContext || [],
              isNewProfile: true
            };
            
            logTelemetry('chatgpt_user_profile_created_fallback', {
              requestId,
              success: true,
              userId,
              profileData: mockResponse.userProfile,
              mode: 'fallback'
            });
            
          } else {
            console.log(`[${requestId}] ⚠️ Failed to create user profile (fallback mode): ${createProfileResponse.status}`);
          }
          
        } catch (createError) {
          console.error(`[${requestId}] ❌ Profile creation error (fallback mode):`, createError);
          
          logTelemetry('chatgpt_user_profile_creation_error_fallback', {
            requestId,
            success: false,
            error: createError.message,
            userId,
            mode: 'fallback'
          });
        }
      }
      
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
