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

  try {
    const { 
      flightOfferId, 
      passengers, 
      contactInfo, 
      paymentInfo, 
      userId,
      searchParams,
      originalIntent 
    } = req.body;
    
    console.log(`[${requestId}] 👤 User ID: ${userId || 'anonymous'}`);
    console.log(`[${requestId}] 🎫 Booking flight offer: ${flightOfferId}`);
    
    // Validate required parameters
    if (!flightOfferId || !passengers || !contactInfo) {
      console.log(`[${requestId}] ❌ Missing required parameters: flightOfferId=${flightOfferId}, passengers=${!!passengers}, contactInfo=${!!contactInfo}`);
      return res.status(400).json({ 
        error: 'Missing required parameters',
        message: 'flightOfferId, passengers, and contactInfo are required',
        required: ['flightOfferId', 'passengers', 'contactInfo'],
        received: {
          flightOfferId: !!flightOfferId,
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
      flightOfferId,
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
          flightOfferId, 
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
          flightOfferId,
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
          flightOfferId,
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
        totalPrice: searchParams?.price || '$299',
        currency: 'USD',
        flightDetails: {
          from: searchParams?.from || 'JFK',
          to: searchParams?.to || 'LAX',
          date: searchParams?.date || new Date().toISOString().split('T')[0],
          airline: 'Mock Airlines',
          flightNumber: 'MA123'
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
      flightOfferId,
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
async function bookFlightWithAmadeus(flightOfferId, passengers, contactInfo, paymentInfo, requestId) {
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
    
    // Step 1: First fetch the flight offer data
    console.log(`[${requestId}] 🔍 Fetching flight offer data from Amadeus...`);
    
    const flightOfferResponse = await fetch(`https://test.api.amadeus.com/v2/shopping/flight-offers/${flightOfferId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!flightOfferResponse.ok) {
      const errorText = await flightOfferResponse.text();
      console.error(`[${requestId}] ❌ Failed to fetch flight offer: ${flightOfferResponse.status} - ${errorText}`);
      throw new Error(`Failed to fetch flight offer: ${flightOfferResponse.status}`);
    }

    const flightOfferData = await flightOfferResponse.json();
    console.log(`[${requestId}] ✅ Flight offer data retrieved successfully`);
    
    // Step 2: Create flight order (booking)
    console.log(`[${requestId}] 🎫 Creating flight order with Amadeus...`);
    
    const orderPayload = {
      data: {
        type: 'flight-order',
        flightOffers: [flightOfferData.data],
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
            issuanceDate: passenger.issuanceDate || '2020-01-01'
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
    
    // Extract booking information
    const bookingReference = orderData.data.id;
    const bookingDetails = {
      status: orderData.data.status || 'confirmed',
      confirmationNumber: bookingReference,
      bookingDate: orderData.data.createdAt || new Date().toISOString(),
      totalPrice: orderData.data.price?.total || 'N/A',
      currency: orderData.data.price?.currency || 'USD',
      flightDetails: orderData.data.flightOffers?.[0] || {}
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

