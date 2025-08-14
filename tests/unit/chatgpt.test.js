/**
 * ChatGPT API Unit Tests
 * Tests the ChatGPT integration functionality
 */

// Mock the OpenAI API
const mockCreate = jest.fn();
const mockOpenAI = {
  chat: {
    completions: {
      create: mockCreate
    }
  }
};

jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => mockOpenAI)
}));

// Mock database connection
jest.mock('../../database/connection', () => ({
  executeQuery: jest.fn()
}));

// Mock utility functions
jest.mock('../../utils/common', () => ({
  generateRequestId: jest.fn(() => 'test_request_123'),
  logTelemetry: jest.fn()
}));

describe('ChatGPT API', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    mockCreate.mockClear();
    
    // Setup mock request/response
    mockReq = {
      method: 'POST',
      url: '/api/chatgpt',
      headers: {},
      body: {
        message: 'I want to book a flight from New York to Los Angeles',
        userId: 'test_user_123'
      },
      query: {},
      params: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      end: jest.fn(),
      setHeader: jest.fn()
    };
  });

  describe('Intent Parsing', () => {
    it('should parse flight booking intent correctly', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              type: 'flight_booking',
              from: 'New York',
              to: 'Los Angeles',
              date: '2025-09-15',
              passengers: 1,
              class: 'economy'
            })
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      // Import the handler dynamically
      const chatgptHandler = require('../../api/chatgpt');
      
      await chatgptHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          intent: expect.objectContaining({
            type: 'flight_booking',
            from: 'New York',
            to: 'Los Angeles'
          })
        })
      );
    });

    it('should handle empty or invalid messages gracefully', async () => {
      mockReq.body.message = '';

      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              type: 'unknown',
              message: 'Please provide more details about your request'
            })
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      const chatgptHandler = require('../../api/chatgpt');
      
      await chatgptHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          intent: expect.objectContaining({
            type: 'unknown'
          })
        })
      );
    });

    it('should handle OpenAI API errors gracefully', async () => {
      mockCreate.mockRejectedValue(
        new Error('OpenAI API rate limit exceeded')
      );

      const chatgptHandler = require('../../api/chatgpt');
      
      await chatgptHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('OpenAI API')
        })
      );
    });

    it('should handle malformed JSON responses', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Invalid JSON response'
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      const chatgptHandler = require('../../api/chatgpt');
      
      await chatgptHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          intent: expect.objectContaining({
            type: 'unknown'
          })
        })
      );
    });
  });

  describe('Model Fallback', () => {
    it('should fallback to GPT-4o if GPT-5 fails', async () => {
      // First call to GPT-5 fails
      mockCreate
        .mockRejectedValueOnce(new Error('GPT-5 unavailable'))
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: JSON.stringify({
                type: 'flight_booking',
                from: 'New York',
                to: 'Los Angeles'
              })
            }
          }]
        });

      const chatgptHandler = require('../../api/chatgpt');
      
      await chatgptHandler(mockReq, mockRes);

      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should fallback to GPT-4-turbo if both GPT-5 and GPT-4o fail', async () => {
      // First two calls fail
      mockCreate
        .mockRejectedValueOnce(new Error('GPT-5 unavailable'))
        .mockRejectedValueOnce(new Error('GPT-4o unavailable'))
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: JSON.stringify({
                type: 'flight_booking',
                from: 'New York',
                to: 'Los Angeles'
              })
            }
          }]
        });

      const chatgptHandler = require('../../api/chatgpt');
      
      await chatgptHandler(mockReq, mockRes);

      expect(mockCreate).toHaveBeenCalledTimes(3);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('Flight Offer Construction', () => {
    it('should construct complete flight offer object', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              type: 'flight_offer',
              flight: {
                origin: 'JFK',
                destination: 'LAX',
                departure: '2025-09-15T10:00:00Z',
                arrival: '2025-09-15T13:00:00Z',
                airline: 'Delta',
                price: 299.99
              }
            })
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      const chatgptHandler = require('../../api/chatgpt');
      
      await chatgptHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          intent: expect.objectContaining({
            type: 'flight_offer'
          })
        })
      );
    });
  });

  describe('Passenger Details Integration', () => {
    it('should check for saved passenger details', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              type: 'passenger_check',
              message: 'Checking saved passenger details...'
            })
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      const chatgptHandler = require('../../api/chatgpt');
      
      await chatgptHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          intent: expect.objectContaining({
            type: 'passenger_check'
          })
        })
      );
    });

    it('should offer to save passenger details after booking', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              type: 'save_passenger',
              message: 'Would you like to save these passenger details?'
            })
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      const chatgptHandler = require('../../api/chatgpt');
      
      await chatgptHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          intent: expect.objectContaining({
            type: 'save_passenger'
          })
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle missing message parameter', async () => {
      delete mockReq.body.message;

      const chatgptHandler = require('../../api/chatgpt');
      
      await chatgptHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('message')
        })
      );
    });

    it('should handle missing userId parameter', async () => {
      delete mockReq.body.userId;

      const chatgptHandler = require('../../api/chatgpt');
      
      await chatgptHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('userId')
        })
      );
    });

    it('should handle all models failing with fallback parser', async () => {
      // All OpenAI calls fail
      mockCreate.mockRejectedValue(new Error('All models unavailable'));

      const chatgptHandler = require('../../api/chatgpt');
      
      await chatgptHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          intent: expect.objectContaining({
            type: 'fallback'
          })
        })
      );
    });
  });
});
