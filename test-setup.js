// Test file to verify Node.js setup and dependencies
console.log('🔧 Testing Node.js setup...');

try {
    // Test dotenv
    require('dotenv').config();
    console.log('✅ dotenv loaded successfully');
    
    // Test Amadeus package
    const Amadeus = require('amadeus');
    console.log('✅ Amadeus package loaded successfully');
    
    // Test basic Amadeus initialization (without credentials)
    const amadeus = new Amadeus({
        clientId: 'test',
        clientSecret: 'test'
    });
    console.log('✅ Amadeus client initialized successfully');
    
    console.log('\n🎉 All tests passed! Your setup is ready.');
    console.log('\nNext steps:');
    console.log('1. Get your Amadeus API credentials from https://developers.amadeus.com/');
    console.log('2. Create a .env file with your credentials (copy from env-template.txt)');
    console.log('3. Run: node example-usage.js');
    
} catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\nTroubleshooting:');
    console.log('- Make sure all dependencies are installed: npm install');
    console.log('- Check that Node.js is properly installed');
} 