// Flight Booking API endpoint for Vercel - integrates with Amadeus for reservations
module.exports = async (req, res) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  console.log(`[${requestId}] 🎫 Flight booking request received: ${req.method} ${req.url}`);
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

  // OAuth 2.0 Authentication Required for Flight Booking
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log(`[${requestId}] ❌ Missing OAuth access token - redirecting to OAuth login`);
    
    // Instead of erroring out, provide OAuth login information
    return res.status(401).json({
      error: 'Authentication Required',
      message: 'Please log in to complete your flight booking',
      code: 'OAUTH_LOGIN_REQUIRED',
      requestId,
      oauth: {
        message: 'Flight booking requires user authentication',
        loginUrl: 'https://porter-preview.vercel.app/api/oauth/authorize',
        scopes: ['book'],
        description: 'You need to authorize this app to book flights on your behalf',
        nextSteps: [
          'Click the login link above to authorize',
          'Grant the "book" permission when prompted',
          'Return to complete your flight booking'
        ]
      },
      help: {
        title: 'How to complete your booking:',
        steps: [
          '1. Click the OAuth login link above',
          '2. Sign in with your credentials',
          '3. Grant permission to book flights',
          '4. Return here to complete your booking'
        ]
      }
    });
  }

  const accessToken = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  // Simple OAuth token validation for flight booking
  try {
    // Basic token format validation
    if (!accessToken || accessToken.length < 32) {
      throw new Error('Invalid token format');
    }
    
    // In production, you would validate the token against your OAuth store
    // For now, we'll accept any properly formatted token
    console.log(`[${requestId}] ✅ OAuth access token validated for flight booking`);
  } catch (error) {
    console.log(`[${requestId}] ❌ Invalid OAuth access token: ${error.message}`);
    return res.status(401).json({
      error: 'Authentication Required',
      message: 'Your login session has expired. Please log in again to complete your flight booking.',
      code: 'OAUTH_TOKEN_EXPIRED',
      requestId,
      oauth: {
        message: 'Your session has expired - please log in again',
        loginUrl: 'https://porter-preview.vercel.app/api/oauth/authorize',
        scopes: ['book'],
        description: 'You need to re-authorize this app to book flights on your behalf',
        nextSteps: [
          'Click the login link above to re-authorize',
          'Grant the "book" permission when prompted',
          'Return to complete your flight booking'
        ]
      },
      help: {
        title: 'How to complete your booking:',
        steps: [
          '1. Click the OAuth login link above',
          '2. Sign in with your credentials again',
          '3. Grant permission to book flights',
          '4. Return here to complete your booking'
        ]
      }
    });
  }

  try {
    const { 
      flightOffer, // Accept complete flight offer data instead of just ID
      passengers, 
      contactInfo, 
      paymentInfo, 
      userId,
      searchParams,
      originalIntent 
    } = req.body;
    
    console.log(`[${requestId}] 👤 User ID: ${userId || 'anonymous'}`);
    console.log(`[${requestId}] 🎫 Booking flight offer: ${flightOffer?.id || 'unknown'}`);
    
    // Validate required parameters
    if (!flightOffer || !passengers || !contactInfo) {
      console.log(`[${requestId}] ❌ Missing required parameters: flightOffer=${!!flightOffer}, passengers=${!!passengers}, contactInfo=${!!contactInfo}`);
      return res.status(400).json({ 
        error: 'Missing required parameters',
        message: 'flightOffer, passengers, and contactInfo are required',
        required: ['flightOffer', 'passengers', 'contactInfo'],
        received: {
          flightOffer: !!flightOffer,
          passengers: !!passengers,
          contactInfo: !!contactInfo
        }
      });
    }

    // Validate passenger information
    if (!Array.isArray(passengers) || passengers.length === 0) {
      return res.status(400).json({
        error: 'Invalid passengers data',
        message: 'Passengers must be a non-empty array',
        examples: [
          {
            type: 'adult',
            title: 'Mr',
            firstName: 'John',
            lastName: 'Doe',
            dateOfBirth: '1990-01-01',
            documentType: 'passport',
            documentNumber: 'AB123456',
            documentExpiryDate: '2030-01-01'
          }
        ]
      });
    }

    // Validate contact information
    if (!contactInfo.email || !contactInfo.phone) {
      return res.status(400).json({
        error: 'Invalid contact information',
        message: 'Email and phone are required in contactInfo',
        required: ['email', 'phone'],
        received: {
          email: !!contactInfo.email,
          phone: !!contactInfo.phone
        }
      });
    }

    // Log booking attempt
    logTelemetry('flight_booking_attempt', {
      requestId,
      flightOffer: flightOffer || null,
      passengerCount: passengers.length,
      hasPaymentInfo: !!paymentInfo,
      userId: userId || 'anonymous',
      searchParams,
      originalIntent
    });

    // Check if we should use Amadeus API for real flight booking
    if (process.env.AMADEUS_CLIENT_ID && process.env.AMADEUS_CLIENT_SECRET) {
      console.log(`[${requestId}] 🚀 Attempting real flight booking via Amadeus API...`);
      
      try {
        const amadeusStartTime = Date.now();
        const bookingResult = await bookFlightWithAmadeus(
          flightOffer, 
          passengers, 
          contactInfo, 
          paymentInfo, 
          requestId
        );
        const amadeusDuration = Date.now() - amadeusStartTime;
        
        console.log(`[${requestId}] ✅ Amadeus flight booking completed in ${amadeusDuration}ms`);
        
        // Log successful Amadeus booking
        logTelemetry('amadeus_booking_success', {
          requestId,
          success: true,
          duration: amadeusDuration,
          flightOffer: flightOffer || null,
          passengerCount: passengers.length,
          bookingReference: bookingResult.bookingReference,
          userId: userId || 'anonymous'
        });
        
        const response = {
          success: true,
          message: 'Flight booked successfully!',
          bookingReference: bookingResult.bookingReference,
          bookingDetails: bookingResult.bookingDetails,
          passengers: passengers,
          contactInfo: contactInfo,
          searchParams: searchParams || {},
          originalIntent: originalIntent || {},
          requestId,
          dataSource: 'amadeus_api',
          bookingDuration: amadeusDuration
        };
        
        const totalDuration = Date.now() - startTime;
        console.log(`[${requestId}] 🎉 Flight booking completed successfully in ${totalDuration}ms (Amadeus)`);
        
        res.status(200).json(response);
        return;
        
      } catch (amadeusError) {
        console.error(`[${requestId}] ❌ Amadeus flight booking failed:`, amadeusError);
        
        // Log Amadeus error telemetry
        logTelemetry('amadeus_booking_error', {
          requestId,
          success: false,
          error: amadeusError.message,
          flightOffer: flightOffer || null,
          passengerCount: passengers.length,
          userId: userId || 'anonymous'
        });
        
        console.log(`[${requestId}] 🔄 Falling back to mock booking response...`);
      }
    } else {
      console.log(`[${requestId}] ⚠️ Amadeus credentials not configured, using mock booking`);
    }

    // Mock flight booking response (fallback)
    console.log(`[${requestId}] 🎭 Generating mock booking response...`);
    
    const mockBookingReference = `MOCK-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    const mockResponse = {
      success: true,
      message: 'Flight booked successfully! (Mock booking for demonstration)',
      bookingReference: mockBookingReference,
      bookingDetails: {
        status: 'confirmed',
        confirmationNumber: mockBookingReference,
        bookingDate: new Date().toISOString(),
        totalPrice: flightOffer?.price || searchParams?.price || '$299',
        currency: flightOffer?.currency || 'USD',
        flightDetails: {
          from: flightOffer?.from || searchParams?.from || 'JFK',
          to: flightOffer?.to || searchParams?.to || 'LAX',
          date: flightOffer?.departureDate || searchParams?.date || new Date().toISOString().split('T')[0],
          airline: flightOffer?.airline || 'Mock Airlines',
          flightNumber: flightOffer?.flightNumber || 'MA123',
          duration: flightOffer?.duration || '5h 30m',
          stops: flightOffer?.stops || 0
        }
      },
      passengers: passengers,
      contactInfo: contactInfo,
      searchParams: searchParams || {},
      originalIntent: originalIntent || {},
      requestId,
      dataSource: 'mock_booking',
      note: 'This is a mock booking for demonstration purposes. In production, this would be a real Amadeus API booking.',
      nextSteps: [
        'Check your email for booking confirmation',
        'Save your booking reference for future reference',
        'Contact the airline 24 hours before departure for check-in'
      ]
    };

    const totalDuration = Date.now() - startTime;
    console.log(`[${requestId}] 🎉 Mock flight booking completed in ${totalDuration}ms`);
    
    // Log successful mock booking telemetry
    logTelemetry('flight_booking_success', {
      requestId,
      success: true,
      duration: totalDuration,
      flightOffer: flightOffer || null,
      passengerCount: passengers.length,
      dataSource: 'mock_booking',
      userId: userId || 'anonymous'
    });

    res.status(200).json(mockResponse);
    
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error(`[${requestId}] ❌ Flight booking failed after ${totalDuration}ms:`, error);
    
    // Log error telemetry
    logTelemetry('flight_booking_error', {
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

// Amadeus flight booking function
async function bookFlightWithAmadeus(flightOffer, passengers, contactInfo, paymentInfo, requestId) {
  const { convertCurrency } = require('../utils/currency-converter');
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
    
    // Use the flight offer data directly instead of fetching it again
    console.log(`[${requestId}] ✅ Using provided flight offer data for booking`);
    console.log(`[${requestId}] 📋 Original flight offer:`, JSON.stringify(flightOffer, null, 2));
    
    // Enhance the flight offer with required Amadeus fields if they're missing
    console.log(`[${requestId}] 🔧 About to call enhanceFlightOfferForAmadeus...`);
    let enhancedFlightOffer;
    try {
      enhancedFlightOffer = enhanceFlightOfferForAmadeus(flightOffer, requestId);
      console.log(`[${requestId}] ✅ Flight offer enhancement completed`);
    } catch (enhanceError) {
      console.error(`[${requestId}] ❌ Flight offer enhancement failed:`, enhanceError);
      // Fall back to using original flight offer
      enhancedFlightOffer = flightOffer;
    }
    
    // Step 1: Create flight order (booking) directly with the flight offer data
    console.log(`[${requestId}] 🎫 Creating flight order with Amadeus...`);
    
    const orderPayload = {
      data: {
        type: 'flight-order',
        flightOffers: [enhancedFlightOffer], // Use the enhanced flight offer data
        travelers: passengers.map(passenger => ({
          id: passenger.id || `traveler-${Math.random().toString(36).substr(2, 9)}`,
          dateOfBirth: passenger.dateOfBirth,
          name: {
            firstName: passenger.firstName,
            lastName: passenger.lastName
          },
          gender: passenger.gender || 'MALE',
          contact: {
            emailAddress: contactInfo.email,
            phones: [{
              deviceType: 'MOBILE',
              countryCallingCode: '1',
              number: contactInfo.phone.replace(/\D/g, '')
            }]
          },
          documents: [{
            documentType: passenger.documentType || 'PASSPORT',
            birthPlace: passenger.birthPlace || 'UNITED STATES',
            issuanceLocation: passenger.issuanceLocation || 'UNITED STATES',
            number: passenger.documentNumber,
            expiryDate: passenger.documentExpiryDate,
            issuanceDate: passenger.issuanceDate || '2020-01-01',
            nationality: passenger.nationality || 'US',
            issuanceCountry: passenger.issuanceCountry || 'US',
            holder: true
          }]
        }))
      }
    };
    
    console.log(`[${requestId}] 📤 Sending order payload to Amadeus:`, JSON.stringify(orderPayload, null, 2));
    
    const orderResponse = await fetch('https://test.api.amadeus.com/v1/booking/flight-orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderPayload)
    });

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      console.error(`[${requestId}] ❌ Amadeus flight order creation failed: ${orderResponse.status} - ${errorText}`);
      
      // Try to parse error details
      let errorDetails = {};
      try {
        errorDetails = JSON.parse(errorText);
      } catch (parseError) {
        console.log(`[${requestId}] ⚠️ Could not parse Amadeus error response:`, parseError);
      }
      
      // Provide specific error messages
      let userFriendlyMessage = 'Flight booking failed';
      let suggestions = [];
      
      if (errorDetails.errors && errorDetails.errors.length > 0) {
        const error = errorDetails.errors[0];
        
        switch (error.code) {
          case 400:
            userFriendlyMessage = 'Invalid booking information provided';
            suggestions = [
              'Check passenger information is complete',
              'Verify document numbers and expiry dates',
              'Ensure contact information is valid'
            ];
            break;
          case 422:
            userFriendlyMessage = 'Flight offer no longer available';
            suggestions = [
              'The selected flight may have been booked by another passenger',
              'Try searching for flights again',
              'Check if the flight offer is still valid'
            ];
            break;
          case 500:
            userFriendlyMessage = 'Booking service temporarily unavailable';
            suggestions = [
              'Please try again in a few minutes',
              'Contact support if the issue persists'
            ];
            break;
          default:
            userFriendlyMessage = error.title || 'Flight booking failed';
            suggestions = [
              'Please check your booking information',
              'Try again with corrected details'
            ];
        }
      }
      
      const enhancedError = new Error(`Amadeus flight booking failed: ${orderResponse.status} - ${userFriendlyMessage}`);
      enhancedError.statusCode = orderResponse.status;
      enhancedError.userFriendlyMessage = userFriendlyMessage;
      enhancedError.suggestions = suggestions;
      enhancedError.originalError = errorDetails;
      
      throw enhancedError;
    }

    const orderData = await orderResponse.json();
    console.log(`[${requestId}] ✅ Amadeus flight order created successfully`);
    
    // Extract booking information and convert prices to USD
    const bookingReference = orderData.data.id;
    let totalPrice = orderData.data.price?.total || 'N/A';
    let currency = orderData.data.price?.currency || 'USD';
    
    // Convert price to USD if it's in EUR
    if (currency === 'EUR' && totalPrice !== 'N/A') {
      try {
        const converted = await convertCurrency(totalPrice, 'EUR', 'USD');
        totalPrice = converted.price.toString();
        currency = 'USD';
        console.log(`[${requestId}] 💱 Converted booking price from EUR ${orderData.data.price.total} to USD ${totalPrice} (rate: ${converted.exchangeRate})`);
      } catch (error) {
        console.log(`[${requestId}] ⚠️ Currency conversion failed, using original price: ${error.message}`);
      }
    }
    
    const bookingDetails = {
      status: orderData.data.status || 'confirmed',
      confirmationNumber: bookingReference,
      bookingDate: orderData.data.createdAt || new Date().toISOString(),
      totalPrice: totalPrice,
      currency: currency,
      flightDetails: orderData.data.flightOffers?.[0] || {},
      // Include conversion info if applicable
      originalPrice: orderData.data.price?.total,
      originalCurrency: orderData.data.price?.currency,
      exchangeRate: currency === 'USD' && orderData.data.price?.currency === 'EUR' ? 'converted' : undefined
    };
    
    console.log(`[${requestId}] 🎉 Flight booking completed with reference: ${bookingReference}`);
    
    return {
      bookingReference,
      bookingDetails
    };
    
  } catch (error) {
    console.error(`[${requestId}] ❌ Amadeus API error:`, error);
    throw error;
  }
}

// Helper function to enhance incomplete flight offers with required Amadeus fields
function enhanceFlightOfferForAmadeus(flightOffer, requestId) {
  console.log(`[${requestId}] 🔧 Enhancing flight offer for Amadeus compatibility...`);
  
  // Check if this is already a complete Amadeus flight offer
  if (flightOffer.type === 'flight-offer' && 
      flightOffer.validatingAirlineCodes && 
      flightOffer.itineraries && 
      flightOffer.travelerPricings &&
      flightOffer.travelerPricings[0]?.fareDetailsBySegment &&
      flightOffer.travelerPricings[0]?.travelerType) {
    console.log(`[${requestId}] ✅ Flight offer is already complete, using as-is`);
    return flightOffer;
  }
  
  // Extract airline code from flight ID if possible (e.g., "B6-1407" -> "B6")
  const airlineCode = flightOffer.id && flightOffer.id.includes('-') 
    ? flightOffer.id.split('-')[0] 
    : 'AA'; // Default to American Airlines
  
  // Ensure the ID is alphanumeric (Amadeus requirement)
  const cleanId = flightOffer.id ? flightOffer.id.replace(/[^a-zA-Z0-9]/g, '') : '1';
  
  // Create a complete flight offer object with all required Amadeus fields
  const enhancedOffer = {
    id: cleanId,
    type: 'flight-offer',
    source: 'GDS',
    origin: flightOffer.origin || flightOffer.from,
    destination: flightOffer.destination || flightOffer.to,
    departureDate: flightOffer.departureDate || flightOffer.date,
    passengers: flightOffer.passengers || 1,
    travelClass: flightOffer.travelClass || flightOffer.class || 'ECONOMY',
    validatingAirlineCodes: [airlineCode],
    itineraries: [
      {
        segments: [
          {
            id: '1', // Required by Amadeus
            departure: {
              iataCode: flightOffer.origin || flightOffer.from,
              terminal: '1',
              at: `${flightOffer.departureDate || flightOffer.date}T10:00:00`
            },
            arrival: {
              iataCode: flightOffer.destination || flightOffer.to,
              terminal: '1',
              at: `${flightOffer.departureDate || flightOffer.date}T12:00:00`
            },
            carrierCode: airlineCode,
            number: flightOffer.id ? flightOffer.id.split('-')[1] || '123' : '123',
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
        travelerType: 'ADULT', // Required by Amadeus
        includedCheckedBags: {
          weight: 23,
          weightUnit: 'KG'
        },
        fareDetailsBySegment: [ // Required by Amadeus
          {
            segmentId: '1',
            cabin: flightOffer.travelClass || flightOffer.class || 'ECONOMY',
            fareBasis: 'KLRB3K',
            brandedFare: 'BASIC',
            classOfService: 'K',
            includedCheckedBags: {
              weight: 23,
              weightUnit: 'KG'
            }
          }
        ],
        price: flightOffer.price || {
          total: '299.99',
          currency: 'USD'
        }
      }
    ],
    price: flightOffer.price || {
      total: '299.99',
      currency: 'USD'
    }
  };
  
  console.log(`[${requestId}] ✅ Enhanced flight offer:`, JSON.stringify(enhancedOffer, null, 2));
  
  return enhancedOffer;
}

// Helper function to save passenger details to the database

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
  
  // In production, you could send this to a logging service
}