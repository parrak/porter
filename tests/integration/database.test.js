/**
 * Database integration tests
 */

const { executeQuery, testConnection } = require('../../database/connection');

describe('Database Integration Tests', () => {
  beforeAll(async () => {
    // Test database connection before running tests
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Database connection failed - cannot run tests');
    }
  });

  describe('Database Connection', () => {
    it('should connect to database successfully', async () => {
      const result = await executeQuery('SELECT NOW() as current_time');
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].current_time).toBeDefined();
    });

    it('should handle basic SQL operations', async () => {
      // Test basic SELECT
      const selectResult = await executeQuery('SELECT 1 as test_value, \'hello\' as test_string');
      expect(selectResult.rows).toHaveLength(1);
      expect(selectResult.rows[0].test_value).toBe(1);
      expect(selectResult.rows[0].test_string).toBe('hello');

      // Test basic math
      const mathResult = await executeQuery('SELECT 2 + 3 as sum, 10 / 2 as division');
      expect(mathResult.rows).toHaveLength(1);
      expect(mathResult.rows[0].sum).toBe(5);
      expect(mathResult.rows[0].division).toBe(5);
    });
  });

  describe('User Management', () => {
    let testUserId;

    it('should create a test user', async () => {
      const result = await executeQuery(`
        INSERT INTO users (email, display_name, first_name, last_name)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, ['test@example.com', 'Test User', 'Test', 'User']);

      expect(result.rows).toHaveLength(1);
      testUserId = result.rows[0].id;
      expect(testUserId).toBeDefined();
    });

    it('should retrieve the created user', async () => {
      const result = await executeQuery(`
        SELECT * FROM users WHERE id = $1
      `, [testUserId]);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].email).toBe('test@example.com');
      expect(result.rows[0].display_name).toBe('Test User');
    });

    it('should update user information', async () => {
      const result = await executeQuery(`
        UPDATE users 
        SET display_name = $2, updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `, [testUserId, 'Updated Test User']);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].display_name).toBe('Updated Test User');
    });

    it('should create user preferences', async () => {
      const preferences = {
        travel_style: 'business',
        preferred_airlines: ['delta', 'united'],
        budget_range: 'mid_range'
      };

      const result = await executeQuery(`
        INSERT INTO user_preferences (user_id, category, preferences)
        VALUES ($1, $2, $3)
        RETURNING *
      `, [testUserId, 'travel_preferences', preferences]);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].user_id).toBe(testUserId);
      expect(result.rows[0].category).toBe('travel_preferences');
    });

    it('should create travel history', async () => {
      const result = await executeQuery(`
        INSERT INTO travel_history (
          user_id, trip_type, destination_city, destination_country,
          departure_date, return_date, duration_days, total_cost, currency
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        testUserId, 'business', 'New York', 'USA',
        '2025-01-15', '2025-01-20', 5, 1200.00, 'USD'
      ]);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].trip_type).toBe('business');
      expect(result.rows[0].destination_city).toBe('New York');
    });

    it('should track user interactions', async () => {
      const interactionData = {
        search_query: 'flight to new york',
        selected_option: 'delta_123',
        time_spent_seconds: 45
      };

      const result = await executeQuery(`
        INSERT INTO user_interactions (
          user_id, interaction_type, interaction_data
        )
        VALUES ($1, $2, $3)
        RETURNING *
      `, [testUserId, 'flight_search', interactionData]);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].interaction_type).toBe('flight_search');
    });

    it('should create passenger details', async () => {
      const result = await executeQuery(`
        INSERT INTO passenger_details (
          user_id, passenger_type, first_name, last_name,
          document_type, document_number, nationality
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        testUserId, 'adult', 'John', 'Doe',
        'passport', 'US123456789', 'US'
      ]);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].passenger_type).toBe('adult');
      expect(result.rows[0].first_name).toBe('John');
    });

    it('should retrieve user profile summary', async () => {
      const result = await executeQuery(`
        SELECT * FROM user_profile_summary WHERE id = $1
      `, [testUserId]);

      if (result.rows.length > 0) {
        expect(result.rows[0]).toHaveProperty('total_trips');
        expect(result.rows[0]).toHaveProperty('saved_searches_count');
        expect(result.rows[0]).toHaveProperty('favorites_count');
      }
    });

    afterAll(async () => {
      // Clean up test data
      if (testUserId) {
        await executeQuery('DELETE FROM user_interactions WHERE user_id = $1', [testUserId]);
        await executeQuery('DELETE FROM travel_history WHERE user_id = $1', [testUserId]);
        await executeQuery('DELETE FROM user_preferences WHERE user_id = $1', [testUserId]);
        await executeQuery('DELETE FROM passenger_details WHERE user_id = $1', [testUserId]);
        await executeQuery('DELETE FROM users WHERE id = $1', [testUserId]);
      }
    });
  });

  describe('Data Validation', () => {
    it('should enforce email uniqueness', async () => {
      // Create first user
      const user1 = await executeQuery(`
        INSERT INTO users (email, display_name)
        VALUES ($1, $2)
        RETURNING id
      `, ['unique@example.com', 'User 1']);

      // Try to create second user with same email
      try {
        await executeQuery(`
          INSERT INTO users (email, display_name)
          VALUES ($1, $2)
          RETURNING id
        `, ['unique@example.com', 'User 2']);
        
        // If we get here, the constraint failed
        fail('Should have thrown error for duplicate email');
      } catch (error) {
        expect(error.message).toContain('duplicate key');
      }

      // Clean up
      await executeQuery('DELETE FROM users WHERE id = $1', [user1.rows[0].id]);
    });

    it('should handle JSONB data correctly', async () => {
      const testUserId = 'test-jsonb-user';
      const complexPreferences = {
        travel_style: {
          pace: 'relaxed',
          adventure_level: 'moderate',
          preferred_seasons: ['spring', 'fall']
        },
        accommodation: {
          types: ['hotel', 'airbnb'],
          budget_range: 'mid_range',
          amenities: ['wifi', 'breakfast', 'parking']
        }
      };

      const result = await executeQuery(`
        INSERT INTO user_preferences (user_id, category, preferences)
        VALUES ($1, $2, $3)
        RETURNING *
      `, [testUserId, 'complex_preferences', complexPreferences]);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].preferences.travel_style.pace).toBe('relaxed');
      expect(result.rows[0].preferences.accommodation.amenities).toContain('wifi');

      // Clean up
      await executeQuery('DELETE FROM user_preferences WHERE user_id = $1', [testUserId]);
    });
  });
});
