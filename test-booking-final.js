// Final test script for Amadeus API booking functionality
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

async function testFinalBooking() {
    try {
        console.log('🧪 Testing Amadeus Test Booking API with valid passport dates...');
        
        const token = await getAmadeusToken();
        
        // Calculate future dates for passport validity
        const today = new Date();
        const futureDate = new Date(today.getFullYear() + 5, today.getMonth(), today.getDate());
        const futureDateStr = futureDate.toISOString().split('T')[0];
        
        console.log('📅 Using passport expiry date:', futureDateStr);
        
        // Create a properly formatted test booking request with valid dates
        const testBookingData = {
            data: {
                type: 'flight-order',
                flightOffers: [
                    {
                        type: 'flight-offer',
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
                                },
                                fareDetailsBySegment: [
                                    {
                                        segmentId: '1',
                                        cabin: 'ECONOMY',
                                        fareBasis: 'TEST123',
                                        class: 'Y',
                                        includedCheckedBags: {
                                            quantity: 0
                                        }
                                    }
                                ]
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
                                    number: '5555555555',
                                    deviceType: 'MOBILE'
                                }
                            ]
                        },
                        documents: [
                            {
                                documentType: 'PASSPORT',
                                birthPlace: 'Seattle',
                                issuanceLocation: 'Seattle',
                                issuanceDate: '2020-01-01', // More recent issuance
                                number: 'TEST123456',
                                expiryDate: futureDateStr, // Future expiry date
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

        console.log('📋 Final test booking data prepared');
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
        
        if (error.response?.status === 400) {
            console.log('\n💡 400 errors in test environment usually mean:');
            console.log('💡 1. Data validation issues (passport dates, etc.)');
            console.log('💡 2. Test environment restrictions');
            console.log('💡 3. Missing required fields');
        }
    }
}

// Run the final test
testFinalBooking();
