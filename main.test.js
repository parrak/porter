// Test file for main.js - Airline Booking Agent
const { searchFlights, askLLM } = require('./main');

// Mock axios to avoid actual API calls during testing
jest.mock('axios');
const axios = require('axios');

describe('Airline Booking Agent Tests', () => {
  
  describe('searchFlights function', () => {
    test('should find flights with exact match', () => {
      const result = searchFlights('New York', 'London', '2024-07-01');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 1,
        from: 'New York',
        to: 'London',
        date: '2024-07-01',
        price: 500
      });
    });

    test('should find flights with case-insensitive match', () => {
      const result = searchFlights('new york', 'london', '2024-07-01');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    test('should return empty array for no matches', () => {
      const result = searchFlights('Mumbai', 'Delhi', '2024-07-01');
      expect(result).toHaveLength(0);
    });

    test('should return empty array for wrong date', () => {
      const result = searchFlights('New York', 'London', '2024-08-01');
      expect(result).toHaveLength(0);
    });

    test('should return empty array for wrong destination', () => {
      const result = searchFlights('New York', 'Mumbai', '2024-07-01');
      expect(result).toHaveLength(0);
    });
  });

  describe('askLLM function', () => {
    beforeEach(() => {
      // Clear all mocks before each test
      jest.clearAllMocks();
    });

    test('should successfully call OpenAI API', async () => {
      const mockResponse = {
        data: {
          choices: [{
            message: {
              content: '{"from": "New York", "to": "London", "date": "2024-07-01"}'
            }
          }]
        }
      };

      axios.post.mockResolvedValue(mockResponse);

      const result = await askLLM('Find flights from New York to London on 2024-07-01');
      
      expect(axios.post).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'Find flights from New York to London on 2024-07-01' }],
          max_tokens: 150,
        },
        {
          headers: {
            'Authorization': expect.stringContaining('sk-proj-'),
            'Content-Type': 'application/json',
          },
        }
      );

      expect(result).toBe('{"from": "New York", "to": "London", "date": "2024-07-01"}');
    });

    test('should handle API errors gracefully', async () => {
      const errorMessage = 'API rate limit exceeded';
      axios.post.mockRejectedValue(new Error(errorMessage));

      await expect(askLLM('test prompt')).rejects.toThrow(errorMessage);
    });

    test('should handle malformed API responses', async () => {
      const mockResponse = {
        data: {
          choices: [] // Empty choices array
        }
      };

      axios.post.mockResolvedValue(mockResponse);

      await expect(askLLM('test prompt')).rejects.toThrow();
    });
  });

  describe('Integration tests', () => {
    test('should process complete booking flow', async () => {
      const mockLLMResponse = {
        data: {
          choices: [{
            message: {
              content: '{"from": "San Francisco", "to": "Tokyo", "date": "2024-07-02"}'
            }
          }]
        }
      };

      axios.post.mockResolvedValue(mockLLMResponse);

      // Test the complete flow
      const llmResponse = await askLLM('Find flights from San Francisco to Tokyo on 2024-07-02');
      const info = JSON.parse(llmResponse);
      const flights = searchFlights(info.from, info.to, info.date);

      expect(flights).toHaveLength(1);
      expect(flights[0].price).toBe(700);
    });
  });

  describe('Edge cases', () => {
    test('should handle empty search parameters', () => {
      const result = searchFlights('', '', '');
      expect(result).toHaveLength(0);
    });

    test('should handle null search parameters', () => {
      const result = searchFlights(null, null, null);
      expect(result).toHaveLength(0);
    });

    test('should handle undefined search parameters', () => {
      const result = searchFlights(undefined, undefined, undefined);
      expect(result).toHaveLength(0);
    });
  });
});

// Mock console methods to avoid output during tests
global.console = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
};
