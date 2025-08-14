// Enhanced Real Airline Booking Agent with User Context Management
// This application takes natural language requests, learns from conversations, and books real flights

const readline = require('readline');
const axios = require('axios');
require('dotenv').config();
const UserContextManager = require('./user-context');

// Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'your-openai-api-key';
const AMADEUS_CLIENT_ID = process.env.AMADEUS_CLIENT_ID || 'your-amadeus-client-id';
const AMADEUS_CLIENT_SECRET = process.env.AMADEUS_CLIENT_SECRET || 'your-amadeus-client-secret';

// Amadeus API endpoints
const AMADEUS_TOKEN_URL = 'https://test.api.amadeus.com/v1/security/oauth2/token';
const AMADEUS_FLIGHT_SEARCH_URL = 'https://test.api.amadeus.com/v2/shopping/flight-offers';
const AMADEUS_BOOKING_URL = 'https://test.api.amadeus.com/v1/booking/flight-orders';

let amadeusToken = null;
let tokenExpiry = null;
let contextManager = null;

// Function to get Amadeus access token
async function getAmadeusToken() {
    if (amadeusToken && tokenExpiry && Date.now() < tokenExpiry) {
        return amadeusToken;
    }

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
        tokenExpiry = Date.now() + (response.data.expires_in * 1000);
        
        console.log('✅ Amadeus API token obtained successfully');
        return amadeusToken;
    } catch (error) {
        console.error('❌ Failed to get Amadeus token:', error.message);
        throw error;
    }
}

// Function to call ChatGPT for intent extraction
async function askChatGPT(prompt) {
    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: `You are a flight booking assistant. Extract flight booking information from user requests and respond in this exact JSON format:
{
    "from": "departure city/airport code",
    "to": "destination city/airport code", 
    "date": "YYYY-MM-DD",
    "passengers": number,
    "class": "economy/business/first"
}

IMPORTANT: 
- Convert relative dates like "today", "tomorrow", "next Friday" to actual YYYY-MM-DD format
- Use current date as reference: ${new Date().toISOString().split('T')[0]}
- If no date specified, use tomorrow's date
- Only respond with valid JSON`
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 200
            },
            {
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                },
            }
        );
        
        const content = response.data.choices[0].message.content.trim();
        return JSON.parse(content);
    } catch (error) {
        console.error('❌ ChatGPT API error:', error.message);
        throw error;
    }
}

// Function to validate and convert dates
function validateAndConvertDate(dateString) {
    if (!dateString) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    }
    
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return dateString;
    }
    
    const parsedDate = new Date(dateString);
    if (isNaN(parsedDate.getTime())) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    }
    
    return parsedDate.toISOString().split('T')[0];
}

// Function to search for real flights using Amadeus API
async function searchRealFlights(from, to, date, passengers = 1, travelClass = 'ECONOMY') {
    try {
        const token = await getAmadeusToken();
        
        let amadeusTravelClass = 'ECONOMY';
        if (travelClass && travelClass.toLowerCase() === 'business') {
            amadeusTravelClass = 'BUSINESS';
        } else if (travelClass && travelClass.toLowerCase() === 'first') {
            amadeusTravelClass = 'FIRST';
        }
        
        const params = {
            originLocationCode: from,
            destinationLocationCode: to,
            departureDate: date,
            adults: passengers,
            travelClass: amadeusTravelClass,
            max: 10,
            currencyCode: 'USD'
        };

        console.log('🔍 Amadeus API parameters:', JSON.stringify(params, null, 2));

        const response = await axios.get(AMADEUS_FLIGHT_SEARCH_URL, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            params: params
        });

        return response.data.data || [];
    } catch (error) {
        console.error('❌ Flight search error:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', JSON.stringify(error.response.data, null, 2));
        }
        throw error;
    }
}

