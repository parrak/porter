// Demo showing how the Amadeus API integration works
// This uses mock data to demonstrate the structure before getting real API credentials

console.log('🚀 Amadeus Flight Search Demo (Mock Data)');
console.log('==========================================\n');

// Mock flight data to demonstrate the structure
const mockFlights = [
    {
        id: "1",
        from: "JFK",
        to: "LHR",
        departureDate: "2024-07-01T10:00:00",
        returnDate: "2024-07-15T18:00:00",
        price: 850.50,
        currency: "USD",
        airline: "BA",
        flightNumber: "BA001",
        duration: "PT7H30M",
        stops: 0,
        cabinClass: "ECONOMY"
    },
    {
        id: "2", 
        from: "JFK",
        to: "LHR",
        departureDate: "2024-07-01T14:30:00",
        returnDate: "2024-07-15T22:00:00",
        price: 720.25,
        currency: "USD",
        airline: "AA",
        flightNumber: "AA100",
        duration: "PT8H15M",
        stops: 1,
        cabinClass: "ECONOMY"
    },
    {
        id: "3",
        from: "JFK", 
        to: "LHR",
        departureDate: "2024-07-01T18:45:00",
        returnDate: "2024-07-15T06:30:00",
        price: 650.00,
        currency: "USD",
        airline: "DL",
        flightNumber: "DL200",
        duration: "PT7H45M",
        stops: 0,
        cabinClass: "ECONOMY"
    }
];

// Mock airport suggestions
const mockAirports = [
    { code: "JFK", name: "John F. Kennedy International Airport", city: "New York", country: "United States" },
    { code: "LGA", name: "LaGuardia Airport", city: "New York", country: "United States" },
    { code: "EWR", name: "Newark Liberty International Airport", city: "Newark", country: "United States" },
    { code: "LHR", name: "London Heathrow Airport", city: "London", country: "United Kingdom" },
    { code: "LGW", name: "London Gatwick Airport", city: "London", country: "United Kingdom" }
];

// Mock flight inspiration
const mockInspiration = [
    { destination: "LHR", departureDate: "2024-07-01", returnDate: "2024-07-15", price: 750.00, currency: "USD" },
    { destination: "CDG", departureDate: "2024-07-01", returnDate: "2024-07-15", price: 680.00, currency: "USD" },
    { destination: "FRA", departureDate: "2024-07-01", returnDate: "2024-07-15", price: 720.00, currency: "USD" }
];

// Demo functions that mimic the real Amadeus API
function searchFlights(origin, destination, departureDate, returnDate = null) {
    console.log(`🔍 Searching flights: ${origin} → ${destination} on ${departureDate}${returnDate ? ` (return: ${returnDate})` : ''}`);
    
    // Filter mock data based on search criteria
    const results = mockFlights.filter(flight => 
        flight.from === origin && 
        flight.to === destination &&
        flight.departureDate.startsWith(departureDate)
    );
    
    return results;
}

function getAirportSuggestions(keyword) {
    console.log(`🏢 Getting airport suggestions for: "${keyword}"`);
    
    // Filter airports based on keyword
    const results = mockAirports.filter(airport => 
        airport.name.toLowerCase().includes(keyword.toLowerCase()) ||
        airport.city.toLowerCase().includes(keyword.toLowerCase()) ||
        airport.code.toLowerCase().includes(keyword.toLowerCase())
    );
    
    return results;
}

function getFlightInspiration(origin) {
    console.log(`💡 Getting flight inspiration from: ${origin}`);
    return mockInspiration;
}

// Run the demo
console.log('1. Flight Search Demo');
console.log('----------------------');
const flights = searchFlights('JFK', 'LHR', '2024-07-01', '2024-07-15');
console.log(`Found ${flights.length} flights:`);
flights.forEach(flight => {
    console.log(`  ${flight.airline} ${flight.flightNumber}: $${flight.price} (${flight.duration})`);
});

console.log('\n2. Airport Suggestions Demo');
console.log('----------------------------');
const airports = getAirportSuggestions('New York');
console.log(`Found ${airports.length} airports:`);
airports.forEach(airport => {
    console.log(`  ${airport.code}: ${airport.name} (${airport.city}, ${airport.country})`);
});

console.log('\n3. Flight Inspiration Demo');
console.log('--------------------------');
const inspiration = getFlightInspiration('JFK');
console.log(`Found ${inspiration.length} trending destinations:`);
inspiration.forEach(dest => {
    console.log(`  ${dest.destination}: $${dest.price} (${dest.departureDate} - ${dest.returnDate})`);
});

console.log('\n📋 This is how the real Amadeus API will work!');
console.log('To get real data:');
console.log('1. Sign up at https://developers.amadeus.com/');
console.log('2. Create a .env file with your credentials');
console.log('3. Run: node example-usage.js'); 