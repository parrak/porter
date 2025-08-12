// Simple test script for OpenAI API
require('dotenv').config();
const axios = require('axios');

async function testOpenAI() {
    const apiKey = process.env.OPENAI_API_KEY;
    
    console.log('Testing OpenAI API...');
    console.log('API Key starts with:', apiKey ? apiKey.substring(0, 20) + '...' : 'Not found');
    console.log('API Key length:', apiKey ? apiKey.length : 'Not found');
    
    if (!apiKey) {
        console.log('❌ No API key found');
        return;
    }
    
    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'user',
                        content: 'Hello, this is a test message.'
                    }
                ],
                max_tokens: 50,
                temperature: 0.1
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
            }
        );
        
        console.log('✅ OpenAI API test successful!');
        console.log('Response:', response.data.choices[0].message.content);
        
    } catch (error) {
        console.log('❌ OpenAI API test failed:');
        console.log('Status:', error.response?.status);
        console.log('Message:', error.response?.data?.error?.message || error.message);
        console.log('Full error:', error.response?.data);
    }
}

testOpenAI();
