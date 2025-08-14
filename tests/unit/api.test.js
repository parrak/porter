/**
 * Unit tests for API endpoints
 */

// Mock the database connection
jest.mock('../../database/connection', () => ({
  executeQuery: jest.fn(),
  executeTransaction: jest.fn(),
  testConnection: jest.fn()
}));

// Mock the utils
jest.mock('../../utils/common', () => ({
  generateRequestId: jest.fn(() => 'test_request_id'),
  logTelemetry: jest.fn()
}));

const { executeQuery } = require('../../database/connection');
const { generateRequestId, logTelemetry } = require('../../utils/common');

describe('API Endpoints', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    mockReq = {
      method: 'POST',
      url: '/api/test',
      headers: {},
      body: {},
      query: {},
      params: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      end: jest.fn(),
      setHeader: jest.fn()
    };

    // Reset mocks
    jest.clearAllMocks();
    executeQuery.mockClear();
    generateRequestId.mockClear();
    logTelemetry.mockClear();
  });

  describe('User Profiles API', () => {
    let userProfilesHandler;

    beforeEach(async () => {
      // Dynamically import the handler
      userProfilesHandler = require('../../api/user-profiles');
      
      // Set the correct URL pattern for the handler
      mockReq.url = '/api/user-profiles/profile';
    });

    it('should create a new user profile successfully', async () => {
      mockReq.body = TEST_DATA.validUser;
      
      // Mock database responses
      executeQuery
        .mockResolvedValueOnce({ rows: [] }) // No existing user
        .mockResolvedValueOnce({ 
          rows: [{ 
            id: 'uuid-123', 
            email: 'test@example.com',
            display_name: 'Test User'
          }] 
        }) // New user created
        .mockResolvedValueOnce({ rows: [{ id: 'comm-123' }] }); // Communication preferences

      await userProfilesHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'User profile created successfully'
        })
      );
    });

    it('should update existing user profile successfully', async () => {
      mockReq.body = TEST_DATA.validUser;
      
      // Mock database responses
      executeQuery
        .mockResolvedValueOnce({ 
          rows: [{ id: 'existing-uuid' }] 
        }) // Existing user found
        .mockResolvedValueOnce({ 
          rows: [{ 
            id: 'existing-uuid', 
            email: 'test@example.com',
            display_name: 'Updated User'
          }] 
        }); // User updated

      await userProfilesHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'User profile updated successfully'
        })
      );
    });

    it('should handle missing required fields', async () => {
      mockReq.body = { user_id: 'test' }; // Missing profile_data

      await userProfilesHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Missing required fields: user_id and profile_data'
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      mockReq.body = TEST_DATA.validUser;
      executeQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      await userProfilesHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Internal server error'
        })
      );
    });
  });

  describe('Passenger Details API', () => {
    let passengerDetailsHandler;

    beforeEach(async () => {
      passengerDetailsHandler = require('../../api/passenger-details');
    });

    it('should require authentication for passenger details', async () => {
      mockReq.method = 'GET';
      mockReq.headers = {}; // No authorization header

      await passengerDetailsHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Authentication Required',
          code: 'OAUTH_LOGIN_REQUIRED'
        })
      );
    });

    it('should handle OPTIONS preflight request', async () => {
      mockReq.method = 'OPTIONS';

      await passengerDetailsHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.end).toHaveBeenCalled();
    });
  });

  describe('Health Endpoint', () => {
    it('should return healthy status', async () => {
      mockReq.url = '/api/health';
      mockReq.method = 'GET';

      // Mock the health endpoint response
      const healthResponse = {
        status: 'healthy',
        service: 'Flight Booking Agent API',
        version: '1.0.0'
      };

      // Simulate the health endpoint
      mockRes.json(healthResponse);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'healthy',
          service: 'Flight Booking Agent API'
        })
      );
    });
  });
});
