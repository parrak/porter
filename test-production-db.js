#!/usr/bin/env node

/**
 * Test Production Database Connection
 * This script tests if the Neon database is accessible from production
 */

const { Pool } = require('pg');

async function testProductionDB() {
  console.log('🧪 Testing Production Database Connection...\n');
  
  // Test with the same connection string you're using in production
  const connectionString = 'postgresql://neondb_owner:npg_KAoyx1BM4rwF@ep-square-salad-aepilb5f-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
  
  const dbConfig = {
    connectionString,
    ssl: { rejectUnauthorized: false }
  };
  
  try {
    console.log('📡 Connecting to Neon database...');
    const pool = new Pool(dbConfig);
    
    // Test connection
    const client = await pool.connect();
    console.log('✅ Connected to Neon database successfully!');
    
    // Test basic query
    const result = await client.query('SELECT NOW() as current_time, version() as db_version');
    console.log('✅ Database query successful:');
    console.log(`   Current time: ${result.rows[0].current_time}`);
    console.log(`   Database: ${result.rows[0].db_version.split(' ')[0]} ${result.rows[0].db_version.split(' ')[1]}`);
    
    // Test if our tables exist
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'user_preferences', 'travel_history', 'user_interactions')
      ORDER BY table_name
    `);
    
    console.log('\n📋 Database tables:');
    if (tablesResult.rows.length > 0) {
      tablesResult.rows.forEach(row => {
        console.log(`   ✅ ${row.table_name}`);
      });
    } else {
      console.log('   ⚠️  No user profile tables found');
    }
    
    // Test sample data
    const userCount = await client.query('SELECT COUNT(*) as count FROM users');
    console.log(`\n👥 Users in database: ${userCount.rows[0].count}`);
    
    const prefCount = await client.query('SELECT COUNT(*) as count FROM user_preferences');
    console.log(`⚙️  User preferences: ${prefCount.rows[0].count}`);
    
    client.release();
    await pool.end();
    
    console.log('\n🎉 Production database test completed successfully!');
    console.log('\n🔧 Your app should now be able to:');
    console.log('   - Connect to the database in production');
    console.log('   - Store and retrieve user profiles');
    console.log('   - Personalize flight searches');
    console.log('   - Track user preferences and history');
    
  } catch (error) {
    console.error('\n❌ Production database test failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Check if the environment variable is set in Vercel');
    console.error('   2. Verify the connection string is correct');
    console.error('   3. Ensure the database is accessible from Vercel servers');
    console.error('   4. Check Neon dashboard for any connection issues');
  }
}

// Run the test
if (require.main === module) {
  testProductionDB();
}

module.exports = { testProductionDB };
