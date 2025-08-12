// Web API Server for ChatGPT Integration
// This creates a REST API that ChatGPT can call to use your flight booking agent

const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();
const UserContextManager = require('./user-context');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize user context manager
const contextManager = new UserContextManager();

// Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const AMADEUS_CLIENT_ID = process.env.AMADEUS_CLIENT_ID;
const AMADEUS_CLIENT_SECRET = process.env.AMADEUS_CLIENT_SECRET;

// Amadeus API endpoints
const AMADEUS_TOKEN_URL = 'https://test.api.amadeus.com/v1/security/oauth2/token';
const AMADEUS_FLIGHT_SEARCH_URL = 'https://test.api.amadeus.com/v2/shopping/flight-offers';

let amadeusToken = null;
let tokenExpiry = null;

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
        return amadeusToken;
    } catch (error) {
        console.error('Failed to get Amadeus token:', error.message);
        throw error;
    }
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

        const response = await axios.get(AMADEUS_FLIGHT_SEARCH_URL, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            params: params
        });

        return response.data.data || [];
    } catch (error) {
        console.error('Flight search error:', error.message);
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

// ===== API ENDPOINTS =====

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        service: 'Flight Booking Agent API',
        timestamp: new Date().toISOString()
    });
});

// Search flights endpoint
app.post('/api/search-flights', async (req, res) => {
    try {
        const { from, to, date, passengers, travelClass, userId } = req.body;
        
        if (!from || !to) {
            return res.status(400).json({ 
                error: 'Missing required parameters: from and to' 
            });
        }

        const validatedDate = validateAndConvertDate(date);
        
        console.log(`Searching flights: ${from} → ${to} on ${validatedDate}`);
        
        const flights = await searchRealFlights(
            from.toUpperCase(),
            to.toUpperCase(),
            validatedDate,
            passengers || 1,
            travelClass || 'ECONOMY'
        );

        // Store conversation context if userId provided
        if (userId) {
            await contextManager.storeConversationContext(userId, {
                userInput: `Search flights from ${from} to ${to} on ${date}`,
                extractedIntent: { from, to, date: validatedDate, passengers, class: travelClass },
                suggestedFlights: flights.map(f => ({
                    id: f.id,
                    price: f.price,
                    validatingAirlineCodes: f.validatingAirlineCodes
                }))
            });
        }

        // Format flights for ChatGPT
        const formattedFlights = flights.map((flight, index) => {
            const price = flight.price?.total || 'Price not available';
            const currency = flight.price?.currency || 'USD';
            const stops = flight.itineraries[0].segments.length - 1;
            const stopText = stops === 0 ? 'Direct' : `${stops} stop${stops > 1 ? 's' : ''}`;
            
            return {
                flightNumber: index + 1,
                route: `${flight.itineraries[0].segments[0].departure.iataCode} → ${flight.itineraries[0].segments[flight.itineraries[0].segments.length - 1].arrival.iataCode}`,
                time: `${flight.itineraries[0].segments[0].departure.at.slice(11, 16)} - ${flight.itineraries[0].segments[flight.itineraries[0].segments.length - 1].arrival.at.slice(11, 16)}`,
                stops: stopText,
                price: `${price} ${currency}`,
                seats: flight.numberOfBookableSeats,
                airline: flight.validatingAirlineCodes?.[0] || 'Unknown'
            };
        });

        res.json({
            success: true,
            searchParams: { from, to, date: validatedDate, passengers, travelClass },
            flightsFound: flights.length,
            flights: formattedFlights,
            message: flights.length > 0 
                ? `Found ${flights.length} flights from ${from} to ${to} on ${validatedDate}`
                : `No flights found from ${from} to ${to} on ${validatedDate}`
        });

    } catch (error) {
        console.error('Search flights error:', error.message);
        res.status(500).json({ 
            error: 'Failed to search flights',
            details: error.message 
        });
    }
});

// Get user profile endpoint
app.get('/api/profile/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const profile = contextManager.getTravelerProfile(userId);
        
        if (!profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }
        
        res.json({ success: true, profile });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get profile' });
    }
});

