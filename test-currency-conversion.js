// Test script for currency conversion utility
const { convertCurrency, getEURtoUSDRate } = require('./utils/currency-converter');

async function testCurrencyConversion() {
  console.log('🧪 Testing Currency Conversion Utility\n');
  
  try {
    // Test 1: Get current exchange rate
    console.log('1️⃣ Testing EUR to USD exchange rate...');
    const rate = await getEURtoUSDRate();
    console.log(`   ✅ Exchange rate: 1 EUR = ${rate} USD\n`);
    
    // Test 2: Convert EUR to USD
    console.log('2️⃣ Testing EUR to USD conversion...');
    const testPrice = 150.50; // 150.50 EUR
    const converted = await convertCurrency(testPrice, 'EUR', 'USD');
    console.log(`   ✅ ${testPrice} EUR = ${converted.price} USD`);
    console.log(`   📊 Exchange rate used: ${converted.exchangeRate}`);
    console.log(`   🔄 Original: ${converted.originalPrice} ${converted.originalCurrency}\n`);
    
    // Test 3: Convert USD to USD (should return same)
    console.log('3️⃣ Testing USD to USD conversion (no change)...');
    const usdPrice = 200.00;
    const usdConverted = await convertCurrency(usdPrice, 'USD', 'USD');
    console.log(`   ✅ ${usdPrice} USD = ${usdConverted.price} USD`);
    console.log(`   📊 Exchange rate: ${usdConverted.exchangeRate}\n`);
    
    // Test 4: Test with string price
    console.log('4️⃣ Testing string price conversion...');
    const stringPrice = "299.99";
    const stringConverted = await convertCurrency(stringPrice, 'EUR', 'USD');
    console.log(`   ✅ "${stringPrice}" EUR = ${stringConverted.price} USD`);
    console.log(`   📊 Exchange rate: ${stringConverted.exchangeRate}\n`);
    
    // Test 5: Test error handling with invalid price
    console.log('5️⃣ Testing error handling...');
    try {
      const invalidConverted = await convertCurrency('invalid', 'EUR', 'USD');
      console.log(`   ⚠️ Invalid price handled gracefully: ${invalidConverted.price}`);
    } catch (error) {
      console.log(`   ❌ Error caught: ${error.message}`);
    }
    
    console.log('\n🎉 All currency conversion tests completed!');
    
  } catch (error) {
    console.error('❌ Currency conversion test failed:', error);
  }
}

// Run the test
testCurrencyConversion();
