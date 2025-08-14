/**
 * Unit tests for ChatGPT API functionality
 */

// Mock the OpenAI API
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  }))
}));

// Mock the database connection
jest.mock('../../database/connection', () => ({
  executeQuery: jest.fn(),
  executeTransaction: jest.fn()
}));

// Mock the utils
jest.mock('../../utils/common', () => ({
  generateRequestId: jest.fn(() => 'test_request_id'),
  logTelemetry: jest.fn()
}));

// Import after mocking
const { OpenAI } = require('openai');
const { executeQuery } = require('../../database/connection');
const { generateRequestId, logTelemetry } = require('../../utils/common');

describe('ChatGPT API', () => {
  let mockOpenAI;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock OpenAI
    mockOpenAI = new OpenAI();
    
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

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

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

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

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
      mockOpenAI.chat.completions.create.mockRejectedValue(
        new Error('OpenAI API rate limit exceeded')
      );

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

    it('should handle malformed JSON responses', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'This is not valid JSON'
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

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

  describe('Model Fallback', () => {
    it('should fallback to GPT-4o if GPT-5 fails', async () => {
      // First call to GPT-5 fails
      mockOpenAI.chat.completions.create
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

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(2);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should fallback to GPT-4-turbo if both GPT-5 and GPT-4o fail', async () => {
      // First two calls fail
      mockOpenAI.chat.completions.create
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

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(3);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('Flight Offer Construction', () => {
    it('should construct complete flight offer object', async () => {
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

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const chatgptHandler = require('../../api/chatgpt');
      
      await chatgptHandler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          intent: expect.objectContaining({
            type: 'flight_booking'
          }),
          flightOffer: expect.objectContaining({
            type: 'flight-offer',
            source: 'GDS',
            validatingAirlineCodes: expect.any(Array),
            itineraries: expect.any(Array),
            travelerPricings: expect.any(Array)
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
              type: 'flight_booking',
              from: 'New York',
              to: 'Los Angeles',
              date: '2025-09-15',
              passengers: 1,
              class: 'economy',
              useSavedPassengers: true
            })
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const chatgptHandler = require('../../api/chatgpt');
      
      await chatgptHandler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          intent: expect.objectContaining({
            useSavedPassengers: true
          })
        })
      );
    });

    it('should offer to save passenger details after booking', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              type: 'flight_booking',
              from: 'New York',
              to: 'Los Angeles',
              date: '2025-09-15',
              passengers: 1,
              class: 'economy',
              savePassengerDetails: true
            })
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const chatgptHandler = require('../../api/chatgpt');
      
      await chatgptHandler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          intent: expect.objectContaining({
            savePassengerDetails: true
          })
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle missing message parameter', async () => {
      mockReq.body.message = undefined;

      const chatgptHandler = require('../../api/chatgpt');
      
      await chatgptHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Missing required parameter: message'
        })
      );
    });

    it('should handle missing userId parameter', async () => {
      mockReq.body.userId = undefined;

      const chatgptHandler = require('../../api/chatgpt');
      
      await chatgptHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Missing required parameter: userId'
        })
      );
    });

    it('should handle all models failing with fallback parser', async () => {
      // All OpenAI calls fail
      mockOpenAI.chat.completions.create
        .mockRejectedValue(new Error('All models unavailable'));

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
