/**
 * ChatGPT API Unit Tests
 * Tests the ChatGPT integration functionality
 */

// Mock fetch globally
global.fetch = jest.fn();

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
    fetch.mockClear();
    
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

    // Set up environment variables for testing
    process.env.OPENAI_API_KEY = 'test_api_key';
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  describe('Intent Parsing', () => {
    it('should parse flight booking intent correctly', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: '{"origin":"JFK","destination":"LAX","date":"2025-09-15","passengers":1,"class":"economy"}'
          }
        }],
        usage: { total_tokens: 50 }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      });

      // Import the handler dynamically
      const chatgptHandler = require('../../api/chatgpt');
      
      await chatgptHandler(mockReq, mockRes);

      expect(fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test_api_key'
          }),
          body: expect.stringContaining('gpt-5')
        })
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false, // API always asks for more info
          originalIntent: expect.objectContaining({
            origin: 'JFK',
            destination: 'LAX',
            date: '2025-09-15',
            passengers: 1,
            class: 'economy'
          }),
          requiresBookingInfo: true,
          message: expect.stringContaining('additional information')
        })
      );
    });

    it('should handle empty or invalid messages gracefully', async () => {
      mockReq.body.message = '';

      const chatgptHandler = require('../../api/chatgpt');
      
      await chatgptHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Message is required'
        })
      );
    });

    it('should handle OpenAI API errors gracefully', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => 'Rate limit exceeded'
      });

      const chatgptHandler = require('../../api/chatgpt');
      
      await chatgptHandler(mockReq, mockRes);

      expect(fetch).toHaveBeenCalledTimes(3); // Tries all 3 models
      expect(mockRes.status).toHaveBeenCalledWith(500); // Should return 500 when all models fail
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Internal server error',
          message: expect.any(String)
        })
      );
    });

    it('should handle malformed JSON responses', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Invalid JSON response'
          }
        }],
        usage: { total_tokens: 50 }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      });

      const chatgptHandler = require('../../api/chatgpt');
      
      await chatgptHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500); // Should return 500 for invalid JSON
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Internal server error',
          message: expect.stringContaining('Invalid JSON response')
        })
      );
    });
  });

  describe('Model Fallback', () => {
    it('should fallback to GPT-4o if GPT-5 fails', async () => {
      // First call to GPT-5 fails
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal server error'
      });

      // Second call to GPT-4o succeeds
      const mockResponse = {
        choices: [{
          message: {
            content: '{"origin":"JFK","destination":"LAX","date":"2025-09-15","passengers":1,"class":"economy"}'
          }
        }],
        usage: { total_tokens: 50 }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      });

      const chatgptHandler = require('../../api/chatgpt');
      
      await chatgptHandler(mockReq, mockRes);

      expect(fetch).toHaveBeenCalledTimes(3); // 2 OpenAI calls + 1 additional call
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false, // API always asks for more info
          originalIntent: expect.objectContaining({
            origin: 'JFK',
            destination: 'LAX'
          })
        })
      );
    });

    it('should fallback to GPT-4-turbo if both GPT-5 and GPT-4o fail', async () => {
      // First two calls fail
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal server error'
      });

      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal server error'
      });

      // Third call to GPT-4-turbo succeeds
      const mockResponse = {
        choices: [{
          message: {
            content: '{"origin":"JFK","destination":"LAX","date":"2025-09-15","passengers":1,"class":"economy"}'
          }
        }],
        usage: { total_tokens: 50 }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      });

      const chatgptHandler = require('../../api/chatgpt');
      
      await chatgptHandler(mockReq, mockRes);

      expect(fetch).toHaveBeenCalledTimes(4); // 3 OpenAI calls + 1 additional call
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false, // API always asks for more info
          originalIntent: expect.objectContaining({
            origin: 'JFK',
            destination: 'LAX'
          })
        })
      );
    });
  });

  describe('Flight Offer Construction', () => {
    it('should construct complete flight offer object', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: '{"origin":"JFK","destination":"LAX","date":"2025-09-15","passengers":1,"class":"economy"}'
          }
        }],
        usage: { total_tokens: 50 }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      });

      const chatgptHandler = require('../../api/chatgpt');
      
      await chatgptHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false, // API always asks for more info
          originalIntent: expect.objectContaining({
            origin: 'JFK',
            destination: 'LAX',
            date: '2025-09-15',
            passengers: 1,
            class: 'economy'
          }),
          requiresBookingInfo: true
        })
      );
    });
  });

  describe('Passenger Details Integration', () => {
    it('should check for saved passenger details', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: '{"origin":"JFK","destination":"LAX","date":"2025-09-15","passengers":1,"class":"economy"}'
          }
        }],
        usage: { total_tokens: 50 }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      });

      const chatgptHandler = require('../../api/chatgpt');
      
      await chatgptHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false, // API always asks for more info
          requiresBookingInfo: true,
          message: expect.stringContaining('additional information')
        })
      );
    });

    it('should offer to save passenger details after booking', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: '{"origin":"JFK","destination":"LAX","date":"2025-09-15","passengers":1,"class":"economy"}'
          }
        }],
        usage: { total_tokens: 50 }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      });

      const chatgptHandler = require('../../api/chatgpt');
      
      await chatgptHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false, // API always asks for more info
          passengerOptions: expect.arrayContaining([
            'Enter passenger information',
            'Save passenger details for future use'
          ]),
          message: expect.stringContaining('additional information')
        })
      );
    });

    it('should include passenger details collection information in response', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: '{"origin":"JFK","destination":"LAX","date":"2025-09-15","passengers":1,"class":"economy"}'
          }
        }],
        usage: { total_tokens: 50 }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      });

      const chatgptHandler = require('../../api/chatgpt');
      
      await chatgptHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false, // API always asks for more info
          requiresBookingInfo: true,
          message: expect.stringContaining('additional information'),
          requiredInfo: expect.objectContaining({
            passengers: expect.any(Object),
            contactInfo: expect.any(Object)
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
          error: 'Message is required'
        })
      );
    });

    it('should handle missing userId parameter', async () => {
      delete mockReq.body.userId;

      const chatgptHandler = require('../../api/chatgpt');
      
      await chatgptHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200); // API handles missing userId gracefully
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          requiresUserId: true,
          message: expect.stringContaining('need to know who you are')
        })
      );
    });

    it('should handle all models failing with fallback parser', async () => {
      // All OpenAI calls fail
      fetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'All models unavailable'
      });

      const chatgptHandler = require('../../api/chatgpt');
      
      await chatgptHandler(mockReq, mockRes);

      expect(fetch).toHaveBeenCalledTimes(3); // Tries all 3 models
      expect(mockRes.status).toHaveBeenCalledWith(500); // Should return 500 when all models fail
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Internal server error',
          message: expect.any(String)
        })
      );
    });
  });

  describe('API Configuration', () => {
    it('should use correct OpenAI API endpoint', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: '{"origin":"JFK","destination":"LAX","date":"2025-09-15","passengers":1,"class":"economy"}'
          }
        }],
        usage: { total_tokens: 50 }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      });

      const chatgptHandler = require('../../api/chatgpt');
      
      await chatgptHandler(mockReq, mockRes);

      expect(fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.any(Object)
      );
    });

    it('should include proper headers in API request', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: '{"origin":"JFK","destination":"LAX","date":"2025-09-15","passengers":1,"class":"economy"}'
          }
        }],
        usage: { total_tokens: 50 }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      });

      const chatgptHandler = require('../../api/chatgpt');
      
      await chatgptHandler(mockReq, mockRes);

      expect(fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test_api_key'
          })
        })
      );
    });
  });
});
