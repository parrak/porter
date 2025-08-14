/**
 * Global test setup and configuration
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.TESTING = 'true';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test utilities
global.generateTestRequestId = () => `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Mock fetch globally for tests
global.fetch = jest.fn();

// Test timeout
jest.setTimeout(30000);

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
  fetch.mockClear();
});

// Global test data
global.TEST_DATA = {
  validUser: {
    user_id: 'test_user_123',
    profile_data: {
      email: 'test@example.com',
      display_name: 'Test User',
      first_name: 'John',
      last_name: 'Smith',
      phone: '+1-555-0123',
      date_of_birth: '1990-01-01',
      timezone: 'America/New_York',
      language: 'en'
    }
  },
  validPassenger: {
    passenger_type: 'adult',
    title: 'Mr',
    first_name: 'John',
    last_name: 'Smith',
    date_of_birth: '1990-01-01',
    document_type: 'passport',
    document_number: 'US123456789',
    document_expiry_date: '2028-12-31',
    nationality: 'US',
    is_primary_passenger: true,
    is_favorite: true,
    notes: 'Test passenger'
  },
  validFlightSearch: {
    origin: 'JFK',
    destination: 'LAX',
    departureDate: '2025-09-15',
    adults: 1,
    travelClass: 'economy'
  }
};
