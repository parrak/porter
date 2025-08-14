/**
 * Unit tests for utility functions
 */

const {
  generateRequestId,
  logTelemetry,
  isValidEmail,
  generateRandomString,
  formatCurrency,
  parseDate,
  isValidAirportCode,
  sanitizeInput
} = require('../../utils/common');

describe('Utility Functions', () => {
  describe('generateRequestId', () => {
    it('should generate a unique request ID', () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();
      
      expect(id1).toMatch(/^req_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^req_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('logTelemetry', () => {
    it('should log telemetry data with timestamp', () => {
      const consoleSpy = jest.spyOn(console, 'log');
      const testData = { event: 'test_event', userId: '123' };
      
      logTelemetry('test_event', testData);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/^\[TELEMETRY\] .*/)
      );
      
      const loggedData = JSON.parse(consoleSpy.mock.calls[0][0].replace('[TELEMETRY] ', ''));
      expect(loggedData.event).toBe('test_event');
      expect(loggedData.userId).toBe('123');
      expect(loggedData.timestamp).toBeDefined();
      expect(loggedData.environment).toBe('test');
      
      consoleSpy.mockRestore();
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct email formats', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(isValidEmail('test+tag@example.org')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail(null)).toBe(false);
      expect(isValidEmail(undefined)).toBe(false);
    });
  });

  describe('generateRandomString', () => {
    it('should generate random string of specified length', () => {
      const str1 = generateRandomString(8);
      const str2 = generateRandomString(16);
      
      expect(str1).toHaveLength(8);
      expect(str2).toHaveLength(16);
      expect(str1).toMatch(/^[a-z0-9]+$/);
      expect(str2).toMatch(/^[a-z0-9]+$/);
      expect(str1).not.toBe(str2);
    });

    it('should default to 8 characters if no length specified', () => {
      const str = generateRandomString();
      expect(str).toHaveLength(8);
    });
  });

  describe('formatCurrency', () => {
    it('should format USD currency correctly', () => {
      expect(formatCurrency(1234.56, 'USD')).toBe('$1,234.56');
      expect(formatCurrency(0, 'USD')).toBe('$0.00');
      expect(formatCurrency(999999.99, 'USD')).toBe('$999,999.99');
    });

    it('should default to USD if no currency specified', () => {
      expect(formatCurrency(100)).toBe('$100.00');
    });
  });

  describe('parseDate', () => {
    it('should parse valid date strings', () => {
      expect(parseDate('2025-01-15')).toBe('2025-01-15');
      expect(parseDate('2024-12-31')).toBe('2024-12-31');
    });

    it('should handle invalid dates', () => {
      expect(parseDate('invalid-date')).toBe(null);
      expect(parseDate('')).toBe(null);
      expect(parseDate(null)).toBe(null);
      expect(parseDate(undefined)).toBe(null);
    });
  });

  describe('isValidAirportCode', () => {
    it('should validate correct airport codes', () => {
      expect(isValidAirportCode('JFK')).toBe(true);
      expect(isValidAirportCode('LAX')).toBe(true);
      expect(isValidAirportCode('CDG')).toBe(true);
    });

    it('should reject invalid airport codes', () => {
      expect(isValidAirportCode('JK')).toBe(false);
      expect(isValidAirportCode('LAX1')).toBe(false);
      expect(isValidAirportCode('123')).toBe(false);
      expect(isValidAirportCode('')).toBe(false);
      expect(isValidAirportCode(null)).toBe(false);
    });
  });

  describe('sanitizeInput', () => {
    it('should sanitize HTML characters', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
      expect(sanitizeInput('Hello <b>World</b>')).toBe('Hello bWorld/b');
    });

    it('should handle non-string inputs', () => {
      expect(sanitizeInput(123)).toBe(123);
      expect(sanitizeInput(null)).toBe(null);
      expect(sanitizeInput(undefined)).toBe(undefined);
    });

    it('should preserve safe text', () => {
      expect(sanitizeInput('Hello World')).toBe('Hello World');
      expect(sanitizeInput('123 Main St.')).toBe('123 Main St.');
    });
  });
});