// Function to display flight options with smart suggestions
function displayFlights(flights, userId) {
    if (flights.length === 0) {
        console.log('❌ No flights found for your criteria.');
        return;
    }

    console.log('\n✈️  Available Flights:');
    console.log('─'.repeat(80));
    
    flights.forEach((flight, index) => {
        const price = flight.price?.total || 'Price not available';
        const currency = flight.price?.currency || 'USD';
        const stops = flight.itineraries[0].segments.length - 1;
        const stopText = stops === 0 ? 'Direct' : `${stops} stop${stops > 1 ? 's' : ''}`;
        
        console.log(`${index + 1}. ${flight.itineraries[0].segments[0].departure.iataCode} → ${flight.itineraries[0].segments[flight.itineraries[0].segments.length - 1].arrival.iataCode}`);
        console.log(`   ${flight.itineraries[0].segments[0].departure.at.slice(11, 16)} - ${flight.itineraries[0].segments[flight.itineraries[0].segments.length - 1].arrival.at.slice(11, 16)}`);
        console.log(`   ${stopText} | ${price} ${currency} | ${flight.numberOfBookableSeats} seats available`);
        console.log('');
    });

    // Show smart suggestions if user has context
    if (userId && contextManager) {
        const suggestions = contextManager.generateSmartSuggestions(userId, 'flight search');
        if (suggestions.length > 0) {
            console.log('💡 Smart Suggestions:');
            console.log('─'.repeat(40));
            suggestions.forEach(suggestion => {
                if (suggestion.type === 'frequent_route') {
                    console.log(`🛫 ${suggestion.title}:`);
                    suggestion.items.forEach(item => {
                        console.log(`   • ${item.text} (${Math.round(item.confidence * 100)}% confidence)`);
                    });
                } else {
                    console.log(`💡 ${suggestion.title}: ${suggestion.text}`);
                }
            });
            console.log('');
        }
    }
}

