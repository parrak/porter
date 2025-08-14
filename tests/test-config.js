/**
 * Test Configuration
 * Centralized configuration for all tests
 */

// Test environment configuration
const TEST_CONFIG = {
  // Database configuration for testing
  database: {
    connectionString: process.env.TEST_DATABASE_URL || 'postgresql://neondb_owner:npg_KAoyx1BM4rwF@ep-square-salad-aepilb5f-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
    ssl: { rejectUnauthorized: false },
    // Use a separate test database or schema if available
    schema: 'public'
  },
  
  // API configuration for testing
  api: {
    baseUrl: process.env.TEST_API_URL || 'http://localhost:3000',
    timeout: 10000,
    retries: 3
  },
  
  // Test data configuration
  testData: {
    cleanupAfterTests: true,
    useTestUsers: true,
    preserveTestData: false
  },
  
  // Mock configuration
  mocks: {
    externalAPIs: true,
    database: false, // Use real database for integration tests
    fileSystem: true
  }
};

// Test utilities
const TEST_UTILS = {
  // Generate unique test IDs
  generateTestId: (prefix = 'test') => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  
  // Generate test user data
  generateTestUser: (overrides = {}) => ({
    email: `test_${Date.now()}@example.com`,
    display_name: 'Test User',
    first_name: 'John',
    last_name: 'Smith',
    phone: '+1-555-0123',
    date_of_birth: '1990-01-01',
    timezone: 'America/New_York',
    language: 'en',
    ...overrides
  }),
  
  // Generate test passenger data
  generateTestPassenger: (overrides = {}) => ({
    passenger_type: 'adult',
    title: 'Mr',
    first_name: 'John',
    last_name: 'Smith',
    date_of_birth: '1990-01-01',
    document_type: 'passport',
    document_number: `US${Date.now()}`,
    document_expiry_date: '2028-12-31',
    nationality: 'US',
    is_primary_passenger: true,
    is_favorite: true,
    notes: 'Test passenger',
    ...overrides
  }),
  
  // Generate test flight search data
  generateTestFlightSearch: (overrides = {}) => ({
    origin: 'JFK',
    destination: 'LAX',
    departureDate: '2025-09-15',
    adults: 1,
    travelClass: 'economy',
    ...overrides
  }),
  
  // Clean up test data
  cleanupTestData: async (pool, userId) => {
    try {
      const client = await pool.connect();
      await client.query('BEGIN');
      
      // Delete test data in reverse dependency order
      await client.query('DELETE FROM passenger_details WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM user_goals WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM user_communication_preferences WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM user_feedback WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM user_favorites WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM saved_searches WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM user_sessions WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM travel_history WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM user_interactions WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM user_preferences WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM users WHERE id = $1', [userId]);
      
      await client.query('COMMIT');
      client.release();
    } catch (error) {
      console.error('Error cleaning up test data:', error);
    }
  }
};

// Environment setup
const setupTestEnvironment = () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.TESTING = 'true';
  
  // Set test database URL if not already set
  if (!process.env.TEST_DATABASE_URL) {
    process.env.TEST_DATABASE_URL = TEST_CONFIG.database.connectionString;
  }
  
  // Set test API URL if not already set
  if (!process.env.TEST_API_URL) {
    process.env.TEST_API_URL = TEST_CONFIG.api.baseUrl;
  }
};

// Export configuration
module.exports = {
  TEST_CONFIG,
  TEST_UTILS,
  setupTestEnvironment
};
