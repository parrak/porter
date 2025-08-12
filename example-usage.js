// Example usage of the Amadeus flight search integration
require('dotenv').config();
const { 
    searchFlights, 
    getAirportSuggestions, 
    getFlightInspiration,
    getFlightPricePrediction 
} = require('./flight-search');

async function demonstrateFlightSearch() {
    try {
        console.log('🔍 Searching for flights from New York to London...');
        
        // Search for one-way flights
        const oneWayFlights = await searchFlights('JFK', 'LHR', '2024-07-01');
        console.log(`Found ${oneWayFlights.length} one-way flights:`);
        oneWayFlights.slice(0, 3).forEach(flight => {
            console.log(`  ${flight.airline} ${flight.flightNumber}: $${flight.price} (${flight.duration})`);
        });

        console.log('\n🔍 Searching for round-trip flights...');
        
        // Search for round-trip flights
        const roundTripFlights = await searchFlights('JFK', 'LHR', '2024-07-01', '2024-07-15');
        console.log(`Found ${roundTripFlights.length} round-trip flights:`);
        roundTripFlights.slice(0, 3).forEach(flight => {
            console.log(`  ${flight.airline} ${flight.flightNumber}: $${flight.price} (${flight.duration})`);
        });

        console.log('\n🏢 Getting airport suggestions for "New York"...');
        
        // Get airport suggestions
        const airports = await getAirportSuggestions('New York');
        console.log(`Found ${airports.length} airports:`);
        airports.slice(0, 5).forEach(airport => {
            console.log(`  ${airport.code}: ${airport.name} (${airport.city}, ${airport.country})`);
        });

        console.log('\n💡 Getting flight inspiration from JFK...');
        
        // Get flight inspiration
        const inspiration = await getFlightInspiration('JFK');
        console.log(`Found ${inspiration.length} trending destinations:`);
        inspiration.slice(0, 5).forEach(dest => {
            console.log(`  ${dest.destination}: $${dest.price} (${dest.departureDate} - ${dest.returnDate})`);
        });

        console.log('\n📊 Getting price prediction for JFK to LHR...');
        
        // Get price prediction
        const prediction = await getFlightPricePrediction('JFK', 'LHR', '2024-07-01');
        if (prediction) {
            console.log(`Price prediction: $${prediction.prediction.price.total} (confidence: ${prediction.confidence})`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Run the demonstration
if (require.main === module) {
    demonstrateFlightSearch();
}

module.exports = { demonstrateFlightSearch }; 