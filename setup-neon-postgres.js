#!/usr/bin/env node

/**
 * Neon Postgres Setup Script
 * This script sets up the database schema on Neon Postgres
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Database configuration for Neon Postgres
const dbConfig = {
  connectionString: process.env.NEON_DATABASE_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Neon requires SSL
};

async function setupNeonPostgres() {
  console.log('🚀 Setting up Neon Postgres Database...\n');
  
  if (!dbConfig.connectionString) {
    console.error('❌ No database connection string found!');
    console.error('Please set NEON_DATABASE_URL in your environment variables.');
    console.error('\nTo get this:');
    console.error('1. Go to https://neon.tech');
    console.error('2. Sign up with GitHub (free)');
    console.error('3. Create a new project');
    console.error('4. Copy the connection string from your dashboard');
    console.error('5. Set it as NEON_DATABASE_URL in your .env file');
    process.exit(1);
  }
  
  try {
    // Test connection
    console.log('📡 Testing database connection...');
    const pool = new Pool(dbConfig);
    const client = await pool.connect();
    console.log('✅ Connected to Neon Postgres successfully');
    
    // Create simplified schema for Neon
    console.log('📋 Creating database tables...');
    await createSimplifiedSchema(client);
    
    // Insert sample data
    console.log('📝 Inserting sample data...');
    await insertSampleData(client);
    
    client.release();
    await pool.end();
    
    console.log('\n🎉 Neon Postgres setup completed successfully!');
    console.log('\n🔧 Next steps:');
    console.log('   1. Your database is now ready');
    console.log('   2. User profiles will work in production');
    console.log('   3. Test the API endpoints with user_id parameter');
    console.log('\n💡 Neon Features:');
    console.log('   - Auto-scaling serverless Postgres');
    console.log('   - Branching for development/testing');
    console.log('   - Built-in connection pooling');
    
  } catch (error) {
    console.error('\n❌ Database setup failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Check your NEON_DATABASE_URL environment variable');
    console.error('   2. Ensure the database is accessible');
    console.error('   3. Check Neon dashboard for database status');
    console.error('   4. Verify SSL is enabled (sslmode=require)');
    process.exit(1);
  }
}

async function createSimplifiedSchema(client) {
  // Create tables with Neon-compatible syntax
  
  // Users table
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      display_name VARCHAR(255),
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      phone VARCHAR(20),
      date_of_birth DATE,
      profile_picture_url TEXT,
      timezone VARCHAR(50) DEFAULT 'UTC',
      language VARCHAR(10) DEFAULT 'en',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      last_login_at TIMESTAMP WITH TIME ZONE,
      is_active BOOLEAN DEFAULT true,
      email_verified BOOLEAN DEFAULT false,
      phone_verified BOOLEAN DEFAULT false
    )
  `);
  console.log('✅ Users table created');
  
  // User preferences table
  await client.query(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      category VARCHAR(100) NOT NULL,
      preferences JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(user_id, category)
    )
  `);
  console.log('✅ User preferences table created');
  
  // Travel history table
  await client.query(`
    CREATE TABLE IF NOT EXISTS travel_history (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      trip_type VARCHAR(50),
      destination_country VARCHAR(100),
      destination_city VARCHAR(100),
      destination_airport VARCHAR(10),
      departure_date DATE,
      return_date DATE,
      duration_days INTEGER,
      total_cost DECIMAL(10,2),
      currency VARCHAR(3) DEFAULT 'USD',
      accommodation_type VARCHAR(50),
      transportation_type VARCHAR(50),
      travel_class VARCHAR(20),
      companions_count INTEGER DEFAULT 1,
      companions_type VARCHAR(50),
      rating INTEGER CHECK (rating >= 1 AND rating <= 5),
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
  console.log('✅ Travel history table created');
  
  // User interactions table
  await client.query(`
    CREATE TABLE IF NOT EXISTS user_interactions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      interaction_type VARCHAR(100) NOT NULL,
      interaction_data JSONB NOT NULL DEFAULT '{}',
      search_query TEXT,
      search_results_count INTEGER,
      selected_option JSONB,
      time_spent_seconds INTEGER,
      interaction_path TEXT[],
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
  console.log('✅ User interactions table created');
  
  // Create indexes for better performance
  await client.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_travel_history_user_id ON travel_history(user_id)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id ON user_interactions(user_id)');
  console.log('✅ Database indexes created');
  
  // Create user profile summary view
  await client.query(`
    CREATE OR REPLACE VIEW user_profile_summary AS
    SELECT 
      u.id,
      u.email,
      u.display_name,
      u.first_name,
      u.last_name,
      u.created_at,
      u.last_login_at,
      COUNT(DISTINCT th.id) as total_trips,
      AVG(th.rating) as average_trip_rating,
      COUNT(DISTINCT up.id) as preference_categories,
      MAX(th.created_at) as last_trip_date,
      SUM(th.total_cost) as total_spent,
      u.timezone,
      u.language
    FROM users u
    LEFT JOIN travel_history th ON u.id = th.user_id
    LEFT JOIN user_preferences up ON u.id = up.user_id
    GROUP BY u.id, u.email, u.display_name, u.first_name, u.last_name, u.created_at, u.last_login_at, u.timezone, u.language
  `);
  console.log('✅ User profile summary view created');
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
    console.log('✅ Sample user created with ID:', userId);
    
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
  } else {
    console.log('ℹ️  Sample user already exists, skipping...');
  }
}

// Run setup if this script is executed directly
if (require.main === module) {
  setupNeonPostgres();
}

module.exports = { setupNeonPostgres };
