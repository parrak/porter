// Flight intent parser using ChatGPT
const { executeQuery } = require('../database/connection');
const { searchFlights } = require('../flight-search');
const { storeFlightOffersInContext } = require('./get-flight-offers');

async function parseFlightIntentWithChatGPT(message) {
  const startTime = Date.now();
  const requestId = generateRequestId();
  
  console.log(`[${requestId}] 🚀 Starting ChatGPT intent parsing for message: "${message}"`);
  
  try {
    // Use ChatGPT to parse the flight intent - make prompt more explicit for GPT-5
    const prompt = `Parse this flight request and return ONLY a JSON object. No explanations, no text, just JSON.

Input: "${message}"

Return this exact JSON structure:
{
  "origin": "airport_code",
  "destination": "airport_code", 
  "date": "YYYY-MM-DD",
  "passengers": number,
  "class": "economy"
}

Rules:
- Convert cities to airport codes: "New York" → "JFK", "Los Angeles" → "LAX", "Chicago" → "ORD", "San Francisco" → "SFO"
- Parse dates to YYYY-MM-DD format
- Default: 1 passenger, economy class
- If no date given, use a future date (not today)

Example: "Find me a flight from New York to Los Angeles on September 20th"
Output: {"origin":"JFK","destination":"LAX","date":"2025-09-20","passengers":1,"class":"economy"}`;

    console.log(`[${requestId}] 📤 Sending request to OpenAI API...`);
    console.log(`[${requestId}] 📝 Prompt: ${prompt.substring(0, 100)}...`);
    
    // Try multiple models with fallback
    const models = [
      { name: 'gpt-5', maxTokens: 150 },
      { name: 'gpt-4o', maxTokens: 150 },
      { name: 'gpt-4-turbo', maxTokens: 150 }
    ];
    
    let content = '';
    let successfulModel = null;
    let openaiDuration = 0;
    let openaiUsage = null;
    
    for (const model of models) {
      try {
        console.log(`[${requestId}] 🔄 Trying model: ${model.name}`);
        
        const openaiStartTime = Date.now();
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: model.name,
            messages: [
              {
                role: 'system',
                content: 'You are a flight intent parser. You must return ONLY valid JSON. No explanations, no markdown, no additional text.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            max_completion_tokens: model.maxTokens
          })
        });

        const openaiEndTime = Date.now();
        openaiDuration = openaiEndTime - openaiStartTime;
        
        console.log(`[${requestId}] ⏱️ OpenAI API response time: ${openaiDuration}ms`);
        console.log(`[${requestId}] 📊 OpenAI API status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
          const errorText = await response.text();
          console.log(`[${requestId}] ⚠️ Model ${model.name} failed: ${response.status} - ${errorText}`);
          continue; // Try next model
        }

        const data = await response.json();
        console.log(`[${requestId}] ✅ OpenAI API response received successfully from ${model.name}`);
        console.log(`[${requestId}] 📈 OpenAI API usage: ${JSON.stringify(data.usage)}`);
        
        content = data.choices[0].message.content.trim();
        console.log(`[${requestId}] 📄 Raw ChatGPT response from ${model.name}: ${content}`);
        console.log(`[${requestId}] 📏 Response length: ${content.length} characters`);
        
        // Check if response is empty - this is the main issue
        if (!content || content.length === 0) {
          console.log(`[${requestId}] ⚠️ Model ${model.name} returned empty response, trying next model...`);
          continue; // Try next model
        }
        
        // If we get here, we have a successful response
        successfulModel = model.name;
        break;
        
      } catch (modelError) {
        console.log(`[${requestId}] ⚠️ Model ${model.name} failed with error:`, modelError.message);
        continue; // Try next model
      }
    }
    
    if (!content) {
      throw new Error('All OpenAI models failed to provide a response');
    }
    
    console.log(`[${requestId}] ✅ Successfully parsed intent using ${successfulModel}`);
    
    // Parse the JSON response
    let intent;
    let cleanContent; // Declare outside try block for error logging
    try {
      // Clean the content to handle markdown formatting
      cleanContent = content.trim();
      
      // Remove markdown code blocks if present
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      // Clean up any remaining whitespace
      cleanContent = cleanContent.trim();
      
      console.log(`[${requestId}] 🔧 Cleaned content for JSON parsing:`, cleanContent);
      
      intent = JSON.parse(cleanContent);
      console.log(`[${requestId}] 📋 Parsed intent:`, intent);
    } catch (parseError) {
      console.error(`[${requestId}] ❌ Failed to parse JSON response:`, parseError);
      console.error(`[${requestId}] ❌ Raw content was:`, content);
      console.error(`[${requestId}] ❌ Cleaned content was:`, cleanContent);
      throw new Error('Invalid JSON response from ChatGPT');
    }
    
    // Validate required fields
    if (!intent.origin || !intent.destination) {
      console.error(`[${requestId}] ❌ Missing required fields in parsed intent: ${JSON.stringify(intent)}`);
      throw new Error('Missing required fields: origin, destination');
    }
    
    // Normalize the intent object
    const flightIntent = {
      origin: intent.origin,
      destination: intent.destination,
      date: intent.date || intent.departureDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default to 1 week from now
      passengers: intent.passengers || intent.adults || 1,
      class: intent.class || intent.travelClass || 'economy'
    };
    
    console.log(`[${requestId}] ✅ Normalized flight intent:`, flightIntent);
    
    // Log successful parsing telemetry
    logTelemetry('chatgpt_intent_parsing_success', {
      requestId,
      success: true,
      duration: Date.now() - startTime,
      openaiDuration,
      openaiUsage,
      model: successfulModel,
      messageLength: message.length,
      intent: flightIntent
    });
    
    return flightIntent;
    
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error(`[${requestId}] ❌ Intent parsing failed after ${totalDuration}ms:`, error);
    
    // Log error telemetry
    logTelemetry('chatgpt_intent_parsing_error', {
      requestId,
      success: false,
      duration: totalDuration,
      error: error.message,
      messageLength: message.length
    });
    
    throw error;
  }
}

// Fallback intent parser (improved version)
function parseFlightIntentFallback(message) {
  const requestId = generateRequestId();
  console.log(`[${requestId}] 🔄 Using fallback intent parser for message: "${message}"`);
  
  const startTime = Date.now();
  
  try {
    const lowerMessage = message.toLowerCase();
    
    // Improved city to airport code mapping
    const cityToAirport = {
      'new york': 'JFK',
      'los angeles': 'LAX', 
      'chicago': 'ORD',
      'san francisco': 'SFO',
      'miami': 'MIA',
      'atlanta': 'ATL',
      'dallas': 'DFW',
      'denver': 'DEN',
      'seattle': 'SEA',
      'boston': 'BOS',
      'phoenix': 'PHX',
      'las vegas': 'LAS',
      'orlando': 'MCO',
      'charlotte': 'CLT',
      'detroit': 'DTW',
      'minneapolis': 'MSP',
      'philadelphia': 'PHL',
      'houston': 'IAH',
      'fort lauderdale': 'FLL',
      'baltimore': 'BWI'
    };
    
    // Extract origin and destination with better pattern matching
    let from = 'JFK'; // Default
    let to = 'LAX';   // Default
    
    // Look for city names first, then airport codes
    for (const [city, airport] of Object.entries(cityToAirport)) {
      if (lowerMessage.includes(city)) {
        if (lowerMessage.indexOf(city) < lowerMessage.indexOf('to') || lowerMessage.indexOf(city) < lowerMessage.indexOf('los angeles')) {
          from = airport;
        } else {
          to = airport;
        }
      }
    }
    
    // Also look for airport codes
    const airportCodePattern = /\b([A-Z]{3})\b/g;
    const airportCodes = message.match(airportCodePattern);
    if (airportCodes && airportCodes.length >= 2) {
      from = airportCodes[0];
      to = airportCodes[1];
    }
    
    // Improved date parsing
    let date = new Date();
    
    // Look for specific date patterns
    const datePatterns = [
      // Month names
      /(?:on|for)\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?/i,
      // Numeric dates
      /(?:on|for)\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/i,
      // ISO dates
      /(?:on|for)\s+(\d{4})-(\d{2})-(\d{2})/i,
      // Relative dates
      /(?:on|for)\s+(tomorrow|next week|next month)/i
    ];
    
    let dateFound = false;
    for (const pattern of datePatterns) {
      const match = message.match(pattern);
      if (match) {
        if (match[1] === "tomorrow") {
          date.setDate(date.getDate() + 1);
          dateFound = true;
        } else if (match[1] === "next week") {
          date.setDate(date.getDate() + 7);
          dateFound = true;
        } else if (match[1] === "next month") {
          date.setMonth(date.getMonth() + 1);
          dateFound = true;
        } else if (pattern.source.includes('january|february')) {
          // Month name pattern
          const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
          const monthIndex = monthNames.indexOf(match[1].toLowerCase());
          const day = parseInt(match[2]);
          const year = date.getFullYear();
          
          // If the month has passed this year, use next year
          if (monthIndex < date.getMonth() || (monthIndex === date.getMonth() && day <= date.getDate())) {
            date.setFullYear(year + 1);
          }
          
          date.setMonth(monthIndex);
          date.setDate(day);
          dateFound = true;
        } else if (pattern.source.includes('\\d{1,2}\\/\\d{1,2}')) {
          // Numeric date pattern
          const month = parseInt(match[1]) - 1; // Month is 0-indexed
          const day = parseInt(match[2]);
          const year = parseInt(match[3]);
          
          date.setFullYear(year);
          date.setMonth(month);
          date.setDate(day);
          dateFound = true;
        } else if (pattern.source.includes('\\d{4}-\\d{2}')) {
          // ISO date pattern
          const year = parseInt(match[1]);
          const month = parseInt(match[2]) - 1;
          const day = parseInt(match[3]);
          
          date.setFullYear(year);
          date.setMonth(month);
          date.setDate(day);
          dateFound = true;
        }
        break;
      }
    }
    
    // If no specific date found, use a future date (not today)
    if (!dateFound) {
      date.setDate(date.getDate() + 7); // Default to next week
    }
    
    const dateString = date.toISOString().split('T')[0];
    
    // Extract passenger count
    const passengerPattern = /(\d+)\s+(?:passenger|person|people)/i;
    const passengerMatch = message.match(passengerPattern);
    const passengers = passengerMatch ? parseInt(passengerMatch[1]) : 1;
    
    // Extract travel class
    let travelClass = "economy";
    if (lowerMessage.includes("business")) travelClass = "business";
    if (lowerMessage.includes("first")) travelClass = "first";
    
    const intent = { from, to, date: dateString, passengers, class: travelClass };
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
    
    // Return default values as last resort - use correct parameter names
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 7); // Next week
    return { 
      origin: "JFK", 
      destination: "LAX", 
      departureDate: defaultDate.toISOString().split('T')[0], 
      adults: 1, 
      travelClass: "economy" 
    };
  }
}

// Helper function to detect if the message is a booking request
async function detectBookingIntent(message, requestId) {
  console.log(`[${requestId}] 🔍 Detecting booking intent in message: "${message}"`);
  
  const lowerMessage = message.toLowerCase();
  
  // Keywords that indicate booking intent
  const bookingKeywords = [
    'book', 'booking', 'reserve', 'reservation', 'confirm', 'confirmation',
    'purchase', 'buy', 'pay', 'payment', 'card', 'credit', 'debit',
    'passport', 'document', 'id', 'birth', 'date of birth', 'expiry',
    'contact', 'email', 'phone', 'address', 'details', 'information'
  ];
  
  // Check if message contains booking-related keywords
  const hasBookingKeywords = bookingKeywords.some(keyword => 
    lowerMessage.includes(keyword)
  );
  
  // Check for specific booking patterns
  const bookingPatterns = [
    /book\s+(?:a\s+)?(?:flight|ticket)/i,
    /reserve\s+(?:a\s+)?(?:flight|ticket)/i,
    /confirm\s+(?:a\s+)?(?:flight|ticket)/i,
    /purchase\s+(?:a\s+)?(?:flight|ticket)/i,
    /pay\s+for\s+(?:a\s+)?(?:flight|ticket)/i,
    /i\s+want\s+to\s+(?:book|reserve|confirm|purchase)/i,
    /can\s+you\s+(?:book|reserve|confirm|purchase)/i
  ];
  
  const hasBookingPatterns = bookingPatterns.some(pattern => 
    pattern.test(message)
  );
  
  const isBookingRequest = hasBookingKeywords || hasBookingPatterns;
  
  console.log(`[${requestId}] 🎯 Booking intent detected: ${isBookingRequest} (keywords: ${hasBookingKeywords}, patterns: ${hasBookingPatterns})`);
  
  return isBookingRequest;
}

// Helper function to extract booking information from the message
async function extractBookingInfo(message, flightIntent, requestId) {
  console.log(`[${requestId}] 🔍 Extracting booking information from message...`);
  
  try {
    // First, check if user has saved passenger details
    let savedPassengers = [];
    let hasSavedDetails = false;
    
    try {
      // Try to fetch saved passenger details (this would require user authentication)
      // For now, we'll simulate this with a mock response
      const mockSavedPassengers = [
        {
          id: '1',
          passenger_type: 'adult',
          title: 'Mr',
          first_name: 'John',
          last_name: 'Doe',
          date_of_birth: '1990-01-01',
          document_type: 'passport',
          document_number: 'AB123456',
          document_expiry_date: '2030-01-01',
          nationality: 'US',
          is_primary_passenger: true,
          is_favorite: true
        }
      ];
      
      savedPassengers = mockSavedPassengers;
      hasSavedDetails = true;
      
      console.log(`[${requestId}] 💾 Found ${savedPassengers.length} saved passenger details`);
    } catch (error) {
      console.log(`[${requestId}] ⚠️ Could not fetch saved passenger details: ${error.message}`);
    }
    
    // Use ChatGPT to extract structured booking information
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-5',
        messages: [
          {
            role: 'system',
            content: `You are a flight booking assistant. Extract passenger and contact information from the user's message. Return ONLY a valid JSON object with this structure:
{
  "passengers": [
    {
      "firstName": "string",
      "lastName": "string", 
      "dateOfBirth": "YYYY-MM-DD",
      "documentNumber": "string",
      "documentExpiryDate": "YYYY-MM-DD",
      "gender": "MALE|FEMALE"
    }
  ],
  "contactInfo": {
    "email": "string",
    "phone": "string"
  },
  "paymentInfo": {
    "method": "credit_card|debit_card|paypal",
    "cardNumber": "last4digits"
  },
  "useSavedPassengers": boolean,
  "savePassengerDetails": boolean
}

If information is missing, use null for those fields. Extract what you can from the message. If the user mentions using saved details or wants to save details, set the appropriate boolean flags.`
          },
          {
            role: 'user',
            content: `Extract booking information from: "${message}". User has ${savedPassengers.length} saved passenger details available.`
          }
        ],
        max_completion_tokens: 500
      })
    });

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiData = await openaiResponse.json();
    const extractedInfo = JSON.parse(openaiData.choices[0].message.content);
    
    console.log(`[${requestId}] ✅ Extracted booking information:`, extractedInfo);
    
    // If user wants to use saved passengers, populate from saved data
    if (extractedInfo.useSavedPassengers && hasSavedDetails && savedPassengers.length > 0) {
      console.log(`[${requestId}] 🔄 Using saved passenger details`);
      extractedInfo.passengers = savedPassengers.map(passenger => ({
        firstName: passenger.first_name,
        lastName: passenger.last_name,
        dateOfBirth: passenger.date_of_birth,
        documentNumber: passenger.document_number,
        documentExpiryDate: passenger.document_expiry_date,
        gender: 'MALE', // Default, could be enhanced
        savedPassengerId: passenger.id
      }));
    }
    
    // Validate extracted information
    const validation = validateBookingInfo(extractedInfo);
    
    return {
      ...extractedInfo,
      isComplete: validation.isValid,
      missingFields: validation.missingFields,
      hasSavedDetails,
      savedPassengers,
      shouldOfferToSave: extractedInfo.savePassengerDetails || false
    };
    
  } catch (error) {
    console.error(`[${requestId}] ❌ Failed to extract booking information:`, error);
    
    // Fallback to basic extraction
    return fallbackBookingInfoExtraction(message, requestId);
  }
}

// Helper function to validate booking information
function validateBookingInfo(bookingInfo) {
  const missingFields = [];
  
  // Check passengers
  if (!bookingInfo.passengers || !Array.isArray(bookingInfo.passengers) || bookingInfo.passengers.length === 0) {
    missingFields.push('passengers');
  } else {
    // Validate each passenger
    bookingInfo.passengers.forEach((passenger, index) => {
      const requiredFields = ['firstName', 'lastName', 'dateOfBirth', 'documentNumber', 'documentExpiryDate'];
      requiredFields.forEach(field => {
        if (!passenger[field]) {
          missingFields.push(`passenger${index + 1}_${field}`);
        }
      });
    });
  }
  
  // Check contact info
  if (!bookingInfo.contactInfo) {
    missingFields.push('contactInfo');
  } else {
    if (!bookingInfo.contactInfo.email) missingFields.push('contactInfo_email');
    if (!bookingInfo.contactInfo.phone) missingFields.push('contactInfo_phone');
  }
  
  return {
    isValid: missingFields.length === 0,
    missingFields
  };
}

// Fallback function for basic booking information extraction
function fallbackBookingInfoExtraction(message, requestId) {
  console.log(`[${requestId}] 🔄 Using fallback booking information extraction...`);
  
  const extractedInfo = {
    passengers: [],
    contactInfo: {},
    paymentInfo: {},
    isComplete: false,
    missingFields: ['passengers', 'contactInfo']
  };
  
  // Try to extract basic information using regex patterns
  const lowerMessage = message.toLowerCase();
  
  // Extract email
  const emailMatch = message.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
  if (emailMatch) {
    extractedInfo.contactInfo.email = emailMatch[0];
    extractedInfo.missingFields = extractedInfo.missingFields.filter(f => f !== 'contactInfo_email');
  }
  
  // Extract phone
  const phoneMatch = message.match(/(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  if (phoneMatch) {
    extractedInfo.contactInfo.phone = phoneMatch[0];
    extractedInfo.missingFields = extractedInfo.missingFields.filter(f => f !== 'contactInfo_phone');
  }
  
  // Extract names (basic pattern)
  const nameMatch = message.match(/(?:my name is|i'm|i am|call me)\s+([A-Z][a-z]+)\s+([A-Z][a-z]+)/i);
  if (nameMatch) {
    extractedInfo.passengers.push({
      firstName: nameMatch[1],
      lastName: nameMatch[2],
      dateOfBirth: null,
      documentNumber: null,
      documentExpiryDate: null,
      gender: 'MALE'
    });
    extractedInfo.missingFields = extractedInfo.missingFields.filter(f => f !== 'passengers');
  }
  
  // Check if we have minimal contact info
  if (extractedInfo.contactInfo.email || extractedInfo.contactInfo.phone) {
    extractedInfo.missingFields = extractedInfo.missingFields.filter(f => !f.startsWith('contactInfo_'));
  }
  
  return extractedInfo;
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

// Enhanced flight search with user profile integration
async function handleFlightSearch(req, res) {
  const requestId = generateRequestId();
  const { message, user_id } = req.body;
  
  console.log(`[${requestId}] 🚀 Flight search request: "${message}" for user: ${user_id || 'anonymous'}`);
  
  try {
    let userProfile = null;
    let userPreferences = null;
    let travelHistory = null;
    
    // If user_id is provided, fetch their profile data
    if (user_id) {
      try {
        // Get user profile and preferences
        const profileResult = await executeQuery(`
          SELECT * FROM user_profile_summary WHERE id = $1
        `, [user_id]);
        
        if (profileResult.rows.length > 0) {
          userProfile = profileResult.rows[0];
          
          // Get user preferences
          const preferencesResult = await executeQuery(`
            SELECT category, preferences FROM user_preferences WHERE user_id = $1
          `, [user_id]);
          
          userPreferences = preferencesResult.rows.reduce((acc, row) => {
            acc[row.category] = row.preferences;
            return acc;
          }, {});
          
          // Get recent travel history for context
          const historyResult = await executeQuery(`
            SELECT destination_city, destination_country, trip_type, rating, created_at
            FROM travel_history 
            WHERE user_id = $1 
            ORDER BY created_at DESC 
            LIMIT 5
          `, [user_id]);
          
          travelHistory = historyResult.rows;
          
          console.log(`[${requestId}] ✅ User profile loaded: ${userProfile.display_name || userProfile.email}`);
        }
      } catch (error) {
        console.log(`[${requestId}] ⚠️ Could not load user profile: ${error.message}`);
        // Continue without profile data
      }
    }

    // Track this interaction if user is authenticated
    if (user_id) {
      try {
        await executeQuery(`
          INSERT INTO user_interactions (user_id, interaction_type, interaction_data, search_query)
          VALUES ($1, 'flight_search', $2, $3)
        `, [user_id, JSON.stringify({ message, timestamp: new Date() }), message]);
      } catch (error) {
        console.log(`[${requestId}] ⚠️ Could not track interaction: ${error.message}`);
      }
    }

    // Parse flight intent with ChatGPT
    const flightIntent = await parseFlightIntentWithChatGPT(message);
    
    if (!flightIntent) {
      return res.status(400).json({
        success: false,
        error: 'Could not understand flight request'
      });
    }

    // Apply user preferences to search parameters
    const enhancedSearchParams = applyUserPreferences(flightIntent, userPreferences);
    
    console.log(`[${requestId}] 🎯 Enhanced search params:`, enhancedSearchParams);

    // Perform flight search
    const searchStartTime = Date.now();
    const searchData = await searchFlights(enhancedSearchParams);
    const searchDuration = Date.now() - searchStartTime;

    // Personalize results based on user preferences
    const personalizedFlights = personalizeFlightResults(searchData.flights, userPreferences, travelHistory);

    // Generate personalized response message
    const personalizedMessage = generatePersonalizedMessage(
      message, 
      personalizedFlights, 
      userProfile, 
      userPreferences, 
      travelHistory
    );

    const response = {
      success: true,
      message: personalizedMessage,
      intent: flightIntent,
      requestId,
      flights: personalizedFlights,
      searchParams: enhancedSearchParams,
      dataSource: searchData.dataSource || 'unknown',
      searchDuration,
      userProfile: userProfile ? {
        displayName: userProfile.display_name,
        role: userProfile.role,
        preferences: userPreferences,
        recentContext: travelHistory
      } : null,
      firstTurnMessage: "When I check prices with our travel API, you'll see a one-time confirmation popup. This ensures your data is sent securely — you can approve and continue without repeating steps."
    };

    console.log(`[${requestId}] ✅ Flight search completed in ${searchDuration}ms`);
    return res.status(200).json(response);

  } catch (error) {
    console.error(`[${requestId}] ❌ Flight search error:`, error);
    return res.status(500).json({
      success: false,
      error: 'Flight search failed',
      details: error.message
    });
  }
}

// Apply user preferences to search parameters
function applyUserPreferences(searchParams, userPreferences) {
  if (!userPreferences) return searchParams;
  
  const enhanced = { ...searchParams };
  
  // Apply transportation preferences
  if (userPreferences.transportation) {
    const transport = userPreferences.transportation;
    
    // Prefer user's favorite airlines if available
    if (transport.preferred_airlines && transport.preferred_airlines.length > 0) {
      enhanced.preferredAirlines = transport.preferred_airlines;
    }
    
    // Apply seat preferences
    if (transport.seat_preference) {
      enhanced.seatPreference = transport.seat_preference;
    }
    
    // Apply layover tolerance
    if (transport.layover_tolerance) {
      enhanced.maxLayovers = transport.layover_tolerance === 'max_2_hours' ? 1 : 0;
    }
  }
  
  // Apply travel style preferences
  if (userPreferences.travel_style) {
    const style = userPreferences.travel_style;
    
    // Adjust search based on travel pace
    if (style.travel_pace === 'relaxed') {
      enhanced.maxLayovers = Math.min(enhanced.maxLayovers || 2, 1);
    } else if (style.travel_pace === 'fast-paced') {
      enhanced.maxLayovers = 0;
    }
    
    // Consider adventure level for destination suggestions
    if (style.adventure_level === 'high' || style.adventure_level === 'extreme') {
      enhanced.adventureFriendly = true;
    }
  }
  
  // Apply accommodation preferences if searching for packages
  if (userPreferences.accommodation && enhanced.includeHotels) {
    const accommodation = userPreferences.accommodation;
    enhanced.hotelPreferences = {
      types: accommodation.preferred_types || [],
      budgetRange: accommodation.budget_range || 'mid_range',
      amenities: accommodation.amenities || []
    };
  }
  
  return enhanced;
}

// Personalize flight results based on user preferences and history
function personalizeFlightResults(flights, userPreferences, travelHistory) {
  if (!flights || !userPreferences) return flights;
  
  return flights.map(flight => {
    let personalizationScore = 0;
    const personalizationFactors = [];
    
    // Score based on transportation preferences
    if (userPreferences.transportation) {
      const transport = userPreferences.transportation;
      
      // Airline preference scoring
      if (transport.preferred_airlines && flight.airline) {
        const airline = flight.airline.toLowerCase();
        if (transport.preferred_airlines.some(pref => 
          airline.includes(pref.toLowerCase())
        )) {
          personalizationScore += 20;
          personalizationFactors.push('preferred_airline');
        }
      }
      
      // Seat preference scoring
      if (transport.seat_preference && flight.availableSeats) {
        if (flight.availableSeats.some(seat => 
          seat.type === transport.seat_preference
        )) {
          personalizationScore += 15;
          personalizationFactors.push('preferred_seat_available');
        }
      }
    }
    
    // Score based on travel history
    if (travelHistory && travelHistory.length > 0) {
      const destination = flight.destination?.toLowerCase();
      const origin = flight.origin?.toLowerCase();
      
      // Check if user has visited this destination before
      const hasVisitedDestination = travelHistory.some(trip => 
        trip.destination_city?.toLowerCase() === destination ||
        trip.destination_country?.toLowerCase() === destination
      );
      
      if (hasVisitedDestination) {
        personalizationScore += 10;
        personalizationFactors.push('previously_visited');
      }
      
      // Check if user frequently travels this route
      const routeFrequency = travelHistory.filter(trip => 
        (trip.destination_city?.toLowerCase() === destination && 
         trip.destination_country?.toLowerCase() === origin) ||
        (trip.destination_city?.toLowerCase() === origin && 
         trip.destination_country?.toLowerCase() === destination)
      ).length;
      
      if (routeFrequency > 1) {
        personalizationScore += 15;
        personalizationFactors.push('frequent_route');
      }
    }
    
    // Score based on travel style
    if (userPreferences.travel_style) {
      const style = userPreferences.travel_style;
      
      // Time of day preferences
      if (style.travel_pace === 'relaxed' && flight.departureTime) {
        const hour = new Date(flight.departureTime).getHours();
        if (hour >= 9 && hour <= 17) { // Daytime flights
          personalizationScore += 10;
          personalizationFactors.push('daytime_flight');
        }
      }
      
      // Seasonal preferences
      if (style.preferred_seasons && flight.departureDate) {
        const month = new Date(flight.departureDate).getMonth();
        const season = getSeasonFromMonth(month);
        if (style.preferred_seasons.includes(season)) {
          personalizationScore += 15;
          personalizationFactors.push('preferred_season');
        }
      }
    }
    
    return {
      ...flight,
      personalizationScore,
      personalizationFactors,
      isPersonalized: personalizationScore > 0
    };
  }).sort((a, b) => b.personalizationScore - a.personalizationScore);
}

// Generate personalized response message
function generatePersonalizedMessage(originalMessage, flights, userProfile, userPreferences, travelHistory) {
  let message = `Found ${flights?.length || 0} flights for your request: "${originalMessage}"`;
  
  if (userProfile && userPreferences) {
    message += '\n\n🎯 **Personalized for you:**';
    
    // Add personalized insights
    if (userPreferences.travel_style) {
      const style = userPreferences.travel_style;
      message += `\n• Based on your ${style.travel_pace || 'moderate'} travel pace preference`;
      
      if (style.preferred_seasons && style.preferred_seasons.length > 0) {
        message += `\n• Considering your favorite seasons: ${style.preferred_seasons.join(', ')}`;
      }
    }
    
    if (userPreferences.transportation) {
      const transport = userPreferences.transportation;
      if (transport.preferred_airlines && transport.preferred_airlines.length > 0) {
        message += `\n• Prioritizing your preferred airlines: ${transport.preferred_airlines.join(', ')}`;
      }
    }
    
    // Add travel history context
    if (travelHistory && travelHistory.length > 0) {
      const recentDestinations = travelHistory.slice(0, 3).map(trip => 
        trip.destination_city || trip.destination_country
      );
      message += `\n• Considering your recent trips to: ${recentDestinations.join(', ')}`;
    }
    
    // Add personalized recommendations
    const personalizedFlights = flights?.filter(f => f.isPersonalized) || [];
    if (personalizedFlights.length > 0) {
      message += `\n• ${personalizedFlights.length} flights are specially matched to your preferences`;
    }
  }
  
  return message;
}

// Helper function to get season from month
function getSeasonFromMonth(month) {
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
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

  // No authentication required for flight search
  console.log(`[${requestId}] 🔓 Flight search request - no authentication required`);

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
    
    // Check if this is a booking request
    const isBookingRequest = await detectBookingIntent(message, requestId);
    
    if (isBookingRequest) {
      console.log(`[${requestId}] 🎫 Detected booking intent, processing flight booking...`);
      
      // Extract booking information from the message
      const bookingInfo = await extractBookingInfo(message, flightIntent, requestId);
      
      if (bookingInfo.isComplete) {
        console.log(`[${requestId}] ✅ Booking information complete, proceeding with flight booking...`);
        
        try {
          // Call the book-flight endpoint
          const bookingStartTime = Date.now();
          
          // Get flight offer data for the booking
          const flightOffer = {
            id: bookingInfo.flightOfferId || '1',
            type: 'flight-offer',
            source: 'GDS',
            // Add required Amadeus API fields
            origin: flightIntent.origin,
            destination: flightIntent.destination,
            departureDate: flightIntent.date,
            passengers: flightIntent.passengers,
            travelClass: flightIntent.class.toUpperCase(),
            // Add required Amadeus fields
            validatingAirlineCodes: ['AA'], // Default airline code
            itineraries: [
              {
                segments: [
                  {
                    departure: {
                      iataCode: flightIntent.origin,
                      terminal: '1',
                      at: `${flightIntent.date}T10:00:00`
                    },
                    arrival: {
                      iataCode: flightIntent.destination,
                      terminal: '1',
                      at: `${flightIntent.date}T12:00:00`
                    },
                    carrierCode: 'AA',
                    number: '123',
                    aircraft: {
                      code: '738'
                    }
                  }
                ]
              }
            ],
            travelerPricings: [
              {
                travelerId: '1',
                fareOption: 'STANDARD',
                includedCheckedBags: {
                  weight: 23,
                  weightUnit: 'KG'
                }
              }
            ],
            // Add mock pricing for demo purposes
            price: {
              total: '299.99',
              currency: 'USD'
            }
          };
          
          const bookingResponse = await fetch(`${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/book-flight`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Request-ID': requestId,
              'X-Source': 'chatgpt-endpoint'
            },
            body: JSON.stringify({
              flightOffer: flightOffer, // Send complete flight offer object
              passengers: bookingInfo.passengers,
              contactInfo: bookingInfo.contactInfo,
              paymentInfo: bookingInfo.paymentInfo,
              userId: userId || 'anonymous',
              searchParams: {
                origin: flightIntent.origin,
                destination: flightIntent.destination,
                departureDate: flightIntent.date || flightIntent.departureDate,
                adults: flightIntent.passengers || flightIntent.adults || 1,
                travelClass: (flightIntent.class || flightIntent.travelClass || 'economy').toUpperCase(),
                user_id: userId || 'anonymous'
              },
              originalIntent: flightIntent
            })
          });
          
          if (!bookingResponse.ok) {
            throw new Error(`Flight booking API returned ${bookingResponse.status}: ${await bookingResponse.text()}`);
          }
          
          const bookingData = await bookingResponse.json();
          const bookingDuration = Date.now() - bookingStartTime;
          
          console.log(`[${requestId}] ✅ Flight booking completed in ${bookingDuration}ms`);
          
          // Log successful booking telemetry
          logTelemetry('chatgpt_flight_booking_success', {
            requestId,
            success: true,
            bookingDuration,
            bookingReference: bookingData.bookingReference,
            dataSource: bookingData.dataSource || 'unknown',
            userId: userId || 'anonymous',
            intent: flightIntent
          });
          
          // Save passenger details if requested
          if (bookingInfo.shouldOfferToSave && bookingInfo.passengers) {
            try {
              console.log(`[${requestId}] 💾 Saving passenger details for future use...`);
              
              // Save each passenger to the database
              for (const passenger of bookingInfo.passengers) {
                if (passenger.firstName && passenger.lastName) {
                  await savePassengerDetails({
                    passenger_type: 'adult',
                    title: passenger.title || 'Mr',
                    first_name: passenger.firstName,
                    last_name: passenger.lastName,
                    date_of_birth: passenger.dateOfBirth,
                    document_type: passenger.documentType || 'passport',
                    document_number: passenger.documentNumber,
                    document_expiry_date: passenger.documentExpiryDate,
                    nationality: passenger.nationality || 'US',
                    is_primary_passenger: true,
                    is_favorite: true,
                    notes: 'Saved from flight booking'
                  }, userId, requestId);
                }
              }
              
              console.log(`[${requestId}] ✅ Passenger details saved successfully`);
            } catch (saveError) {
              console.log(`[${requestId}] ⚠️ Could not save passenger details: ${saveError.message}`);
              // Don't fail the booking if saving details fails
            }
          }
          
          // Return the booking confirmation
          const response = {
            success: true,
            message: `Flight booked successfully! Your booking reference is: ${bookingData.bookingReference}`,
            intent: flightIntent,
            requestId,
            bookingReference: bookingData.bookingReference,
            bookingDetails: bookingData.bookingDetails,
            passengers: bookingData.passengers,
            contactInfo: bookingData.contactInfo,
            dataSource: bookingData.dataSource || 'unknown',
            bookingDuration: bookingDuration,
            userProfile: userProfile ? {
              displayName: userProfile.displayName,
              role: userProfile.role,
              preferences: userPreferences,
              recentContext: userProfile.recentContext
            } : null,
            firstTurnMessage: "When I check prices with our travel API, you'll see a one-time confirmation popup. This ensures your data is sent securely — you can approve and continue without repeating steps.",
            nextSteps: [
              'Check your email for booking confirmation',
              'Save your booking reference for future reference',
              'Contact the airline 24 hours before departure for check-in'
            ]
          };
          
          const totalDuration = Date.now() - startTime;
          console.log(`[${requestId}] 🎉 Flight booking request completed successfully in ${totalDuration}ms`);
          
          // Log successful request telemetry
          logTelemetry('chatgpt_api_request', {
            requestId,
            success: true,
            duration: totalDuration,
            bookingDuration: bookingDuration,
            userId: userId || 'anonymous',
            messageLength: message.length,
            intent: flightIntent,
            requestType: 'flight_booking',
            bookingReference: bookingData.bookingReference,
            dataSource: bookingData.dataSource || 'unknown',
            hasUserProfile: !!response.userProfile
          });
          
          // Store full flight offers in context for booking
          if (response.bookingContextId && searchData.flightOffers) {
            try {
              storeFlightOffersInContext(response.bookingContextId, searchData.flightOffers);
              console.log(`[${requestId}] 💾 Stored ${searchData.flightOffers.length} full flight offers in context: ${response.bookingContextId}`);
            } catch (contextError) {
              console.error(`[${requestId}] ⚠️ Failed to store flight offers in context:`, contextError);
              // Don't fail the request, just log the warning
            }
          }
          
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
                    `First flight search: ${flightIntent.origin} → ${flightIntent.destination}`,
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
          
          res.status(200).json(response);
          return;
          
        } catch (bookingError) {
          console.error(`[${requestId}] ❌ Flight booking failed:`, bookingError);
          
          // Log booking error telemetry
          logTelemetry('chatgpt_flight_booking_error', {
            requestId,
            success: false,
            error: bookingError.message,
            userId: userId || 'anonymous',
            intent: flightIntent
          });
          
          // Return error response for booking failure
          const errorResponse = {
            success: false,
            error: 'Flight booking failed',
            message: 'Unable to complete your flight booking. Please try again or contact support.',
            requestId,
            originalIntent: flightIntent,
            errorDetails: {
              error: bookingError.message,
              suggestions: [
                'Check that all passenger information is complete',
                'Verify contact information is correct',
                'Ensure payment information is valid',
                'Try again with corrected information'
              ]
            },
            note: 'You can still search for flights using the search functionality.'
          };
          
          res.status(400).json(errorResponse);
          return;
        }
      } else {
        // Incomplete booking information - prompt user for missing details
        console.log(`[${requestId}] ⚠️ Booking information incomplete, prompting user for details...`);
        
        const incompleteResponse = {
          success: false,
          requiresBookingInfo: true,
          message: "I'd like to help you book this flight! I need some additional information to complete your booking:",
          requestId,
          originalIntent: flightIntent,
          missingInfo: bookingInfo.missingFields,
          firstTurnMessage: "When I check prices with our travel API, you'll see a one-time confirmation popup. This ensures your data is sent securely — you can approve and continue without repeating steps.",
          hasSavedPassengers: bookingInfo.hasSavedDetails,
          savedPassengers: bookingInfo.savedPassengers,
          shouldOfferToSave: bookingInfo.shouldOfferToSave,
          requiredInfo: {
            passengers: {
              description: "Passenger details for each traveler",
              required: ["firstName", "lastName", "dateOfBirth", "documentNumber", "documentExpiryDate"],
              example: {
                firstName: "John",
                lastName: "Doe", 
                dateOfBirth: "1990-01-01",
                documentNumber: "AB123456",
                documentExpiryDate: "2030-01-01"
              }
            },
            contactInfo: {
              description: "Your contact information",
              required: ["email", "phone"],
              example: {
                email: "john.doe@example.com",
                phone: "+1-555-123-4567"
              }
            }
          },
          nextStep: "Please provide the missing passenger and contact information, and I'll complete your booking.",
          passengerOptions: bookingInfo.hasSavedDetails ? [
            "Use my saved passenger details",
            "Enter new passenger information",
            "Save these passenger details for future use"
          ] : [
            "Enter passenger information",
            "Save passenger details for future use"
          ],
          examples: [
            "Book for John Doe, born 1990-01-01, passport AB123456 expires 2030-01-01, contact john@example.com, phone +1-555-123-4567",
            "I'm John Doe, passport AB123456, contact me at john@example.com or +1-555-123-4567",
            "Use my saved passenger details",
            "Save these details for next time"
          ]
        };
        
        // Log the incomplete booking prompt
        logTelemetry('chatgpt_booking_info_incomplete', {
          requestId,
          success: false,
          missingFields: bookingInfo.missingFields,
          hasSavedPassengers: bookingInfo.hasSavedDetails,
          shouldOfferToSave: bookingInfo.shouldOfferToSave,
          userId: userId || 'anonymous',
          intent: flightIntent
        });
        
        res.status(200).json(incompleteResponse);
        return;
      }
    }
    
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
      
      // Prepare search parameters - ensure compatibility with search-flights API
      const searchParams = {
        origin: flightIntent.origin,
        destination: flightIntent.destination,
        departureDate: flightIntent.date || flightIntent.departureDate,
        adults: flightIntent.passengers || flightIntent.adults || 1,
        travelClass: (flightIntent.class || flightIntent.travelClass || 'economy').toUpperCase(),
        user_id: userId || 'anonymous'
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
        // Store full flight offers in context for booking, return only essential data in response
        // Frontend should use the bookingContextId to retrieve full offers when needed
        flightOffers: searchData.flightOffers ? searchData.flightOffers.map(offer => ({
          id: offer.id,
          type: offer.type,
          source: offer.source,
          origin: offer.origin || offer.from,
          destination: offer.destination || offer.to,
          departureDate: offer.departureDate || offer.date,
          returnDate: offer.returnDate,
          price: offer.price,
          validatingAirlineCodes: offer.validatingAirlineCodes,
          numberOfBookableSeats: offer.numberOfBookableSeats,
          // Include minimal itinerary data
          itineraries: offer.itineraries ? offer.itineraries.map(itinerary => ({
            duration: itinerary.duration,
            segments: itinerary.segments ? itinerary.segments.map(segment => ({
              id: segment.id,
              departure: segment.departure,
              arrival: segment.arrival,
              carrierCode: segment.carrierCode,
              number: segment.number
            })) : []
          })) : [],
          // Include minimal traveler pricing data
          travelerPricings: offer.travelerPricings ? offer.travelerPricings.map(pricing => ({
            travelerId: pricing.travelerId,
            fareOption: pricing.fareOption,
            travelerType: pricing.travelerType,
            price: pricing.price,
            // Include minimal fare details
            fareDetailsBySegment: pricing.fareDetailsBySegment ? pricing.fareDetailsBySegment.map(detail => ({
              segmentId: detail.segmentId,
              cabin: detail.cabin,
              fareBasis: detail.fareBasis
            })) : []
          })) : []
        })) : [],
        // Context ID for retrieving full flight offers when booking
        bookingContextId: searchData.flightOffers ? `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : null,
        searchParams: searchData.searchParams || searchParams,
        dataSource: searchData.dataSource || 'unknown',
        searchDuration,
        userProfile: userProfile ? {
          displayName: userProfile.displayName,
          role: userProfile.role,
          preferences: userProfile.preferences,
          recentContext: userProfile.recentContext
        } : null,
        firstTurnMessage: "When I check prices with our travel API, you'll see a one-time confirmation popup. This ensures your data is sent securely — you can approve and continue without repeating steps."
      };
      
      // Store full flight offers in context for booking
      if (response.bookingContextId && searchData.flightOffers) {
        try {
          storeFlightOffersInContext(response.bookingContextId, searchData.flightOffers);
          console.log(`[${requestId}] 💾 Stored ${searchData.flightOffers.length} full flight offers in context: ${response.bookingContextId}`);
        } catch (contextError) {
          console.error(`[${requestId}] ⚠️ Failed to store flight offers in context:`, contextError);
          // Don't fail the request, just log the warning
        }
      }
      
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
                `First flight search: ${flightIntent.origin} → ${flightIntent.destination}`,
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
      
      // Instead of falling back to mock data, use OpenAPI to recreate intent with error context
      console.log(`[${requestId}] 🔄 Flight search failed, using OpenAPI to recreate intent with error context...`);
      
      try {
        // Get the OpenAPI specification to understand the API structure
        const openapiResponse = await fetch(`${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/openapi`, {
          method: 'GET',
          headers: {
            'X-Request-ID': requestId,
            'X-Source': 'chatgpt-endpoint-error-recovery'
          }
        });
        
        if (openapiResponse.ok) {
          const openapiSpec = await openapiResponse.json();
          console.log(`[${requestId}] ✅ Retrieved OpenAPI specification for error recovery`);
          
          // Extract error details from the search error
          let errorDetails = {};
          let errorMessage = searchError.message;
          let suggestions = [];
          
          try {
            // Try to parse the error response if it's JSON
            if (searchError.message.includes('Search flights API returned')) {
              const errorMatch = searchError.message.match(/Search flights API returned (\d+): (.+)/);
              if (errorMatch) {
                const statusCode = parseInt(errorMatch[1]);
                const errorBody = errorMatch[2];
                
                try {
                  const parsedError = JSON.parse(errorBody);
                  errorDetails = parsedError;
                  errorMessage = parsedError.message || parsedError.error || errorMessage;
                  suggestions = parsedError.suggestions || [];
                } catch (parseError) {
                  console.log(`[${requestId}] ⚠️ Could not parse error body as JSON:`, parseError);
                }
              }
            }
          } catch (parseError) {
            console.log(`[${requestId}] ⚠️ Error parsing failed:`, parseError);
          }
          
          // Create a comprehensive error response with OpenAPI guidance
          const errorResponse = {
            success: false,
            error: 'Flight search failed',
            message: errorMessage || 'Unable to complete flight search',
            requestId,
            originalIntent: flightIntent,
            errorDetails: errorDetails,
            suggestions: suggestions.length > 0 ? suggestions : [
              'Check your search parameters',
              'Ensure dates are in the future',
              'Verify airport codes are valid 3-letter codes',
              'Try different dates or routes'
            ],
            openapiGuidance: {
              message: 'Use the OpenAPI specification below to understand valid parameters and retry your request',
              specification: {
                title: openapiSpec.info?.title,
                version: openapiSpec.info?.version,
                description: openapiSpec.info?.description,
                searchFlightsEndpoint: {
                  path: '/api/search-flights',
                  method: 'POST',
                  requiredParameters: ['from', 'to', 'date'],
                  optionalParameters: ['passengers', 'travelClass', 'userId'],
                  parameterFormats: {
                    from: '3-letter airport code (e.g., JFK, LAX, ORD)',
                    to: '3-letter airport code (e.g., JFK, LAX, ORD)',
                    date: 'YYYY-MM-DD format (e.g., 2025-01-15)',
                    passengers: 'Number (default: 1)',
                    travelClass: 'ECONOMY, PREMIUM_ECONOMY, BUSINESS, FIRST (default: ECONOMY)',
                    userId: 'String identifier for personalization'
                  },
                  examples: [
                    {
                      description: 'Basic search',
                      parameters: {
                        from: 'JFK',
                        to: 'LAX',
                        date: '2025-01-15'
                      }
                    },
                    {
                      description: 'Detailed search',
                      parameters: {
                        from: 'ORD',
                        to: 'SFO',
                        date: '2025-06-20',
                        passengers: 2,
                        travelClass: 'BUSINESS',
                        userId: 'john@example.com'
                      }
                    }
                  ]
                }
              },
              fullSpecification: openapiSpec
            },
            recoveryInstructions: [
              '1. Review the error details above',
              '2. Check the OpenAPI specification for valid parameter formats',
              '3. Adjust your request based on the suggestions',
              '4. Retry with corrected parameters',
              '5. If issues persist, the system will use fallback data'
            ],
            note: 'This response includes the complete OpenAPI specification to help you understand valid request formats and retry with corrected parameters.'
          };
          
          // Log the error recovery attempt
          logTelemetry('chatgpt_error_recovery_openapi', {
            requestId,
            success: true,
            errorType: 'search_flights_failure',
            errorMessage: errorMessage,
            hasErrorDetails: !!errorDetails,
            suggestionsProvided: suggestions.length,
            openapiRetrieved: true,
            userId: userId || 'anonymous'
          });
          
          // Return the comprehensive error response with OpenAPI guidance
          res.status(400).json(errorResponse);
          return;
          
        } else {
          console.log(`[${requestId}] ⚠️ Failed to retrieve OpenAPI specification: ${openapiResponse.status}`);
          throw new Error('OpenAPI specification unavailable for error recovery');
        }
        
      } catch (openapiError) {
        console.error(`[${requestId}] ❌ OpenAPI error recovery failed:`, openapiError);
        
        // Log the OpenAPI error recovery failure
        logTelemetry('chatgpt_error_recovery_openapi_failed', {
          requestId,
          success: false,
          error: openapiError.message,
          userId: userId || 'anonymous'
        });
        
        // Fallback to mock response if OpenAPI recovery fails
        console.log(`[${requestId}] 🔄 OpenAPI recovery failed, falling back to mock flight data...`);
        
        const mockResponse = {
          success: true,
          message: `Found flights for your request: "${message}" (using fallback data due to search and recovery failure)`,
          intent: flightIntent,
          requestId,
          flights: [
            {
              flightNumber: "AA123",
              route: `${flightIntent.origin} → ${flightIntent.destination}`,
              time: "10:00 AM - 11:30 AM",
              stops: "Direct",
              price: "$299",
              seats: 4,
              airline: "American Airlines",
              class: flightIntent.class
            },
            {
              flightNumber: "DL456",
              route: `${flightIntent.origin} → ${flightIntent.destination}`,
              time: "2:00 PM - 3:30 PM", 
              stops: "1 stop",
              price: "$249",
              seats: 2,
              airline: "Delta Airlines",
              class: flightIntent.class
            }
          ],
          searchParams: {
            origin: flightIntent.origin,
            destination: flightIntent.destination,
            departureDate: flightIntent.date,
            adults: flightIntent.passengers,
            travelClass: flightIntent.class.toUpperCase()
          },
          dataSource: 'fallback_mock_data',
          note: 'Real flight search and OpenAPI recovery failed, showing sample data',
          userProfile: userProfile ? {
            displayName: userProfile.displayName,
            role: userProfile.role,
            preferences: userProfile.preferences,
            recentContext: userProfile.recentContext
          } : null,
          // Add passenger details collection for mock scenarios too
          requiresPassengerDetails: true,
          passengerCollectionMessage: "I found some sample flights for you. Now I need passenger details to complete your booking. Please provide:",
          passengerFields: [
            "First and last name",
            "Date of birth (YYYY-MM-DD)",
            "Passport/document number",
            "Document expiry date",
            "Nationality"
          ],
          passengerExample: {
            firstName: "John",
            lastName: "Doe",
            dateOfBirth: "1990-01-01",
            documentNumber: "US123456789",
            documentExpiryDate: "2030-01-01",
            nationality: "United States"
          },
          nextSteps: [
            "1. Provide passenger details for each traveler",
            "2. Confirm flight selection",
            "3. Complete booking and save passenger info for future use"
          ],
          mockDataNote: "Note: These are sample flights. In production, you would see real-time pricing and availability."
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
                  `First flight search (fallback): ${flightIntent.origin} → ${flightIntent.destination}`,
                  `Searched for ${flightIntent.passengers} passenger(s)`,
                  `Preferred class: ${flightIntent.class}`,
                  `Used fallback data due to search and recovery failure`
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
          searchError: searchError.message,
          openapiRecoveryFailed: true
        });
      
        res.status(200).json(mockResponse);
      }
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

// Helper function to save passenger details to the database
async function savePassengerDetails(passengerData, userId, requestId) {
  try {
    console.log(`[${requestId}] 💾 Saving passenger details for: ${passengerData.first_name} ${passengerData.last_name}`);
    
    // Call the passenger-details API to save the data
    const saveResponse = await fetch(`${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/passenger-details`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
        'X-Source': 'chatgpt-endpoint'
      },
      body: JSON.stringify({
        ...passengerData,
        userId: userId
      })
    });
    
    if (!saveResponse.ok) {
      const errorText = await saveResponse.text();
      throw new Error(`Failed to save passenger details: ${saveResponse.status} - ${errorText}`);
    }
    
    const saveResult = await saveResponse.json();
    console.log(`[${requestId}] ✅ Passenger details saved with ID: ${saveResult.passengerId}`);
    
    return saveResult;
    
  } catch (error) {
    console.error(`[${requestId}] ❌ Failed to save passenger details:`, error);
    throw error;
  }
}

