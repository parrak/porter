// 🧪 API Test Script for Flight Booking Agent
// Run this to test your API endpoints before deploying

const axios = require('axios');

const BASE_URL = 'http://localhost:3000'; // Change this to your deployed URL

async function testAPI() {
    console.log('🧪 Testing Flight Booking Agent API...\n');

    try {
        // Test 1: Health Check
        console.log('1️⃣ Testing Health Check...');
        const healthResponse = await axios.get(`${BASE_URL}/health`);
        console.log('✅ Health Check:', healthResponse.data);
        console.log('');

        // Test 2: Flight Search
        console.log('2️⃣ Testing Flight Search...');
        const searchResponse = await axios.post(`${BASE_URL}/api/search-flights`, {
            from: 'SEA',
            to: 'YVR',
            date: '2025-01-15',
            passengers: 1,
            travelClass: 'ECONOMY'
        });
        console.log('✅ Flight Search:', {
            success: searchResponse.data.success,
            flightsFound: searchResponse.data.flightsFound,
            message: searchResponse.data.message
        });
        console.log('');

        // Test 3: ChatGPT Integration
        console.log('3️⃣ Testing ChatGPT Integration...');
        const chatResponse = await axios.post(`${BASE_URL}/api/chatgpt`, {
            message: 'I need a flight from Seattle to Vancouver tomorrow',
            userId: 'test_user_123'
        });
        console.log('✅ ChatGPT Integration:', {
            success: chatResponse.data.success,
            intent: chatResponse.data.intent,
            flights: chatResponse.data.flights
        });
        console.log('');

        // Test 4: User Profile
        console.log('4️⃣ Testing User Profile...');
        const profileResponse = await axios.get(`${BASE_URL}/api/profile/test_user_123`);
        console.log('✅ User Profile:', profileResponse.data);
        console.log('');

        console.log('🎉 All API tests passed! Your API is ready for deployment.');
        console.log('');
        console.log('📋 Next steps:');
        console.log('1. Deploy to Render/Railway/Vercel');
        console.log('2. Update openapi.json with your new URL');
        console.log('3. Create your Custom GPT in ChatGPT');
        console.log('4. Test the integration!');

    } catch (error) {
        console.error('❌ API Test Failed:', error.message);
        
        if (error.response) {
            console.error('Response Status:', error.response.status);
            console.error('Response Data:', error.response.data);
        }
        
        console.log('');
        console.log('🔍 Troubleshooting:');
        console.log('1. Make sure your server is running (node web-api.js)');
        console.log('2. Check your .env file has the correct API keys');
        console.log('3. Verify your Amadeus API credentials are valid');
        console.log('4. Check server logs for detailed error messages');
    }
}

// Run the test
testAPI();
