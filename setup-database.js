#!/usr/bin/env node

/**
 * Database Setup Script for Porter Travel
 * This script sets up the PostgreSQL database with all required tables and sample data
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Database configuration
const dbConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'postgres', // Connect to default postgres database first
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};

// Create initial connection pool (to default postgres database)
let pool = new Pool(dbConfig);

async function setupDatabase() {
  console.log('🚀 Setting up Porter Travel Database...\n');
  
  try {
    // Step 1: Test connection to default database
    console.log('📡 Testing database connection...');
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL successfully');
    
    // Step 2: Create the travel database if it doesn't exist
    const dbName = process.env.DB_NAME || 'porter_travel';
    console.log(`🗄️  Creating database: ${dbName}`);
    
    try {
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log(`✅ Database '${dbName}' created successfully`);
    } catch (error) {
      if (error.code === '42P04') {
        console.log(`ℹ️  Database '${dbName}' already exists`);
      } else {
        throw error;
      }
    }
    
    client.release();
    await pool.end();
    
    // Step 3: Connect to the new database
    console.log(`🔗 Connecting to ${dbName}...`);
    const newDbConfig = { ...dbConfig, database: dbName };
    pool = new Pool(newDbConfig);
    
    const newClient = await pool.connect();
    console.log(`✅ Connected to ${dbName} successfully`);
    
    // Step 4: Read and execute schema
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
          await newClient.query(statement);
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
    
    // Step 5: Insert sample data
    console.log('📝 Inserting sample data...');
    await insertSampleData(newClient);
    
    newClient.release();
    await pool.end();
    
    console.log('\n🎉 Database setup completed successfully!');
    console.log('\n📊 Database Summary:');
    console.log(`   • Database: ${dbName}`);
    console.log(`   • Host: ${dbConfig.host}:${dbConfig.port}`);
    console.log(`   • User: ${dbConfig.user}`);
    console.log('\n🔧 Next steps:');
    console.log('   1. Update your .env file with database credentials');
    console.log('   2. Run: npm run test-database');
    console.log('   3. Test the user profile API endpoints');
    
  } catch (error) {
    console.error('\n❌ Database setup failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Ensure PostgreSQL is running');
    console.error('   2. Check your database credentials');
    console.error('   3. Verify PostgreSQL is accessible on port 5432');
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
  setupDatabase();
}

module.exports = { setupDatabase };
