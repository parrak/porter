const { testConnection, executeQuery } = require('./database/connection');

async function testDatabase() {
  console.log('🧪 Testing database connection and functionality...\n');
  
  try {
    // Test database connection
    console.log('1️⃣ Testing database connection...');
    const isConnected = await testConnection();
    
    if (!isConnected) {
      console.log('❌ Database connection failed. Please check your database configuration.');
      console.log('💡 Make sure PostgreSQL is running and environment variables are set:');
      console.log('   - DB_USER (default: postgres)');
      console.log('   - DB_HOST (default: localhost)');
      console.log('   - DB_NAME (default: porter_travel)');
      console.log('   - DB_PASSWORD (default: password)');
      console.log('   - DB_PORT (default: 5432)');
      return;
    }
    
    console.log('✅ Database connection successful!\n');
    
    // Test basic query
    console.log('2️⃣ Testing basic query execution...');
    const result = await executeQuery('SELECT version()');
    console.log('✅ Query executed successfully:', result.rows[0].version);
    
    // Test if tables exist
    console.log('\n3️⃣ Checking if user profile tables exist...');
    const tablesResult = await executeQuery(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'user_preferences', 'travel_history', 'user_interactions')
      ORDER BY table_name
    `);
    
    if (tablesResult.rows.length === 0) {
      console.log('⚠️  User profile tables not found. You need to run the database schema first:');
      console.log('   psql -U postgres -d porter_travel -f database/schema.sql');
    } else {
      console.log('✅ Found user profile tables:');
      tablesResult.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
    }
    
    // Test user creation (if tables exist)
    if (tablesResult.rows.length > 0) {
      console.log('\n4️⃣ Testing user profile creation...');
      
      const testUserId = `test_user_${Date.now()}`;
      const testUserData = {
        email: `test${Date.now()}@example.com`,
        display_name: 'Test User',
        first_name: 'Test',
        last_name: 'User',
        phone: '+1234567890',
        timezone: 'UTC',
        language: 'en'
      };
      
      try {
        // Create test user (don't specify ID - let SERIAL handle it)
        const createResult = await executeQuery(`
          INSERT INTO users (email, display_name, first_name, last_name, phone, timezone, language)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id, email, display_name
        `, [
          testUserData.email,
          testUserData.display_name,
          testUserData.first_name,
          testUserData.last_name,
          testUserData.phone,
          testUserData.timezone,
          testUserData.language
        ]);
        
        const createdUserId = createResult.rows[0].id;
        console.log('✅ Test user created successfully:', createResult.rows[0]);
        
        // Test preference creation
        const testPreferences = {
          travel_style: {
            preferred_seasons: ['spring', 'fall'],
            travel_pace: 'relaxed',
            adventure_level: 'moderate'
          }
        };
        
        const prefResult = await executeQuery(`
          INSERT INTO user_preferences (user_id, category, preferences)
          VALUES ($1, $2, $3)
          RETURNING id, category
        `, [createdUserId, 'travel_style', JSON.stringify(testPreferences.travel_style)]);
        
        console.log('✅ Test preferences created successfully:', prefResult.rows[0]);
        
        // Clean up test data
        await executeQuery('DELETE FROM user_preferences WHERE user_id = $1', [createdUserId]);
        await executeQuery('DELETE FROM users WHERE id = $1', [createdUserId]);
        console.log('🧹 Test data cleaned up');
        
      } catch (error) {
        console.log('❌ Error testing user profile functionality:', error.message);
      }
    }
    
    console.log('\n🎉 Database test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testDatabase().then(() => {
    console.log('\n🏁 Test script finished');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Test script crashed:', error);
    process.exit(1);
  });
}

module.exports = { testDatabase };
