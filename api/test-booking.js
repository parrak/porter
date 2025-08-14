// Test endpoint for flight booking without authentication
// This is for development/testing purposes only

const { generateRequestId, logTelemetry } = require('../utils/telemetry');
const { executeQuery } = require('../database/connection');

// Import the Amadeus booking function
const { bookFlightWithAmadeus } = require('./book-flight');

module.exports = async (req, res) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  console.log(`[${requestId}] 🧪 Test booking endpoint called: POST /api/test-booking`);
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method Not Allowed',
      message: 'Only POST requests are allowed',
      allowedMethods: ['POST']
    });
  }
  
  try {
    const { 
      flightOffer, 
      passengerDetails, 
      testMode = 'mock' // 'mock', 'amadeus', or 'both'
    } = req.body;
    
    console.log(`[${requestId}] 🎫 Test booking request received:`, {
      flightOfferId: flightOffer?.id,
      passengerCount: passengerDetails?.length,
      testMode
    });
    
    // Validate required parameters
    if (!flightOffer || !passengerDetails) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'flightOffer and passengerDetails are required',
        required: ['flightOffer', 'passengerDetails'],
        received: {
          flightOffer: !!flightOffer,
          passengerDetails: !!passengerDetails
        }
      });
    }
    
    // Validate passenger details
    if (!Array.isArray(passengerDetails) || passengerDetails.length === 0) {
      return res.status(400).json({
        error: 'Invalid passenger details',
        message: 'passengerDetails must be a non-empty array'
      });
    }
    
    // Transform passenger details to match Amadeus format
    const passengers = passengerDetails.map((passenger, index) => ({
      id: `traveler-${Date.now()}-${index}`,
      dateOfBirth: passenger.dateOfBirth,
      name: {
        firstName: passenger.firstName,
        lastName: passenger.lastName
      },
      gender: passenger.gender || 'MALE',
      contact: {
        emailAddress: passenger.email || `test${index}@example.com`,
        phones: [
          {
            deviceType: 'MOBILE',
            countryCallingCode: '1',
            number: passenger.phone || '5551234567'
          }
        ]
      },
      documents: [
        {
          documentType: 'PASSPORT',
          birthPlace: passenger.nationality || 'US',
          issuanceLocation: passenger.nationality || 'US',
          number: passenger.documentNumber,
          expiryDate: passenger.documentExpiryDate,
          issuanceDate: '2020-01-01',
          nationality: passenger.nationality || 'US',
          issuanceCountry: passenger.nationality || 'US',
          holder: true
        }
      ]
    }));
    
    // Mock contact and payment info for testing
    const contactInfo = {
      email: 'test@example.com',
      phone: '+15551234567'
    };
    
    const paymentInfo = {
      method: 'credit_card',
      cardNumber: '****1234'
    };
    
    const results = {
      testMode,
      requestId,
      flightOffer: {
        id: flightOffer.id,
        origin: flightOffer.origin || flightOffer.from,
        destination: flightOffer.destination || flightOffer.to,
        departureDate: flightOffer.departureDate || flightOffer.date,
        price: flightOffer.price
      },
      passengers: passengerDetails,
      timestamp: new Date().toISOString()
    };
    
    // Test Amadeus integration if requested
    if (testMode === 'amadeus' || testMode === 'both') {
      console.log(`[${requestId}] 🚀 Testing Amadeus integration...`);
      
      try {
        const amadeusResult = await bookFlightWithAmadeus(
          flightOffer,
          passengers,
          contactInfo,
          paymentInfo,
          requestId
        );
        
        results.amadeus = {
          success: true,
          result: amadeusResult,
          message: 'Amadeus integration test successful'
        };
        
        console.log(`[${requestId}] ✅ Amadeus integration test passed`);
        
      } catch (amadeusError) {
        console.error(`[${requestId}] ❌ Amadeus integration test failed:`, amadeusError);
        
        results.amadeus = {
          success: false,
          error: amadeusError.message,
          details: amadeusError,
          message: 'Amadeus integration test failed - check logs for details'
        };
      }
    }
    
    // Always include mock response for comparison
    if (testMode === 'mock' || testMode === 'both') {
      console.log(`[${requestId}] 🎭 Generating mock response...`);
      
      const mockBookingReference = `TEST-MOCK-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      
      results.mock = {
        success: true,
        bookingReference: mockBookingReference,
        message: 'Mock booking completed successfully',
        dataSource: 'mock_booking',
        bookingDetails: {
          status: 'confirmed',
          confirmationNumber: mockBookingReference,
          totalPrice: flightOffer.price?.total || '299.99',
          currency: flightOffer.price?.currency || 'USD'
        }
      };
    }
    
    // Log test results
    logTelemetry('test_booking_completed', {
      requestId,
      success: true,
      testMode,
      flightOfferId: flightOffer.id,
      passengerCount: passengerDetails.length,
      hasAmadeusResult: !!results.amadeus,
      hasMockResult: !!results.mock
    });
    
    const totalDuration = Date.now() - startTime;
    console.log(`[${requestId}] 🎉 Test booking completed in ${totalDuration}ms`);
    
    res.status(200).json({
      success: true,
      message: `Test booking completed successfully in ${totalDuration}ms`,
      testMode,
      results,
      requestId,
      duration: totalDuration
    });
    
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error(`[${requestId}] ❌ Test booking failed after ${totalDuration}ms:`, error);
    
    logTelemetry('test_booking_error', {
      requestId,
      success: false,
      error: error.message,
      duration: totalDuration
    });
    
    res.status(500).json({
      success: false,
      error: 'Test booking failed',
      message: error.message,
      requestId,
      duration: totalDuration
    });
  }
};
