// Flight intent parser using ChatGPT
async function parseFlightIntentWithChatGPT(message) {
  const startTime = Date.now();
  const requestId = generateRequestId();
  
  console.log(`[${requestId}] 🚀 Starting ChatGPT intent parsing for message: "${message}"`);
  
  try {
    // Use ChatGPT to parse the flight intent
    const prompt = `Interpret the user's request the best you can. Pick a airport pair which makes most sense. If you can't then offer a couple of suggestions back to the user.

Return ONLY a JSON object with the following structure:
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
        model: 'gpt-5',
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
  }
}

If information is missing, use null for those fields. Extract what you can from the message.`
          },
          {
            role: 'user',
            content: `Extract booking information from: "${message}"`
          }
        ],
        temperature: 0.1,
        max_tokens: 500
      })
    });

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiData = await openaiResponse.json();
    const extractedInfo = JSON.parse(openaiData.choices[0].message.content);
    
    console.log(`[${requestId}] ✅ Extracted booking information:`, extractedInfo);
    
    // Validate extracted information
    const validation = validateBookingInfo(extractedInfo);
    
    return {
      ...extractedInfo,
      isComplete: validation.isValid,
      missingFields: validation.missingFields
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
          
          const bookingResponse = await fetch(`${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/book-flight`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Request-ID': requestId,
              'X-Source': 'chatgpt-endpoint'
            },
            body: JSON.stringify({
              flightOfferId: bookingInfo.flightOfferId || '1', // Default for demo
              passengers: bookingInfo.passengers,
              contactInfo: bookingInfo.contactInfo,
              paymentInfo: bookingInfo.paymentInfo,
              userId: userId || 'anonymous',
              searchParams: {
                from: flightIntent.from,
                to: flightIntent.to,
                date: flightIntent.date,
                passengers: flightIntent.passengers,
                travelClass: flightIntent.class.toUpperCase()
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
              preferences: userProfile.preferences,
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
          examples: [
            "Book for John Doe, born 1990-01-01, passport AB123456 expires 2030-01-01, contact john@example.com, phone +1-555-123-4567",
            "I'm John Doe, passport AB123456, contact me at john@example.com or +1-555-123-4567"
          ]
        };
        
        // Log the incomplete booking prompt
        logTelemetry('chatgpt_booking_info_incomplete', {
          requestId,
          success: false,
          missingFields: bookingInfo.missingFields,
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
        } : null,
        firstTurnMessage: "When I check prices with our travel API, you'll see a one-time confirmation popup. This ensures your data is sent securely — you can approve and continue without repeating steps."
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
          note: 'Real flight search and OpenAPI recovery failed, showing sample data',
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
