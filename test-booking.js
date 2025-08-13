// Test script for Amadeus API booking functionality
require('dotenv').config();
const axios = require('axios');

const AMADEUS_CLIENT_ID = process.env.AMADEUS_CLIENT_ID;
const AMADEUS_CLIENT_SECRET = process.env.AMADEUS_CLIENT_SECRET;
const AMADEUS_TOKEN_URL = 'https://test.api.amadeus.com/v1/security/oauth2/token';
const AMADEUS_BOOKING_URL = 'https://test.api.amadeus.com/v1/booking/flight-orders';

let amadeusToken = null;

async function getAmadeusToken() {
    try {
        const response = await axios.post(AMADEUS_TOKEN_URL, 
            'grant_type=client_credentials&client_id=' + AMADEUS_CLIENT_ID + '&client_secret=' + AMADEUS_CLIENT_SECRET,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        amadeusToken = response.data.access_token;
        console.log('✅ Amadeus token obtained successfully');
        return amadeusToken;
    } catch (error) {
        console.error('❌ Failed to get Amadeus token:', error.message);
        throw error;
    }
}

async function testSimpleBooking() {
    try {
        console.log('🧪 Testing Amadeus Test Booking API...');
        
        const token = await getAmadeusToken();
        
        // Create a minimal test booking request
        const testBookingData = {
            data: {
                type: 'flight-order',
                flightOffers: [
                    {
                        id: '1',
                        source: 'GDS',
                        instantTicketingRequired: false,
                        nonHomogeneous: false,
                        oneWay: true,
                        lastTicketingDate: '2025-08-13',
                        numberOfBookableSeats: 4,
                        itineraries: [
                            {
                                duration: 'PT1H2M',
                                segments: [
                                    {
                                        departure: {
                                            iataCode: 'SEA',
                                            at: '2025-08-12T21:20:00'
                                        },
                                        arrival: {
                                            iataCode: 'YVR',
                                            at: '2025-08-12T22:22:00'
                                        },
                                        carrierCode: 'WS',
                                        number: '6910',
                                        duration: 'PT1H2M',
                                        id: '1',
                                        numberOfStops: 0
                                    }
                                ]
                            }
                        ],
                        price: {
                            currency: 'USD',
                            total: '327.00',
                            base: '294.00'
                        },
                        pricingOptions: {
                            fareType: ['PUBLISHED']
                        },
                        validatingAirlineCodes: ['WS'],
                        travelerPricings: [
                            {
                                travelerId: '1',
                                fareOption: 'STANDARD',
                                travelerType: 'ADULT',
                                price: {
                                    currency: 'USD',
                                    total: '327.00'
                                }
                            }
                        ]
                    }
                ],
                travelers: [
                    {
                        id: '1',
                        dateOfBirth: '1990-01-01',
                        name: {
                            firstName: 'Test',
                            lastName: 'User'
                        },
                        gender: 'MALE',
                        contact: {
                            emailAddress: 'test@example.com',
                            phones: [
                                {
                                    countryCallingCode: '1',
                                    number: '5555555555'
                                }
                            ]
                        },
                        documents: [
                            {
                                documentType: 'PASSPORT',
                                birthPlace: 'Seattle',
                                issuanceLocation: 'Seattle',
                                issuanceDate: '2015-01-01',
                                number: 'TEST123456',
                                expiryDate: '2025-01-01',
                                issuanceCountry: 'US',
                                validityCountry: 'US',
                                nationality: 'US',
                                holder: true
                            }
                        ]
                    }
                ]
            }
        };

        console.log('📋 Test booking data prepared');
        console.log('🔄 Attempting test booking...');

        const response = await axios.post(AMADEUS_BOOKING_URL, testBookingData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('🎉 Test booking successful!');
        console.log('Booking ID:', response.data.id);
        console.log('Status:', response.data.status);
        console.log('Full response:', JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.log('❌ Test booking failed:');
        console.log('Status:', error.response?.status);
        console.log('Message:', error.response?.data?.errors?.[0]?.detail || error.message);
        console.log('Full error response:', JSON.stringify(error.response?.data, null, 2));
        
        // Check if it's a test environment limitation
        if (error.response?.status === 400) {
            console.log('\n💡 This 400 error is common in Amadeus test environment.');
            console.log('💡 Test environment often restricts actual bookings.');
            console.log('💡 Production environment would allow real bookings.');
        }
    }
}

// Also test the flight offers endpoint to see what's available
async function testFlightOffers() {
    try {
        console.log('\n🔍 Testing Flight Offers API...');
        
        const token = await getAmadeusToken();
        const response = await axios.get('https://test.api.amadeus.com/v2/shopping/flight-offers', {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            params: {
                originLocationCode: 'SEA',
                destinationLocationCode: 'YVR',
                departureDate: '2025-08-12',
                adults: 1,
                max: 1
            }
        });

        if (response.data.data && response.data.data.length > 0) {
            console.log('✅ Flight offer available for testing');
            console.log('Flight ID:', response.data.data[0].id);
            console.log('Price:', response.data.data[0].price.total, response.data.data[0].price.currency);
        }

    } catch (error) {
        console.log('❌ Flight offers test failed:', error.message);
    }
}

// Run tests
async function runTests() {
    await testFlightOffers();
    await testSimpleBooking();
}

runTests();

