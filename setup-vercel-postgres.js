#!/usr/bin/env node

/**
 * Vercel Postgres Setup Script
 * This script sets up the database schema on Vercel Postgres
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Database configuration for Vercel Postgres
const dbConfig = {
  connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
};

async function setupVercelPostgres() {
  console.log('🚀 Setting up Vercel Postgres Database...\n');
  
  if (!dbConfig.connectionString) {
    console.error('❌ No database connection string found!');
    console.error('Please set POSTGRES_URL or DATABASE_URL in your environment variables.');
    console.error('\nTo get this:');
    console.error('1. Go to your Vercel dashboard');
    console.error('2. Navigate to your project');
    console.error('3. Go to Storage tab');
    console.error('4. Create a Postgres database');
    console.error('5. Copy the connection string');
    process.exit(1);
  }
  
  try {
    // Test connection
    console.log('📡 Testing database connection...');
    const pool = new Pool(dbConfig);
    const client = await pool.connect();
    console.log('✅ Connected to Vercel Postgres successfully');
    
    // Read and execute schema
    console.log('📋 Creating database tables...');
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await client.query(statement);
          console.log('✅ Table/extension created successfully');
        } catch (error) {
          if (error.code === '42P07') {
            console.log('ℹ️  Table already exists, skipping...');
          } else {
            console.error('❌ Error creating table:', error.message);
            throw error;
          }
        }
      }
    }
    
    // Insert sample data
    console.log('📝 Inserting sample data...');
    await insertSampleData(client);
    
    client.release();
    await pool.end();
    
    console.log('\n🎉 Vercel Postgres setup completed successfully!');
    console.log('\n🔧 Next steps:');
    console.log('   1. Your database is now ready');
    console.log('   2. User profiles will work in production');
    console.log('   3. Test the API endpoints with user_id parameter');
    
  } catch (error) {
    console.error('\n❌ Database setup failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Check your POSTGRES_URL environment variable');
    console.error('   2. Ensure the database is accessible');
    console.error('   3. Check Vercel dashboard for database status');
    process.exit(1);
  }
}

async function insertSampleData(client) {
  // Insert sample user
  const sampleUser = await client.query(`
    INSERT INTO users (email, display_name, first_name, last_name, phone, date_of_birth)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (email) DO NOTHING
    RETURNING id
  `, ['demo@example.com', 'Demo User', 'Demo', 'User', '+1234567890', '1990-01-01']);
  
  if (sampleUser.rows.length > 0) {
    const userId = sampleUser.rows[0].id;
    console.log('✅ Sample user created');
    
    // Insert sample preferences
    await client.query(`
      INSERT INTO user_preferences (user_id, category, preferences)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, category) DO NOTHING
    `, [userId, 'travel_style', {
      preferred_airlines: ['Delta', 'American Airlines'],
      seat_preference: 'window',
      meal_preference: 'vegetarian',
      travel_class: 'economy',
      max_layovers: 1,
      preferred_departure_time: 'morning'
    }]);
    
    // Insert sample travel history
    await client.query(`
      INSERT INTO travel_history (user_id, trip_type, destination_city, destination_airport, departure_date, return_date, duration_days, total_cost, travel_class, companions_count, rating)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [userId, 'leisure', 'New York', 'JFK', '2024-01-15', '2024-01-20', 5, 450.00, 'economy', 1, 5]);
    
    console.log('✅ Sample preferences and travel history created');
  }
}

// Run setup if this script is executed directly
if (require.main === module) {
  setupVercelPostgres();
}

module.exports = { setupVercelPostgres };