// Create user profile endpoint
app.post('/api/profile', async (req, res) => {
    try {
        const { userId, profileData } = req.body;
        
        if (!userId || !profileData) {
            return res.status(400).json({ error: 'Missing userId or profileData' });
        }
        
        const profile = await contextManager.createTravelerProfile(userId, profileData);
        res.json({ success: true, profile });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create profile' });
    }
});

// Get user suggestions endpoint
app.get('/api/suggestions/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const suggestions = contextManager.generateSmartSuggestions(userId, 'flight search');
        
        res.json({ success: true, suggestions });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get suggestions' });
    }
});

// Get user stats endpoint
app.get('/api/stats/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const stats = contextManager.getUserStats(userId);
        
        res.json({ success: true, stats });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

// Get popular routes endpoint
app.get('/api/routes/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const routes = contextManager.getUserPopularRoutes(userId);
        
        res.json({ success: true, routes });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get routes' });
    }
});

// Add booking to history endpoint
app.post('/api/booking', async (req, res) => {
    try {
        const bookingData = req.body;
        
        if (!bookingData.userId) {
            return res.status(400).json({ error: 'Missing userId' });
        }
        
        const booking = await contextManager.addBookingToHistory(bookingData);
        res.json({ success: true, booking });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add booking' });
    }
});

// ===== CHATGPT INTEGRATION ENDPOINTS =====

// Main ChatGPT interaction endpoint
app.post('/api/chatgpt', async (req, res) => {
    try {
        const { message, userId } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Simple intent extraction (you can enhance this with ChatGPT API)
        const intent = extractFlightIntent(message);
        
        if (intent.from && intent.to) {
            // Search for flights
            const flights = await searchRealFlights(
                intent.from,
                intent.to,
                intent.date,
                intent.passengers,
                intent.class
            );

            // Store context if userId provided
            if (userId) {
                await contextManager.storeConversationContext(userId, {
                    userInput: message,
                    extractedIntent: intent,
                    suggestedFlights: flights.map(f => ({
                        id: f.id,
                        price: f.price,
                        validatingAirlineCodes: f.validatingAirlineCodes
                    }))
                });
            }

            // Format response for ChatGPT
            const response = formatFlightResponse(flights, intent);
            
            res.json({
                success: true,
                intent,
                response,
                flights: flights.length
            });
        } else {
            res.json({
                success: true,
                intent,
                response: "I can help you search for flights! Please provide departure and destination cities. For example: 'I need a flight from Seattle to Vancouver'"
            });
        }

    } catch (error) {
        console.error('ChatGPT endpoint error:', error.message);
        res.status(500).json({ 
            error: 'Failed to process request',
            details: error.message 
        });
    }
});

// Simple intent extraction function
function extractFlightIntent(message) {
    const lowerMessage = message.toLowerCase();
    
    // Extract cities (simple pattern matching)
    const cityPattern = /(?:from|to)\s+([a-zA-Z]+)/gi;
    const cities = [];
    let match;
    
    while ((match = cityPattern.exec(message)) !== null) {
        cities.push(match[1].toUpperCase());
    }
    
    // Extract date
    const datePattern = /(\d{4}-\d{2}-\d{2})|(today|tomorrow|next week)/i;
    const dateMatch = message.match(datePattern);
    let date = null;
    
    if (dateMatch) {
        if (dateMatch[1]) {
            date = dateMatch[1];
        } else if (dateMatch[2]) {
            if (dateMatch[2].toLowerCase() === 'today') {
                date = new Date().toISOString().split('T')[0];
            } else if (dateMatch[2].toLowerCase() === 'tomorrow') {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                date = tomorrow.toISOString().split('T')[0];
            }
        }
    }
    
    // Extract passengers
    const passengerPattern = /(\d+)\s+(?:passenger|person|people)/i;
    const passengerMatch = message.match(passengerPattern);
    const passengers = passengerMatch ? parseInt(passengerMatch[1]) : 1;
    
    // Extract class
    let travelClass = 'ECONOMY';
    if (lowerMessage.includes('business')) travelClass = 'BUSINESS';
    if (lowerMessage.includes('first')) travelClass = 'FIRST';
    
    return {
        from: cities[0] || null,
        to: cities[1] || null,
        date: date,
        passengers: passengers,
        class: travelClass
    };
}