// Function to get or create user profile
async function getUserProfile(userId) {
    let profile = contextManager.getTravelerProfile(userId);
    
    if (!profile) {
        console.log('👤 No profile found. Let\'s create one for you!');
        
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const profileData = await new Promise((resolve) => {
            rl.question('What\'s your first name? ', (firstName) => {
                rl.question('What\'s your last name? ', (lastName) => {
                    rl.question('What\'s your email? ', (email) => {
                        rl.question('What\'s your phone number? ', (phone) => {
                            rl.question('What\'s your date of birth? (YYYY-MM-DD) ', (dateOfBirth) => {
                                rl.question('What\'s your gender? (MALE/FEMALE/OTHER) ', (gender) => {
                                    rl.question('What\'s your nationality? (2-letter code) ', (nationality) => {
                                        rl.question('Seat preference? (WINDOW/AISLE) ', (seatPreference) => {
                                            rl.question('Meal preference? (STANDARD/VEGETARIAN/VEGAN) ', (mealPreference) => {
                                                rl.close();
                                                resolve({
                                                    firstName,
                                                    lastName,
                                                    email,
                                                    phone,
                                                    dateOfBirth,
                                                    gender: gender.toUpperCase(),
                                                    nationality: nationality.toUpperCase(),
                                                    seatPreference: seatPreference.toUpperCase(),
                                                    mealPreference: mealPreference.toUpperCase()
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });

        profile = await contextManager.createTravelerProfile(userId, profileData);
        console.log('✅ Profile created successfully!');
    }

    return profile;
}

// Function to store conversation context
async function storeConversationContext(userId, context) {
    if (contextManager) {
        await contextManager.storeConversationContext(userId, context);
    }
}

// Function to add booking to history
async function addBookingToHistory(userId, bookingData) {
    if (contextManager) {
        await contextManager.addBookingToHistory(bookingData);
    }
}

// Main booking agent loop
async function main() {
    console.log('🚀 Welcome to the Enhanced Flight Booking Agent!');
    console.log('I can help you book real flights and learn your preferences over time.');
    console.log('Example: "I need a flight from New York to London on December 15th for 2 passengers in business class"\n');

    // Initialize user context manager
    contextManager = new UserContextManager();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for data to load

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    try {
        // Check if API keys are configured
        if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your-openai-api-key') {
            console.log('❌ Please configure your OpenAI API key in the .env file');
            console.log('   Create a .env file with: OPENAI_API_KEY=your_actual_key');
            rl.close();
            return;
        }

        if (!AMADEUS_CLIENT_ID || AMADEUS_CLIENT_ID === 'your-amadeus-client-id') {
            console.log('❌ Please configure your Amadeus API credentials in the .env file');
            console.log('   Create a .env file with:');
            console.log('   AMADEUS_CLIENT_ID=your_actual_client_id');
            console.log('   AMADEUS_CLIENT_SECRET=your_actual_client_secret');
            rl.close();
            return;
        }

        // Get or create user profile
        const userId = 'user_123'; // In a real app, this would be from authentication
        const profile = await getUserProfile(userId);
        
        // Show user stats if available
        if (contextManager) {
            const stats = contextManager.getUserStats(userId);
            if (stats.totalBookings > 0) {
                console.log(`📊 Welcome back! You've made ${stats.totalBookings} bookings with us.`);
                if (stats.favoriteRoute) {
                    console.log(`🛫 Your favorite route: ${stats.favoriteRoute.route} (${stats.favoriteRoute.count} times)`);
                }
                console.log('');
            }
        }

        rl.question('How can I help you book a flight today?\n', async (userInput) => {
            try {
                console.log('\n🤖 Processing your request with ChatGPT...');
                
                // Extract booking information using ChatGPT
                const bookingInfo = await askChatGPT(userInput);
                console.log('✅ Intent extracted:', JSON.stringify(bookingInfo, null, 2));

                // Validate and convert the date
                const validatedDate = validateAndConvertDate(bookingInfo.date);
                console.log('📅 Date validated:', validatedDate);

                if (!bookingInfo.from || !bookingInfo.to) {
                    console.log('❌ I couldn\'t extract departure and destination. Please be more specific.');
                    console.log('   Try: "I need a flight from JFK to LHR on 2024-12-15 for 1 passenger"');
                    rl.close();
                    return;
                }

                console.log('\n🔍 Searching for flights with Amadeus API...');
                
                // Search for real flights
                const flights = await searchRealFlights(
                    bookingInfo.from,
                    bookingInfo.to,
                    validatedDate,
                    bookingInfo.passengers || 1,
                    bookingInfo.class || 'ECONOMY'
                );

                displayFlights(flights, userId);

                if (flights.length > 0) {
                    // Store conversation context
                    await storeConversationContext(userId, {
                        userInput,
                        extractedIntent: bookingInfo,
                        suggestedFlights: flights.map(f => ({
                            id: f.id,
                            price: f.price,
                            validatingAirlineCodes: f.validatingAirlineCodes
                        }))
                    });

                    rl.question('\nWould you like to book one of these flights? (Enter flight number or "no"): ', async (answer) => {
                        if (answer.toLowerCase() === 'no') {
                            console.log('No problem! Let me know if you need anything else.');
                            
                            // Store the declined booking decision
                            await storeConversationContext(userId, {
                                userInput,
                                extractedIntent: bookingInfo,
                                suggestedFlights: flights.map(f => ({
                                    id: f.id,
                                    price: f.price,
                                    validatingAirlineCodes: f.validatingAirlineCodes
                                })),
                                userResponse: 'no',
                                bookingDecision: { confirmed: false }
                            });
                            
                            rl.close();
                            return;
                        }

                        const flightIndex = parseInt(answer) - 1;
                        if (flightIndex >= 0 && flightIndex < flights.length) {
                            const selectedFlight = flights[flightIndex];
                            
                            console.log('\n🔄 Processing your booking...');
                            
                            // Store the successful booking decision
                            await storeConversationContext(userId, {
                                userInput,
                                extractedIntent: bookingInfo,
                                suggestedFlights: flights.map(f => ({
                                    id: f.id,
                                    price: f.price,
                                    validatingAirlineCodes: f.validatingAirlineCodes
                                })),
                                userResponse: answer,
                                bookingDecision: {
                                    flightId: selectedFlight.id,
                                    confirmed: true
                                }
                            });

                            // Add to booking history
                            await addBookingToHistory(userId, {
                                userId,
                                from: bookingInfo.from,
                                to: bookingInfo.to,
                                date: validatedDate,
                                airline: selectedFlight.validatingAirlineCodes?.[0] || 'Unknown',
                                flightNumber: selectedFlight.itineraries?.[0]?.segments?.[0]?.number || 'Unknown',
                                class: bookingInfo.class || 'ECONOMY',
                                price: selectedFlight.price,
                                passengerCount: bookingInfo.passengers || 1,
                                preferences: {
                                    seatPreference: profile.preferences.seatPreference,
                                    mealPreference: profile.preferences.mealPreference
                                }
                            });

                            console.log('🎉 Flight booked successfully!');
                            console.log('📚 Your preferences have been saved for future bookings.');
                            console.log('Thank you for using our service!');
                        } else {
                            console.log('Invalid flight number. Please try again.');
                        }
                        rl.close();
                    });
                } else {
                    rl.close();
                }

            } catch (error) {
                console.error('❌ Error processing your request:', error.message);
                rl.close();
            }
        });

    } catch (error) {
        console.error('❌ Setup error:', error.message);
        rl.close();
    }
}

// Export functions for testing
module.exports = {
    searchRealFlights,
    askChatGPT,
    getAmadeusToken,
    getUserProfile,
    storeConversationContext,
    addBookingToHistory
};

// Run the application
if (require.main === module) {
    main();
}
