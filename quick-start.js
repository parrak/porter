// Quick Start Script for Flight Booking Agent API
// This script helps you test the API locally before deploying to ChatGPT

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000';

async function testAPI() {
    console.log('🧪 Testing Flight Booking Agent API...\n');
    
    try {
        // Test 1: Health Check
        console.log('1️⃣ Testing Health Check...');
        const healthResponse = await axios.get(`${API_BASE_URL}/health`);
        console.log('✅ Health Check:', healthResponse.data);
        
        // Test 2: ChatGPT Endpoint
        console.log('\n2️⃣ Testing ChatGPT Endpoint...');
        const chatgptResponse = await axios.post(`${API_BASE_URL}/api/chatgpt`, {
            message: 'I need a flight from Seattle to Vancouver tomorrow',
            userId: 'test_user_123'
        });
        console.log('✅ ChatGPT Response:', JSON.stringify(chatgptResponse.data, null, 2));
        
        // Test 3: Direct Flight Search
        console.log('\n3️⃣ Testing Direct Flight Search...');
        const searchResponse = await axios.post(`${API_BASE_URL}/api/search-flights`, {
            from: 'SEA',
            to: 'YVR',
            date: '2025-01-15',
            passengers: 1,
            travelClass: 'ECONOMY',
            userId: 'test_user_123'
        });
        console.log('✅ Flight Search Results:', JSON.stringify(searchResponse.data, null, 2));
        
        // Test 4: User Profile
        console.log('\n4️⃣ Testing User Profile...');
        const profileResponse = await axios.get(`${API_BASE_URL}/api/profile/test_user_123`);
        console.log('✅ User Profile:', JSON.stringify(profileResponse.data, null, 2));
        
        console.log('\n🎉 All API tests passed! Your API is ready for ChatGPT integration.');
        console.log('\n📋 Next Steps:');
        console.log('1. Deploy to a hosting service (Render, Heroku, Vercel)');
        console.log('2. Create a Custom GPT in ChatGPT');
        console.log('3. Add your deployed API URL to the GPT configuration');
        console.log('4. Test the integration!');
        
    } catch (error) {
        console.error('❌ API test failed:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Make sure your API server is running:');
            console.log('   node web-api.js');
        }
        
        if (error.response) {
            console.log('Response status:', error.response.status);
            console.log('Response data:', error.response.data);
        }
    }
}

// Run the test
testAPI();
