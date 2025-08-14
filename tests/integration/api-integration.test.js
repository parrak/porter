/**
 * Integration tests for API endpoints
 */

const request = require('supertest');
const app = require('../../index'); // Import the main app

describe('API Integration Tests', () => {
  describe('Health Endpoint', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        service: 'Flight Booking Agent API',
        version: '1.0.0'
      });
    });
  });

  describe('OAuth Endpoints', () => {
    it('should return OAuth status information', async () => {
      const response = await request(app)
        .get('/api/oauth/status')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'OAuth service is operational'
      });

      expect(response.body.oauth).toMatchObject({
        service: 'Porter Travel OAuth 2.0',
        status: 'operational'
      });
    });

    it('should handle OAuth authorization request', async () => {
      const response = await request(app)
        .get('/api/oauth/authorize')
        .query({
          response_type: 'code',
          client_id: 'test-client',
          redirect_uri: 'https://chatgpt.com/aip/g-test123/oauth/callback',
          scope: 'read write',
          state: 'test-state'
        })
        .expect(302); // Redirect response

      expect(response.headers.location).toContain('https://chatgpt.com/aip/g-test123/oauth/callback');
      expect(response.headers.location).toContain('code=');
      expect(response.headers.location).toContain('state=test-state');
    });
  });

  describe('User Profiles API', () => {
    it('should create a new user profile', async () => {
      const userData = {
        user_id: 'test_user_789',
        profile_data: {
          email: 'test789@example.com',
          display_name: 'Test User 789',
          first_name: 'Alice',
          last_name: 'Johnson',
          phone: '+1-555-0789',
          date_of_birth: '1985-06-15',
          timezone: 'America/Chicago',
          language: 'en'
        }
      };

      const response = await request(app)
        .post('/api/user-profiles/profile')
        .send(userData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        message: 'User profile created successfully'
      });

      expect(response.body.user).toMatchObject({
        email: 'test789@example.com',
        display_name: 'Test User 789',
        first_name: 'Alice',
        last_name: 'Johnson'
      });
    });

    it('should update existing user profile', async () => {
      // First create a user
      const userData = {
        user_id: 'test_user_update',
        profile_data: {
          email: 'update@example.com',
          display_name: 'Original Name',
          first_name: 'Original',
          last_name: 'Name'
        }
      };

      await request(app)
        .post('/api/user-profiles/profile')
        .send(userData)
        .expect(201);

      // Then update the user
      const updateData = {
        user_id: 'test_user_update',
        profile_data: {
          email: 'update@example.com',
          display_name: 'Updated Name',
          first_name: 'Updated',
          last_name: 'Name'
        }
      };

      const response = await request(app)
        .post('/api/user-profiles/profile')
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'User profile updated successfully'
      });

      expect(response.body.user).toMatchObject({
        display_name: 'Updated Name',
        first_name: 'Updated'
      });
    });

    it('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/user-profiles/profile')
        .send({ user_id: 'test' }) // Missing profile_data
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Missing required fields: user_id and profile_data'
      });
    });
  });

  describe('Passenger Details API', () => {
    it('should require authentication for passenger details', async () => {
      const response = await request(app)
        .get('/api/passenger-details')
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'Authentication Required',
        code: 'OAUTH_LOGIN_REQUIRED'
      });

      expect(response.body.oauth).toMatchObject({
        message: 'Passenger details require user authentication',
        loginUrl: expect.stringContaining('/api/oauth/authorize')
      });
    });

    it('should handle OPTIONS preflight request', async () => {
      await request(app)
        .options('/api/passenger-details')
        .expect(200);
    });
  });

  describe('ChatGPT API', () => {
    it('should parse flight booking intent', async () => {
      const message = 'I want to book a flight from New York to Los Angeles on September 15th for 1 adult in economy class.';
      
      const response = await request(app)
        .post('/api/chatgpt')
        .send({
          message,
          userId: 'test_user_intent'
        })
        .expect(200);

      expect(response.body).toHaveProperty('intent');
      expect(response.body.intent).toMatchObject({
        type: 'flight_booking',
        from: 'New York',
        to: 'Los Angeles',
        date: '2025-09-15',
        passengers: 1,
        class: 'economy'
      });
    });

    it('should handle empty or invalid messages', async () => {
      const response = await request(app)
        .post('/api/chatgpt')
        .send({
          message: '',
          userId: 'test_user_empty'
        })
        .expect(200);

      // Should still return a response, possibly with fallback data
      expect(response.body).toHaveProperty('intent');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent endpoints', async () => {
      await request(app)
        .get('/api/non-existent')
        .expect(404);
    });

    it('should handle malformed JSON gracefully', async () => {
      await request(app)
        .post('/api/user-profiles/profile')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);
    });
  });
});
