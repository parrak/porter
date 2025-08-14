#!/usr/bin/env node

/**
 * Quick Database Test Script
 * Tests basic database connectivity and table access
 */

const { testConnection, executeQuery } = require('./database/connection');
require('dotenv').config();

async function quickTest() {
  console.log('🧪 Quick Database Test\n');
  
  try {
    // Test 1: Connection
    console.log('1️⃣ Testing database connection...');
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection failed');
    }
    console.log('✅ Connection successful\n');
    
    // Test 2: Check tables exist
    console.log('2️⃣ Checking database tables...');
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    const tables = await executeQuery(tablesQuery);
    console.log('📋 Found tables:');
    tables.rows.forEach(row => {
      console.log(`   • ${row.table_name}`);
    });
    console.log('');
    
    // Test 3: Check sample data
    console.log('3️⃣ Checking sample data...');
    const userCount = await executeQuery('SELECT COUNT(*) FROM users');
    const prefCount = await executeQuery('SELECT COUNT(*) FROM user_preferences');
    const historyCount = await executeQuery('SELECT COUNT(*) FROM travel_history');
    
    console.log(`👥 Users: ${userCount.rows[0].count}`);
    console.log(`⚙️  Preferences: ${prefCount.rows[0].count}`);
    console.log(`✈️  Travel History: ${historyCount.rows[0].count}\n`);
    
    // Test 4: Sample query
    console.log('4️⃣ Testing sample query...');
    const sampleUser = await executeQuery(`
      SELECT u.email, u.display_name, 
             p.preferences->>'seat_preference' as seat_pref,
             p.preferences->>'meal_preference' as meal_pref
      FROM users u
      LEFT JOIN user_preferences p ON u.id = p.user_id AND p.category = 'travel_style'
      LIMIT 1
    `);
    
    if (sampleUser.rows.length > 0) {
      const user = sampleUser.rows[0];
      console.log('👤 Sample user data:');
      console.log(`   • Email: ${user.email}`);
      console.log(`   • Name: ${user.display_name}`);
      console.log(`   • Seat Preference: ${user.seat_pref || 'Not set'}`);
      console.log(`   • Meal Preference: ${user.meal_pref || 'Not set'}`);
    }
    
    console.log('\n🎉 All tests passed! Database is working correctly.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Ensure PostgreSQL is running');
    console.error('   2. Check your .env file has correct DB credentials');
    console.error('   3. Run: npm run setup-db');
    process.exit(1);
  }
}

// Run test if this script is executed directly
if (require.main === module) {
  quickTest();
}

module.exports = { quickTest };
