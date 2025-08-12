// Simple test runner for main.js functionality
// This can be run without Jest if needed

console.log('🧪 Running Simple Tests for Airline Booking Agent...\n');

// Import the functions to test
const { searchFlights, askLLM } = require('./main');

// Test results tracking
let passedTests = 0;
let totalTests = 0;

function runTest(testName, testFunction) {
    totalTests++;
    try {
        testFunction();
        console.log(`✅ ${testName} - PASSED`);
        passedTests++;
    } catch (error) {
        console.log(`❌ ${testName} - FAILED: ${error.message}`);
    }
}

// Test 1: searchFlights function - exact match
runTest('searchFlights exact match', () => {
    const result = searchFlights('New York', 'London', '2024-07-01');
    if (result.length !== 1) throw new Error(`Expected 1 result, got ${result.length}`);
    if (result[0].id !== 1) throw new Error(`Expected flight ID 1, got ${result[0].id}`);
    if (result[0].price !== 500) throw new Error(`Expected price 500, got ${result[0].price}`);
});

// Test 2: searchFlights function - case insensitive
runTest('searchFlights case insensitive', () => {
    const result = searchFlights('new york', 'london', '2024-07-01');
    if (result.length !== 1) throw new Error(`Expected 1 result, got ${result.length}`);
    if (result[0].id !== 1) throw new Error(`Expected flight ID 1, got ${result[0].id}`);
});

// Test 3: searchFlights function - no matches
runTest('searchFlights no matches', () => {
    const result = searchFlights('Mumbai', 'Delhi', '2024-07-01');
    if (result.length !== 0) throw new Error(`Expected 0 results, got ${result.length}`);
});

// Test 4: searchFlights function - wrong date
runTest('searchFlights wrong date', () => {
    const result = searchFlights('New York', 'London', '2024-08-01');
    if (result.length !== 0) throw new Error(`Expected 0 results, got ${result.length}`);
});

// Test 5: searchFlights function - edge cases
runTest('searchFlights edge cases', () => {
    const emptyResult = searchFlights('', '', '');
    if (emptyResult.length !== 0) throw new Error(`Expected 0 results for empty params, got ${emptyResult.length}`);
    
    const nullResult = searchFlights(null, null, null);
    if (nullResult.length !== 0) throw new Error(`Expected 0 results for null params, got ${nullResult.length}`);
});

// Test 6: Flight database structure
runTest('Flight database structure', () => {
    const flights = [
        { id: 1, from: 'New York', to: 'London', date: '2024-07-01', price: 500 },
        { id: 2, from: 'San Francisco', to: 'Tokyo', date: '2024-07-02', price: 700 },
        { id: 3, from: 'Paris', to: 'Rome', date: '2024-07-03', price: 200 },
    ];
    
    if (flights.length !== 3) throw new Error(`Expected 3 flights, got ${flights.length}`);
    
    flights.forEach(flight => {
        if (!flight.id || !flight.from || !flight.to || !flight.date || !flight.price) {
            throw new Error(`Flight missing required properties: ${JSON.stringify(flight)}`);
        }
    });
});

// Test 7: Function exports
runTest('Function exports', () => {
    if (typeof searchFlights !== 'function') throw new Error('searchFlights is not a function');
    if (typeof askLLM !== 'function') throw new Error('askLLM is not a function');
});

console.log('\n📊 Test Results:');
console.log(`Total Tests: ${totalTests}`);
console.log(`Passed: ${passedTests}`);
console.log(`Failed: ${totalTests - passedTests}`);
console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed!');
} else {
    console.log('\n⚠️  Some tests failed. Please check the errors above.');
}
