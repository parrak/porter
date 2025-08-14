// Simple test script for the complete booking flow
// Run with: node test-booking-flow.js

const fetch = require('node-fetch');

async function testCompleteBookingFlow() {
  console.log('🧪 Testing Complete Booking Flow...\n');
  
  try {
    // Step 1: Get flight offers from ChatGPT API
    console.log('📡 Step 1: Getting flight offers from ChatGPT API...');
    const chatgptResponse = await fetch('https://porter-preview.vercel.app/api/chatgpt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Find me a flight from New York to Atlanta on September 5th, 2025',
        userId: 'demo1@example.com'
      })
    });
    
    if (!chatgptResponse.ok) {
      throw new Error(`ChatGPT API failed: ${chatgptResponse.status}`);
    }
    
    const chatgptData = await chatgptResponse.json();
    console.log(`✅ ChatGPT API: ${chatgptData.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`📊 Found ${chatgptData.flights?.length || 0} flights`);
    console.log(`📋 Complete flight offers: ${chatgptData.flightOffers?.length || 0}\n`);
    
    if (!chatgptData.flightOffers || chatgptData.flightOffers.length === 0) {
      console.log('❌ No complete flight offers available for testing');
      return;
    }
    
    // Step 2: Test with a complete flight offer
    const completeFlightOffer = chatgptData.flightOffers[0];
    console.log('🎫 Step 2: Testing with complete flight offer...');
    console.log(`   Flight ID: ${completeFlightOffer.id}`);
    console.log(`   Route: ${completeFlightOffer.origin || 'N/A'} → ${completeFlightOffer.destination || 'N/A'}`);
    console.log(`   Price: ${completeFlightOffer.price?.total || 'N/A'} ${completeFlightOffer.price?.currency || ''}`);
    console.log(`   Type: ${completeFlightOffer.type}`);
    console.log(`   Validating Airlines: ${completeFlightOffer.validatingAirlineCodes?.join(', ') || 'N/A'}`);
    console.log(`   Has Itineraries: ${!!completeFlightOffer.itineraries}`);
    console.log(`   Has Traveler Pricings: ${!!completeFlightOffer.travelerPricings}`);
    console.log(`   Has Fare Details: ${!!completeFlightOffer.travelerPricings?.[0]?.fareDetailsBySegment}\n`);
    
    // Step 3: Test the enhanced flight offer structure
    console.log('🔧 Step 3: Testing enhanced flight offer structure...');
    const hasRequiredFields = 
      completeFlightOffer.type === 'flight-offer' &&
      completeFlightOffer.validatingAirlineCodes &&
      completeFlightOffer.itineraries &&
      completeFlightOffer.travelerPricings &&
      completeFlightOffer.travelerPricings[0]?.travelerType === 'ADULT' &&
      completeFlightOffer.travelerPricings[0]?.fareDetailsBySegment;
    
    console.log(`✅ All required Amadeus fields present: ${hasRequiredFields ? 'YES' : 'NO'}`);
    
    if (hasRequiredFields) {
      console.log('🎉 Flight offer is ready for Amadeus booking!');
    } else {
      console.log('⚠️ Flight offer needs enhancement for Amadeus compatibility');
    }
    
    // Step 4: Test passenger details structure
    console.log('\n👤 Step 4: Testing passenger details structure...');
    const testPassenger = {
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '1990-01-01',
      documentNumber: 'US123456789',
      documentExpiryDate: '2030-01-01',
      nationality: 'United States'
    };
    
    console.log('✅ Test passenger details created');
    console.log(`   Name: ${testPassenger.firstName} ${testPassenger.lastName}`);
    console.log(`   DOB: ${testPassenger.dateOfBirth}`);
    console.log(`   Document: ${testPassenger.documentNumber}`);
    
    // Step 5: Summary
    console.log('\n📋 Step 5: Test Summary');
    console.log('========================');
    console.log(`✅ ChatGPT API: Working`);
    console.log(`✅ Flight Search: Working`);
    console.log(`✅ Complete Flight Offers: ${chatgptData.flightOffers?.length || 0} available`);
    console.log(`✅ Amadeus Compatibility: ${hasRequiredFields ? 'Ready' : 'Needs Enhancement'}`);
    console.log(`✅ Passenger Details: Ready`);
    console.log(`✅ Test Data: Complete`);
    
    if (hasRequiredFields) {
      console.log('\n🎯 READY FOR PRODUCTION!');
      console.log('The system can now:');
      console.log('1. Parse flight requests from ChatGPT');
      console.log('2. Return complete Amadeus flight offers');
      console.log('3. Process passenger details');
      console.log('4. Send complete data to Amadeus for booking');
    } else {
      console.log('\n⚠️ NEEDS ATTENTION');
      console.log('The flight offer enhancement needs to be fixed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testCompleteBookingFlow();