// Helper function to complete booking with passenger details
async function completeBookingWithPassengers(flightData, passengerDetails, userId, requestId) {
  try {
    console.log(`[${requestId}] 🎫 Completing booking for flight: ${flightData.flightNumber}`);
    
    // Save passenger details first
    const savedPassengers = [];
    for (const passenger of passengerDetails) {
      const savedPassenger = await savePassengerDetails(passenger, userId, requestId);
      savedPassengers.push(savedPassenger);
    }
    
    // Create booking record (this would integrate with your actual booking system)
    const bookingData = {
      userId: userId,
      flightData: flightData,
      passengerDetails: savedPassengers,
      bookingDate: new Date().toISOString(),
      status: 'confirmed',
      bookingId: `BK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    console.log(`[${requestId}] ✅ Booking completed successfully: ${bookingData.bookingId}`);
    
    // Log successful booking telemetry
    logTelemetry('chatgpt_booking_completed', {
      requestId,
      success: true,
      userId,
      bookingId: bookingData.bookingId,
      passengersCount: savedPassengers.length,
      flightNumber: flightData.flightNumber,
      route: flightData.route
    });
    
    return {
      success: true,
      bookingId: bookingData.bookingId,
      message: `Booking confirmed! Your flight ${flightData.flightNumber} from ${flightData.route} is booked.`,
      passengerDetails: savedPassengers,
      flightDetails: flightData,
      nextSteps: [
        "Check your email for booking confirmation",
        "Save passenger details for future bookings",
        "Download your e-ticket 24 hours before departure"
      ]
    };
    
  } catch (error) {
    console.error(`[${requestId}] ❌ Booking completion failed:`, error);
    
    logTelemetry('chatgpt_booking_failed', {
      requestId,
      success: false,
      error: error.message,
      userId
    });
    
    throw error;
  }
}

// Enhanced ChatGPT handler that can process passenger details and complete bookings
module.exports = async (req, res) => {
  const startTime = Date.now();
  const requestId = generateRequestId();
  
  console.log(`[${requestId}] 🚀 ChatGPT API request received: ${req.method} ${req.url}`);
  
  try {
    // Check if this is a passenger details submission for booking completion
    if (req.body.passengerDetails && req.body.flightData && req.body.action === 'complete_booking') {
      console.log(`[${requestId}] 🎫 Processing booking completion with passenger details`);
      
      const { passengerDetails, flightData, userId } = req.body;
      
      if (!passengerDetails || !Array.isArray(passengerDetails) || passengerDetails.length === 0) {
        return res.status(400).json({
          error: 'Passenger details are required',
          message: 'Please provide passenger information for all travelers'
        });
      }
      
      if (!flightData) {
        return res.status(400).json({
          error: 'Flight data is required',
          message: 'Please provide flight information to complete the booking'
        });
      }
      
      try {
        const bookingResult = await completeBookingWithPassengers(flightData, passengerDetails, userId, requestId);
        
        res.status(200).json({
          ...bookingResult,
          requestId,
          timestamp: new Date().toISOString()
        });
        
      } catch (bookingError) {
        res.status(500).json({
          error: 'Booking completion failed',
          message: bookingError.message,
          requestId,
          timestamp: new Date().toISOString()
        });
      }
      
      return;
    }
    
    // Original ChatGPT intent parsing logic continues here...
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
    
    // Check if this is a booking request
    const isBookingRequest = await detectBookingIntent(message, requestId);
    
    if (isBookingRequest) {
      console.log(`[${requestId}] 🎫 Detected booking intent, processing flight booking...`);
      
      // Extract booking information from the message
      const bookingInfo = await extractBookingInfo(message, flightIntent, requestId);
      
      if (bookingInfo.isComplete) {
        console.log(`[${requestId}] ✅ Booking information complete, proceeding with flight booking...`);
        
        try {
          // Call the book-flight endpoint
          const bookingStartTime = Date.now();
          
          // Get flight offer data for the booking
          const flightOffer = {
            id: bookingInfo.flightOfferId || '1',
            type: 'flight-offer',
            source: 'GDS',
            // Add required Amadeus API fields
            origin: flightIntent.origin,
            destination: flightIntent.destination,
            departureDate: flightIntent.date,
            passengers: flightIntent.passengers,
            travelClass: flightIntent.class.toUpperCase(),
            // Add required Amadeus fields
            validatingAirlineCodes: ['AA'], // Default airline code
            itineraries: [
              {
                segments: [
                  {
                    departure: {
                      iataCode: flightIntent.origin,
                      terminal: '1',
                      at: `${flightIntent.date}T10:00:00`
                    },
                    arrival: {
                      iataCode: flightIntent.destination,
                      terminal: '1',
                      at: `${flightIntent.date}T12:00:00`
                    },
                    carrierCode: 'AA',
                    number: '123',
                    aircraft: {
                      code: '738'
                    }
                  }
                ]
              }
            ],
            travelerPricings: [
              {
                travelerId: '1',
                fareOption: 'STANDARD',
                includedCheckedBags: {
                  weight: 23,
                  weightUnit: 'KG'
                }
              }
            ],
            // Add mock pricing for demo purposes
            price: {
              total: '299.99',
              currency: 'USD'
            }
          };
          
          const bookingResponse = await fetch(`${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/book-flight`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Request-ID': requestId,
              'X-Source': 'chatgpt-endpoint'
            },
            body: JSON.stringify({
              flightOffer: flightOffer, // Send complete flight offer object
              passengers: bookingInfo.passengers,
              contactInfo: bookingInfo.contactInfo,
              paymentInfo: bookingInfo.paymentInfo,
              userId: userId || 'anonymous',
              searchParams: {
                origin: flightIntent.origin,
                destination: flightIntent.destination,
                departureDate: flightIntent.date || flightIntent.departureDate,
                adults: flightIntent.passengers || flightIntent.adults || 1,
                travelClass: (flightIntent.class || flightIntent.travelClass || 'economy').toUpperCase(),
                user_id: userId || 'anonymous'
              },
              originalIntent: flightIntent
            })
          });
          
          if (!bookingResponse.ok) {
            throw new Error(`Flight booking API returned ${bookingResponse.status}: ${await bookingResponse.text()}`);
          }
          
          const bookingData = await bookingResponse.json();
          const bookingDuration = Date.now() - bookingStartTime;
          
          console.log(`[${requestId}] ✅ Flight booking completed in ${bookingDuration}ms`);
          
          // Log successful booking telemetry
          logTelemetry('chatgpt_flight_booking_success', {
            requestId,
            success: true,
            bookingDuration,
            bookingReference: bookingData.bookingReference,
            dataSource: bookingData.dataSource || 'unknown',
            userId: userId || 'anonymous',
            intent: flightIntent
          });
          
          // Save passenger details if requested
          if (bookingInfo.shouldOfferToSave && bookingInfo.passengers) {
            try {
              console.log(`[${requestId}] 💾 Saving passenger details for future use...`);
              
              // Save each passenger to the database
              for (const passenger of bookingInfo.passengers) {
                if (passenger.firstName && passenger.lastName) {
                  await savePassengerDetails({
                    passenger_type: 'adult',
                    title: passenger.title || 'Mr',
                    first_name: passenger.firstName,
                    last_name: passenger.lastName,
                    date_of_birth: passenger.dateOfBirth,
                    document_type: passenger.documentType || 'passport',
                    document_number: passenger.documentNumber,
                    document_expiry_date: passenger.documentExpiryDate,
                    nationality: passenger.nationality || 'US',
                    is_primary_passenger: true,
                    is_favorite: true,
                    notes: 'Saved from flight booking'
                  }, userId, requestId);
                }
              }
              
              console.log(`[${requestId}] ✅ Passenger details saved successfully`);
            } catch (saveError) {
              console.log(`[${requestId}] ⚠️ Could not save passenger details: ${saveError.message}`);
              // Don't fail the booking if saving details fails
            }
          }
          
          // Return the booking confirmation
          const response = {
            success: true,
            message: `Flight booked successfully! Your booking reference is: ${bookingData.bookingReference}`,
            intent: flightIntent,
            requestId,
            bookingReference: bookingData.bookingReference,
            bookingDetails: bookingData.bookingDetails,
            passengers: bookingData.passengers,
            contactInfo: bookingData.contactInfo,
            dataSource: bookingData.dataSource || 'unknown',
            bookingDuration: bookingDuration,
            userProfile: userProfile ? {
              displayName: userProfile.displayName,
              role: userProfile.role,
              preferences: userPreferences,
              recentContext: userProfile.recentContext
            } : null,
            firstTurnMessage: "When I check prices with our travel API, you'll see a one-time confirmation popup. This ensures your data is sent securely — you can approve and continue without repeating steps.",
            nextSteps: [
              'Check your email for booking confirmation',
              'Save your booking reference for future reference',
              'Contact the airline 24 hours before departure for check-in'
            ]
          };
          
          const totalDuration = Date.now() - startTime;
          console.log(`[${requestId}] 🎉 Flight booking request completed successfully in ${totalDuration}ms`);
          
          // Log successful request telemetry
          logTelemetry('chatgpt_api_request', {
            requestId,
            success: true,
            duration: totalDuration,
            bookingDuration: bookingDuration,
            userId: userId || 'anonymous',
            messageLength: message.length,
            intent: flightIntent,
            requestType: 'flight_booking',
            bookingReference: bookingData.bookingReference,
            dataSource: bookingData.dataSource || 'unknown',
            hasUserProfile: !!response.userProfile
          });
          
          // Store full flight offers in context for booking
          if (response.bookingContextId && searchData.flightOffers) {
            try {
              storeFlightOffersInContext(response.bookingContextId, searchData.flightOffers);
              console.log(`[${requestId}] 💾 Stored ${searchData.flightOffers.length} full flight offers in context: ${response.bookingContextId}`);
            } catch (contextError) {
              console.error(`[${requestId}] ⚠️ Failed to store flight offers in context:`, contextError);
              // Don't fail the request, just log the warning
            }
          }
          
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
                    `First flight search: ${flightIntent.origin} → ${flightIntent.destination}`,
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
          
          res.status(200).json(response);
          return;
          
        } catch (bookingError) {
          console.error(`[${requestId}] ❌ Flight booking failed:`, bookingError);
          
          // Log booking error telemetry
          logTelemetry('chatgpt_flight_booking_error', {
            requestId,
            success: false,
            error: bookingError.message,
            userId: userId || 'anonymous',
            intent: flightIntent
          });
          
          // Return error response for booking failure
          const errorResponse = {
            success: false,
            error: 'Flight booking failed',
            message: 'Unable to complete your flight booking. Please try again or contact support.',
            requestId,
            originalIntent: flightIntent,
            errorDetails: {
              error: bookingError.message,
              suggestions: [
                'Check that all passenger information is complete',
                'Verify contact information is correct',
                'Ensure payment information is valid',
                'Try again with corrected information'
              ]
            },
            note: 'You can still search for flights using the search functionality.'
          };
          
          res.status(400).json(errorResponse);
          return;
        }
      } else {
        // Incomplete booking information - prompt user for missing details
        console.log(`[${requestId}] ⚠️ Booking information incomplete, prompting user for details...`);
        
        const incompleteResponse = {
          success: false,
          requiresBookingInfo: true,
          message: "I'd like to help you book this flight! I need some additional information to complete your booking:",
          requestId,
          originalIntent: flightIntent,
          missingInfo: bookingInfo.missingFields,
          firstTurnMessage: "When I check prices with our travel API, you'll see a one-time confirmation popup. This ensures your data is sent securely — you can approve and continue without repeating steps.",
          hasSavedPassengers: bookingInfo.hasSavedDetails,
          savedPassengers: bookingInfo.savedPassengers,
          shouldOfferToSave: bookingInfo.shouldOfferToSave,
          requiredInfo: {
            passengers: {
              description: "Passenger details for each traveler",
              required: ["firstName", "lastName", "dateOfBirth", "documentNumber", "documentExpiryDate"],
              example: {
                firstName: "John",
                lastName: "Doe", 
                dateOfBirth: "1990-01-01",
                documentNumber: "AB123456",
                documentExpiryDate: "2030-01-01"
              }
            },
            contactInfo: {
              description: "Your contact information",
              required: ["email", "phone"],
              example: {
                email: "john.doe@example.com",
                phone: "+1-555-123-4567"
              }
            }
          },
          nextStep: "Please provide the missing passenger and contact information, and I'll complete your booking.",
          passengerOptions: bookingInfo.hasSavedDetails ? [
            "Use my saved passenger details",
            "Enter new passenger information",
            "Save these passenger details for future use"
          ] : [
            "Enter passenger information",
            "Save passenger details for future use"
          ],
          examples: [
            "Book for John Doe, born 1990-01-01, passport AB123456 expires 2030-01-01, contact john@example.com, phone +1-555-123-4567",
            "I'm John Doe, passport AB123456, contact me at john@example.com or +1-555-123-4567",
            "Use my saved passenger details",
            "Save these details for next time"
          ]
        };
        
        // Log the incomplete booking prompt
        logTelemetry('chatgpt_booking_info_incomplete', {
          requestId,
          success: false,
          missingFields: bookingInfo.missingFields,
          hasSavedPassengers: bookingInfo.hasSavedDetails,
          shouldOfferToSave: bookingInfo.shouldOfferToSave,
          userId: userId || 'anonymous',
          intent: flightIntent
        });
        
        res.status(200).json(incompleteResponse);
        return;
      }
    }
    
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
      
      // Prepare search parameters - ensure compatibility with search-flights API
      const searchParams = {
        origin: flightIntent.origin,
        destination: flightIntent.destination,
        departureDate: flightIntent.date || flightIntent.departureDate,
        adults: flightIntent.passengers || flightIntent.adults || 1,
        travelClass: (flightIntent.class || flightIntent.travelClass || 'economy').toUpperCase(),
        user_id: userId || 'anonymous'
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
        // Store full flight offers in context for booking, return only essential data in response
        // Frontend should use the bookingContextId to retrieve full offers when needed
        flightOffers: searchData.flightOffers ? searchData.flightOffers.map(offer => ({
          id: offer.id,
          type: offer.type,
          source: offer.source,
          origin: offer.origin || offer.from,
          destination: offer.destination || offer.to,
          departureDate: offer.departureDate || offer.date,
          returnDate: offer.returnDate,
          price: offer.price,
          validatingAirlineCodes: offer.validatingAirlineCodes,
          numberOfBookableSeats: offer.numberOfBookableSeats,
          // Include minimal itinerary data
          itineraries: offer.itineraries ? offer.itineraries.map(itinerary => ({
            duration: itinerary.duration,
            segments: itinerary.segments ? itinerary.segments.map(segment => ({
              id: segment.id,
              departure: segment.departure,
              arrival: segment.arrival,
              carrierCode: segment.carrierCode,
              number: segment.number
            })) : []
          })) : [],
          // Include minimal traveler pricing data
          travelerPricings: offer.travelerPricings ? offer.travelerPricings.map(pricing => ({
            travelerId: pricing.travelerId,
            fareOption: pricing.fareOption,
            travelerType: pricing.travelerType,
            price: pricing.price,
            // Include minimal fare details
            fareDetailsBySegment: pricing.fareDetailsBySegment ? pricing.fareDetailsBySegment.map(detail => ({
              segmentId: detail.segmentId,
              cabin: detail.cabin,
              fareBasis: detail.fareBasis
            })) : []
          })) : []
        })) : [],
        // Context ID for retrieving full flight offers when booking
        bookingContextId: searchData.flightOffers ? `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : null,
        searchParams: searchData.searchParams || searchParams,
        dataSource: searchData.dataSource || 'unknown',
        searchDuration,
        userProfile: userProfile ? {
          displayName: userProfile.displayName,
          role: userProfile.role,
          preferences: userProfile.preferences,
          recentContext: userProfile.recentContext
        } : null,
        firstTurnMessage: "When I check prices with our travel API, you'll see a one-time confirmation popup. This ensures your data is sent securely — you can approve and continue without repeating steps."
      };
      
      // Store full flight offers in context for booking
      if (response.bookingContextId && searchData.flightOffers) {
        try {
          storeFlightOffersInContext(response.bookingContextId, searchData.flightOffers);
          console.log(`[${requestId}] 💾 Stored ${searchData.flightOffers.length} full flight offers in context: ${response.bookingContextId}`);
        } catch (contextError) {
          console.error(`[${requestId}] ⚠️ Failed to store flight offers in context:`, contextError);
          // Don't fail the request, just log the warning
        }
      }
      
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
                `First flight search: ${flightIntent.origin} → ${flightIntent.destination}`,
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
      
      // Instead of falling back to mock data, use OpenAPI to recreate intent with error context
      console.log(`[${requestId}] 🔄 Flight search failed, using OpenAPI to recreate intent with error context...`);
      
      try {
        // Get the OpenAPI specification to understand the API structure
        const openapiResponse = await fetch(`${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/openapi`, {
          method: 'GET',
          headers: {
            'X-Request-ID': requestId,
            'X-Source': 'chatgpt-endpoint-error-recovery'
          }
        });
        
        if (openapiResponse.ok) {
          const openapiSpec = await openapiResponse.json();
          console.log(`[${requestId}] ✅ Retrieved OpenAPI specification for error recovery`);
          
          // Extract error details from the search error
          let errorDetails = {};
          let errorMessage = searchError.message;
          let suggestions = [];
          
          try {
            // Try to parse the error response if it's JSON
            if (searchError.message.includes('Search flights API returned')) {
              const errorMatch = searchError.message.match(/Search flights API returned (\d+): (.+)/);
              if (errorMatch) {
                const statusCode = parseInt(errorMatch[1]);
                const errorBody = errorMatch[2];
                
                try {
                  const parsedError = JSON.parse(errorBody);
                  errorDetails = parsedError;
                  errorMessage = parsedError.message || parsedError.error || errorMessage;
                  suggestions = parsedError.suggestions || [];
                } catch (parseError) {
                  console.log(`[${requestId}] ⚠️ Could not parse error body as JSON:`, parseError);
                }
              }
            }
          } catch (parseError) {
            console.log(`[${requestId}] ⚠️ Error parsing failed:`, parseError);
          }
          
          // Create a comprehensive error response with OpenAPI guidance
          const errorResponse = {
            success: false,
            error: 'Flight search failed',
            message: errorMessage || 'Unable to complete flight search',
            requestId,
            originalIntent: flightIntent,
            errorDetails: errorDetails,
            suggestions: suggestions.length > 0 ? suggestions : [
              'Check your search parameters',
              'Ensure dates are in the future',
              'Verify airport codes are valid 3-letter codes',
              'Try different dates or routes'
            ],
            openapiGuidance: {
              message: 'Use the OpenAPI specification below to understand valid parameters and retry your request',
              specification: {
                title: openapiSpec.info?.title,
                version: openapiSpec.info?.version,
                description: openapiSpec.info?.description,
                searchFlightsEndpoint: {
                  path: '/api/search-flights',
                  method: 'POST',
                  requiredParameters: ['from', 'to', 'date'],
                  optionalParameters: ['passengers', 'travelClass', 'userId'],
                  parameterFormats: {
                    from: '3-letter airport code (e.g., JFK, LAX, ORD)',
                    to: '3-letter airport code (e.g., JFK, LAX, ORD)',
                    date: 'YYYY-MM-DD format (e.g., 2025-01-15)',
                    passengers: 'Number (default: 1)',
                    travelClass: 'ECONOMY, PREMIUM_ECONOMY, BUSINESS, FIRST (default: ECONOMY)',
                    userId: 'String identifier for personalization'
                  },
                  examples: [
                    {
                      description: 'Basic search',
                      parameters: {
                        from: 'JFK',
                        to: 'LAX',
                        date: '2025-01-15'
                      }
                    },
                    {
                      description: 'Detailed search',
                      parameters: {
                        from: 'ORD',
                        to: 'SFO',
                        date: '2025-06-20',
                        passengers: 2,
                        travelClass: 'BUSINESS',
                        userId: 'john@example.com'
                      }
                    }
                  ]
                }
              },
              fullSpecification: openapiSpec
            },
            recoveryInstructions: [
              '1. Review the error details above',
              '2. Check the OpenAPI specification for valid parameter formats',
              '3. Adjust your request based on the suggestions',
              '4. Retry with corrected parameters',
              '5. If issues persist, the system will use fallback data'
            ],
            note: 'This response includes the complete OpenAPI specification to help you understand valid request formats and retry with corrected parameters.'
          };
          
          // Log the error recovery attempt
          logTelemetry('chatgpt_error_recovery_openapi', {
            requestId,
            success: true,
            errorType: 'search_flights_failure',
            errorMessage: errorMessage,
            hasErrorDetails: !!errorDetails,
            suggestionsProvided: suggestions.length,
            openapiRetrieved: true,
            userId: userId || 'anonymous'
          });
          
          // Return the comprehensive error response with OpenAPI guidance
          res.status(400).json(errorResponse);
          return;
          
        } else {
          console.log(`[${requestId}] ⚠️ Failed to retrieve OpenAPI specification: ${openapiResponse.status}`);
          throw new Error('OpenAPI specification unavailable for error recovery');
        }
        
      } catch (openapiError) {
        console.error(`[${requestId}] ❌ OpenAPI error recovery failed:`, openapiError);
        
        // Log the OpenAPI error recovery failure
        logTelemetry('chatgpt_error_recovery_openapi_failed', {
          requestId,
          success: false,
          error: openapiError.message,
          userId: userId || 'anonymous'
        });
        
        // Fallback to mock response if OpenAPI recovery fails
        console.log(`[${requestId}] 🔄 OpenAPI recovery failed, falling back to mock flight data...`);
        
        const mockResponse = {
          success: true,
          message: `Found flights for your request: "${message}" (using fallback data due to search and recovery failure)`,
          intent: flightIntent,
          requestId,
          flights: [
            {
              flightNumber: "AA123",
              route: `${flightIntent.origin} → ${flightIntent.destination}`,
              time: "10:00 AM - 11:30 AM",
              stops: "Direct",
              price: "$299",
              seats: 4,
              airline: "American Airlines",
              class: flightIntent.class
            },
            {
              flightNumber: "DL456",
              route: `${flightIntent.origin} → ${flightIntent.destination}`,
              time: "2:00 PM - 3:30 PM", 
              stops: "1 stop",
              price: "$249",
              seats: 2,
              airline: "Delta Airlines",
              class: flightIntent.class
            }
          ],
          searchParams: {
            origin: flightIntent.origin,
            destination: flightIntent.destination,
            departureDate: flightIntent.date,
            adults: flightIntent.passengers,
            travelClass: flightIntent.class.toUpperCase()
          },
          dataSource: 'fallback_mock_data',
          note: 'Real flight search and OpenAPI recovery failed, showing sample data',
          userProfile: userProfile ? {
            displayName: userProfile.displayName,
            role: userProfile.role,
            preferences: userProfile.preferences,
            recentContext: userProfile.recentContext
          } : null,
          // Add passenger details collection for mock scenarios too
          requiresPassengerDetails: true,
          passengerCollectionMessage: "I found some sample flights for you. Now I need passenger details to complete your booking. Please provide:",
          passengerFields: [
            "First and last name",
            "Date of birth (YYYY-MM-DD)",
            "Passport/document number",
            "Document expiry date",
            "Nationality"
          ],
          passengerExample: {
            firstName: "John",
            lastName: "Doe",
            dateOfBirth: "1990-01-01",
            documentNumber: "US123456789",
            documentExpiryDate: "2030-01-01",
            nationality: "United States"
          },
          nextSteps: [
            "1. Provide passenger details for each traveler",
            "2. Confirm flight selection",
            "3. Complete booking and save passenger info for future use"
          ],
          mockDataNote: "Note: These are sample flights. In production, you would see real-time pricing and availability."
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
                  `First flight search (fallback): ${flightIntent.origin} → ${flightIntent.destination}`,
                  `Searched for ${flightIntent.passengers} passenger(s)`,
                  `Preferred class: ${flightIntent.class}`,
                  `Used fallback data due to search and recovery failure`
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
          searchError: searchError.message,
          openapiRecoveryFailed: true
        });
      
        res.status(200).json(mockResponse);
      }
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
