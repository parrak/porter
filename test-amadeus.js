// Test script for Amadeus API flight search
require('dotenv').config();
const axios = require('axios');

const AMADEUS_CLIENT_ID = process.env.AMADEUS_CLIENT_ID;
const AMADEUS_CLIENT_SECRET = process.env.AMADEUS_CLIENT_SECRET;
const AMADEUS_TOKEN_URL = 'https://test.api.amadeus.com/v1/security/oauth2/token';
const AMADEUS_FLIGHT_SEARCH_URL = 'https://test.api.amadeus.com/v2/shopping/flight-offers';

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

async function testFlightSearch() {
    try {
        console.log('Testing Amadeus Flight Search API...');
        console.log('Client ID:', AMADEUS_CLIENT_ID ? 'Found' : 'Not found');
        console.log('Client Secret:', AMADEUS_CLIENT_SECRET ? 'Found' : 'Not found');
        
        const token = await getAmadeusToken();
        
        // Test parameters
        const params = {
            originLocationCode: 'SEA',
            destinationLocationCode: 'YVR',
            departureDate: '2025-08-12',
            adults: 1,
            travelClass: 'ECONOMY',
            max: 5,
            currencyCode: 'USD'
        };

        console.log('Search parameters:', JSON.stringify(params, null, 2));

        const response = await axios.get(AMADEUS_FLIGHT_SEARCH_URL, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            params: params
        });

        console.log('✅ Flight search successful!');
        console.log('Found flights:', response.data.data ? response.data.data.length : 0);
        
        if (response.data.data && response.data.data.length > 0) {
            console.log('First flight:', JSON.stringify(response.data.data[0], null, 2));
        }

    } catch (error) {
        console.log('❌ Flight search failed:');
        console.log('Status:', error.response?.status);
        console.log('Message:', error.response?.data?.errors?.[0]?.detail || error.message);
        console.log('Full error:', JSON.stringify(error.response?.data, null, 2));
    }
}

testFlightSearch();

