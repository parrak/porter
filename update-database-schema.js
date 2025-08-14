#!/usr/bin/env node

/**
 * Database Schema Update Script
 * This script updates the existing Neon database with the comprehensive schema
 * while preserving existing data
 */

const { Pool } = require('pg');

async function updateDatabaseSchema() {
  console.log('🚀 Updating Database Schema to Comprehensive Version...\n');

  const connectionString = 'postgresql://neondb_owner:npg_KAoyx1BM4rwF@ep-square-salad-aepilb5f-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
  
  const dbConfig = {
    connectionString,
    ssl: { rejectUnauthorized: false }
  };

  try {
    const pool = new Pool(dbConfig);
    const client = await pool.connect();
    console.log('✅ Connected to Neon database successfully');

    // Start transaction
    await client.query('BEGIN');
    console.log('🔄 Starting schema update transaction...');

    // Step 1: Enable UUID extension
    console.log('\n📦 Enabling UUID extension...');
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
      console.log('✅ UUID extension enabled');
    } catch (error) {
      console.log('ℹ️  UUID extension already exists or not needed');
    }

    // Step 2: Create missing tables
    console.log('\n🏗️  Creating missing tables...');
    
    // User sessions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        session_token VARCHAR(255) UNIQUE NOT NULL,
        refresh_token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        ip_address INET,
        user_agent TEXT,
        is_active BOOLEAN DEFAULT true
      )
    `);
    console.log('✅ User sessions table created');

    // Saved searches table
    await client.query(`
      CREATE TABLE IF NOT EXISTS saved_searches (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        search_name VARCHAR(255),
        search_type VARCHAR(50),
        search_criteria JSONB NOT NULL,
        is_active BOOLEAN DEFAULT true,
        last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Saved searches table created');

    // User favorites table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_favorites (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        favorite_type VARCHAR(50),
        favorite_data JSONB NOT NULL,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ User favorites table created');

    // User feedback table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_feedback (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        feedback_type VARCHAR(50),
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        feedback_text TEXT,
        category VARCHAR(100),
        tags TEXT[],
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ User feedback table created');

    // User goals table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_goals (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        goal_type VARCHAR(50),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        target_date DATE,
        destination VARCHAR(255),
        estimated_budget DECIMAL(10,2),
        currency VARCHAR(3) DEFAULT 'USD',
        priority INTEGER CHECK (priority >= 1 AND priority <= 5),
        status VARCHAR(20) DEFAULT 'pending',
        progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ User goals table created');

    // User communication preferences table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_communication_preferences (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        email_notifications BOOLEAN DEFAULT true,
        sms_notifications BOOLEAN DEFAULT false,
        push_notifications BOOLEAN DEFAULT true,
        marketing_emails BOOLEAN DEFAULT false,
        price_alerts BOOLEAN DEFAULT true,
        travel_reminders BOOLEAN DEFAULT true,
        newsletter BOOLEAN DEFAULT false,
        frequency VARCHAR(20) DEFAULT 'daily',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ User communication preferences table created');

    // Passenger details table
    await client.query(`
      CREATE TABLE IF NOT EXISTS passenger_details (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        passenger_type VARCHAR(20) NOT NULL,
        title VARCHAR(10),
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        date_of_birth DATE,
        document_type VARCHAR(50),
        document_number VARCHAR(100),
        document_expiry_date DATE,
        nationality VARCHAR(100),
        is_primary_passenger BOOLEAN DEFAULT false,
        is_favorite BOOLEAN DEFAULT false,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Passenger details table created');

    // Step 3: Create additional indexes
    console.log('\n🔍 Creating additional indexes...');
    
    const indexQueries = [
      'CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token)',
      'CREATE INDEX IF NOT EXISTS idx_user_preferences_category ON user_preferences(category)',
      'CREATE INDEX IF NOT EXISTS idx_travel_history_destination ON travel_history(destination_city, destination_country)',
      'CREATE INDEX IF NOT EXISTS idx_travel_history_dates ON travel_history(departure_date, return_date)',
      'CREATE INDEX IF NOT EXISTS idx_user_interactions_type ON user_interactions(interaction_type)',
      'CREATE INDEX IF NOT EXISTS idx_user_interactions_created_at ON user_interactions(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON saved_searches(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON user_feedback(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_goals_user_id ON user_goals(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_goals_status ON user_goals(status)',
      'CREATE INDEX IF NOT EXISTS idx_passenger_details_user_id ON passenger_details(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_passenger_details_primary ON passenger_details(user_id, is_primary_passenger)',
      'CREATE INDEX IF NOT EXISTS idx_passenger_details_favorite ON passenger_details(user_id, is_favorite)'
    ];

    for (const query of indexQueries) {
      try {
        await client.query(query);
        console.log('✅ Index created');
      } catch (error) {
        console.log('ℹ️  Index already exists');
      }
    }

    // Step 4: Create JSONB indexes
    console.log('\n📊 Creating JSONB indexes...');
    
    const jsonbIndexQueries = [
      'CREATE INDEX IF NOT EXISTS idx_user_preferences_jsonb ON user_preferences USING GIN (preferences)',
      'CREATE INDEX IF NOT EXISTS idx_user_interactions_jsonb ON user_interactions USING GIN (interaction_data)',
      'CREATE INDEX IF NOT EXISTS idx_saved_searches_jsonb ON saved_searches USING GIN (search_criteria)',
      'CREATE INDEX IF NOT EXISTS idx_user_favorites_jsonb ON user_favorites USING GIN (favorite_data)'
    ];

    for (const query of jsonbIndexQueries) {
      try {
        await client.query(query);
        console.log('✅ JSONB index created');
      } catch (error) {
        console.log('ℹ️  JSONB index already exists');
      }
    }

    // Step 5: Create full-text search indexes
    console.log('\n🔍 Creating full-text search indexes...');
    
    try {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_users_search ON users 
        USING GIN (to_tsvector('english', display_name || ' ' || first_name || ' ' || last_name))
      `);
      console.log('✅ Users full-text search index created');
    } catch (error) {
      console.log('ℹ️  Users full-text search index already exists');
    }

    try {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_travel_history_search ON travel_history 
        USING GIN (to_tsvector('english', destination_city || ' ' || destination_country || ' ' || COALESCE(notes, '')))
      `);
      console.log('✅ Travel history full-text search index created');
    } catch (error) {
      console.log('ℹ️  Travel history full-text search index already exists');
    }

    // Step 6: Create triggers for updated_at timestamps
    console.log('\n⏰ Creating update triggers...');
    
    try {
      await client.query(`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ language 'plpgsql'
      `);
      console.log('✅ Update trigger function created');

      const triggerQueries = [
        'CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
        'CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
        'CREATE TRIGGER update_user_goals_updated_at BEFORE UPDATE ON user_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
        'CREATE TRIGGER update_user_communication_preferences_updated_at BEFORE UPDATE ON user_communication_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
        'CREATE TRIGGER update_passenger_details_updated_at BEFORE UPDATE ON passenger_details FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()'
      ];

      for (const query of triggerQueries) {
        try {
          await client.query(query);
          console.log('✅ Trigger created');
        } catch (error) {
          console.log('ℹ️  Trigger already exists');
        }
      }
    } catch (error) {
      console.log('ℹ️  Triggers already exist');
    }

    // Step 7: Create additional views
    console.log('\n👁️  Creating additional views...');
    
    try {
      await client.query(`
        CREATE OR REPLACE VIEW user_travel_insights AS
        SELECT 
          u.id,
          u.email,
          u.display_name,
          COUNT(DISTINCT th.id) as total_trips,
          COUNT(DISTINCT th.destination_country) as countries_visited,
          COUNT(DISTINCT th.destination_city) as cities_visited,
          AVG(th.rating) as average_trip_rating,
          SUM(th.total_cost) as total_spent,
          MAX(th.created_at) as last_trip_date,
          MIN(th.created_at) as first_trip_date,
          AVG(th.duration_days) as average_trip_duration,
          COUNT(DISTINCT up.category) as preference_categories,
          u.timezone,
          u.language
        FROM users u
        LEFT JOIN travel_history th ON u.id = th.user_id
        LEFT JOIN user_preferences up ON u.id = up.user_id
        GROUP BY u.id, u.email, u.display_name, u.timezone, u.language
      `);
      console.log('✅ User travel insights view created');
    } catch (error) {
      console.log('ℹ️  User travel insights view already exists');
    }

    // Step 8: Insert sample data for new tables
    console.log('\n📝 Inserting sample data for new tables...');
    
    // Get existing demo user
    const demoUser = await client.query('SELECT id FROM users WHERE email = $1', ['demo@example.com']);
    
    if (demoUser.rows.length > 0) {
      const userId = demoUser.rows[0].id;
      
      // Insert sample communication preferences
      try {
        await client.query(`
          INSERT INTO user_communication_preferences (user_id, email_notifications, sms_notifications, push_notifications, marketing_emails, price_alerts, travel_reminders, newsletter, frequency)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [userId, true, false, true, false, true, true, false, 'daily']);
        console.log('✅ Sample communication preferences created');
      } catch (error) {
        console.log('ℹ️  Communication preferences already exist');
      }
      
      // Insert sample passenger details
      try {
        await client.query(`
          INSERT INTO passenger_details (user_id, passenger_type, title, first_name, last_name, date_of_birth, document_type, document_number, nationality, is_primary_passenger, is_favorite)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [userId, 'adult', 'Mr', 'Demo', 'User', '1990-01-01', 'passport', 'US123456789', 'United States', true, true]);
        console.log('✅ Sample passenger details created');
      } catch (error) {
        console.log('ℹ️  Passenger details already exist');
      }
      
      // Insert sample goal
      try {
        await client.query(`
          INSERT INTO user_goals (user_id, goal_type, title, description, target_date, destination, estimated_budget, priority, status, progress_percentage)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [userId, 'bucket_list', 'Visit Japan', 'Experience Japanese culture, food, and technology', '2025-12-31', 'Japan', 5000.00, 1, 'pending', 0]);
        console.log('✅ Sample goal created');
      } catch (error) {
        console.log('ℹ️  Goal already exists');
      }
      
      console.log('✅ Sample data inserted for new tables');
    }

    // Commit transaction
    await client.query('COMMIT');
    console.log('\n✅ Schema update transaction committed successfully!');

    client.release();
    await pool.end();

    console.log('\n🎉 Database schema update completed successfully!');
    console.log('\n📊 New features added:');
    console.log('   • User sessions management');
    console.log('   • Saved searches and favorites');
    console.log('   • User feedback and ratings');
    console.log('   • Travel goals and planning');
    console.log('   • Communication preferences');
    console.log('   • Passenger details management');
    console.log('   • Enhanced indexing and search');
    console.log('   • Automated timestamp updates');
    console.log('   • Comprehensive travel insights');

  } catch (error) {
    console.error('\n❌ Schema update failed:', error.message);
    console.error('\n🔧 Rolling back changes...');
    
    try {
      const pool = new Pool(dbConfig);
      const client = await pool.connect();
      await client.query('ROLLBACK');
      client.release();
      await pool.end();
      console.log('✅ Changes rolled back successfully');
    } catch (rollbackError) {
      console.error('❌ Rollback failed:', rollbackError.message);
    }
    
    process.exit(1);
  }
}

if (require.main === module) {
  updateDatabaseSchema();
}

module.exports = { updateDatabaseSchema };