// Format flight response for ChatGPT
function formatFlightResponse(flights, intent) {
    if (flights.length === 0) {
        return `I couldn't find any flights from ${intent.from} to ${intent.to} on ${intent.date}. Please try different dates or routes.`;
    }
    
    let response = `I found ${flights.length} flights from ${intent.from} to ${intent.to} on ${intent.date}:\n\n`;
    
    flights.slice(0, 5).forEach((flight, index) => {
        const price = flight.price?.total || 'Price not available';
        const currency = flight.price?.currency || 'USD';
        const stops = flight.itineraries[0].segments.length - 1;
        const stopText = stops === 0 ? 'Direct' : `${stops} stop${stops > 1 ? 's' : ''}`;
        
        response += `${index + 1}. ${flight.itineraries[0].segments[0].departure.iataCode} → ${flight.itineraries[0].segments[flight.itineraries[0].segments.length - 1].arrival.iataCode}\n`;
        response += `   Time: ${flight.itineraries[0].segments[0].departure.at.slice(11, 16)} - ${flight.itineraries[0].segments[flight.itineraries[0].segments.length - 1].arrival.at.slice(11, 16)}\n`;
        response += `   ${stopText} | ${price} ${currency} | ${flight.numberOfBookableSeats} seats available\n\n`;
    });
    
    response += `To book a flight, please visit our website or contact our booking service.`;
    
    return response;
}

// ===== STATIC FILES =====

// Serve a simple HTML interface for testing
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Flight Booking Agent API</title>
            <style>
                body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
                .endpoint { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px; }
                .method { background: #007bff; color: white; padding: 2px 8px; border-radius: 3px; font-size: 12px; }
                .url { font-family: monospace; background: #e9ecef; padding: 5px; border-radius: 3px; }
            </style>
        </head>
        <body>
            <h1>✈️ Flight Booking Agent API</h1>
            <p>This API provides endpoints for ChatGPT to interact with your flight booking agent.</p>
            
            <h2>🔍 Available Endpoints</h2>
            
            <div class="endpoint">
                <span class="method">GET</span> <span class="url">/health</span>
                <p>Health check endpoint</p>
            </div>
            
            <div class="endpoint">
                <span class="method">POST</span> <span class="url">/api/search-flights</span>
                <p>Search for flights with parameters: from, to, date, passengers, travelClass, userId</p>
            </div>
            
            <div class="endpoint">
                <span class="method">POST</span> <span class="url">/api/chatgpt</span>
                <p>Main ChatGPT interaction endpoint with message and userId</p>
            </div>
            
            <div class="endpoint">
                <span class="method">GET</span> <span class="url">/api/profile/:userId</span>
                <p>Get user profile</p>
            </div>
            
            <div class="endpoint">
                <span class="method">GET</span> <span class="url">/api/suggestions/:userId</span>
                <p>Get smart suggestions for user</p>
            </div>
            
            <h2>🚀 ChatGPT Integration</h2>
            <p>To use this with ChatGPT:</p>
            <ol>
                <li>Deploy this API to a hosting service (Heroku, Vercel, etc.)</li>
                <li>Create a Custom GPT in ChatGPT</li>
                <li>Add this API URL to your GPT's configuration</li>
                <li>Users can now interact with your flight booking agent through ChatGPT!</li>
            </ol>
            
            <h2>📝 Example Usage</h2>
            <p>Send a POST request to <code>/api/chatgpt</code> with:</p>
            <pre>{
  "message": "I need a flight from Seattle to Vancouver tomorrow",
  "userId": "user_123"
}</pre>
        </body>
        </html>
    `);
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Flight Booking Agent API running on port ${PORT}`);
    console.log(`📱 Health check: http://localhost:${PORT}/health`);
    console.log(`🌐 Main interface: http://localhost:${PORT}/`);
    console.log(`🔗 API base URL: http://localhost:${PORT}/api/`);
});

module.exports = app;
