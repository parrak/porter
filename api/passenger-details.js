// Passenger Details Management API
const { generateRequestId, logTelemetry } = require('../utils/common');
const { executeQuery } = require('../database/connection');

module.exports = async (req, res) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  console.log(`[${requestId}] 👤 Passenger details request received: ${req.method} ${req.url}`);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    console.log(`[${requestId}] ✅ Preflight OPTIONS request handled`);
    res.status(200).end();
    return;
  }
  
  // OAuth Authentication Required
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log(`[${requestId}] ❌ Missing OAuth access token - redirecting to OAuth login`);
    return res.status(401).json({
      error: 'Authentication Required',
      message: 'Please log in to access passenger details',
      code: 'OAUTH_LOGIN_REQUIRED',
      oauth: {
        message: 'Passenger details require user authentication',
        loginUrl: 'https://porter-preview.vercel.app/api/oauth/authorize',
        scopes: ['profile'],
        description: 'You need to authorize this app to access your passenger details'
      }
    });
  }
  
  const accessToken = authHeader.substring(7);
  
  try {
    // Basic token validation (in production, validate against OAuth store)
    if (!accessToken || accessToken.length < 32) {
      throw new Error('Invalid token format');
    }
    
    // For demo purposes, extract user ID from token or use a default
    let userId = 'demo@example.com'; // In production, decode from JWT
    
    console.log(`[${requestId}] 👤 User ID: ${userId}`);
    
    if (req.method === 'GET') {
      // Retrieve passenger details
      await getPassengerDetails(req, res, userId, requestId);
    } else if (req.method === 'POST') {
      // Save new passenger details
      await savePassengerDetails(req, res, userId, requestId);
    } else if (req.method === 'PUT') {
      // Update existing passenger details
      await updatePassengerDetails(req, res, userId, requestId);
    } else if (req.method === 'DELETE') {
      // Delete passenger details
      await deletePassengerDetails(req, res, userId, requestId);
    } else {
      console.log(`[${requestId}] ❌ Method not allowed: ${req.method}`);
      res.status(405).json({ error: 'Method not allowed' });
    }
    
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error(`[${requestId}] ❌ Passenger details request failed after ${totalDuration}ms:`, error);
    
    logTelemetry('passenger_details_error', {
      requestId,
      success: false,
      duration: totalDuration,
      error: error.message,
      method: req.method
    });
    
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      requestId
    });
  }
};

// Get passenger details for a user
async function getPassengerDetails(req, res, userId, requestId) {
  try {
    console.log(`[${requestId}] 🔍 Retrieving passenger details for user: ${userId}`);
    
    // Get user ID from database
    const userResult = await executeQuery(
      'SELECT id FROM users WHERE email = $1',
      [userId],
      requestId
    );
    
    if (userResult.rows.length === 0) {
      console.log(`[${requestId}] ⚠️ User not found, creating new user profile`);
      // Create user if doesn't exist
      const newUserResult = await executeQuery(
        'INSERT INTO users (email, display_name) VALUES ($1, $2) RETURNING id',
        [userId, 'Demo User'],
        requestId
      );
      userId = newUserResult.rows[0].id;
    } else {
      userId = userResult.rows[0].id;
    }
    
    // Retrieve passenger details
    const passengerResult = await executeQuery(
      `SELECT 
        id, passenger_type, title, first_name, last_name, 
        date_of_birth, document_type, document_number, 
        document_expiry_date, nationality, is_primary_passenger, 
        is_favorite, notes, created_at, updated_at
       FROM passenger_details 
       WHERE user_id = $1 
       ORDER BY is_primary_passenger DESC, is_favorite DESC, created_at DESC`,
      [userId],
      requestId
    );
    
    const passengers = passengerResult.rows;
    console.log(`[${requestId}] ✅ Retrieved ${passengers.length} passenger details`);
    
    logTelemetry('passenger_details_retrieved', {
      requestId,
      success: true,
      passengerCount: passengers.length,
      userId: userId
    });
    
    res.status(200).json({
      success: true,
      passengers,
      count: passengers.length,
      requestId
    });
    
  } catch (error) {
    console.error(`[${requestId}] ❌ Failed to retrieve passenger details:`, error);
    throw error;
  }
}

// Save new passenger details
async function savePassengerDetails(req, res, userId, requestId) {
  try {
    const { 
      passenger_type, title, first_name, last_name, date_of_birth,
      document_type, document_number, document_expiry_date, nationality,
      is_primary_passenger, is_favorite, notes 
    } = req.body;
    
    console.log(`[${requestId}] 💾 Saving passenger details for: ${first_name} ${last_name}`);
    
    // Validate required fields
    if (!passenger_type || !first_name || !last_name) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'passenger_type, first_name, and last_name are required',
        required: ['passenger_type', 'first_name', 'last_name']
      });
    }
    
    // Get user ID from database
    const userResult = await executeQuery(
      'SELECT id FROM users WHERE email = $1',
      [userId],
      requestId
    );
    
    if (userResult.rows.length === 0) {
      // Create user if doesn't exist
      const newUserResult = await executeQuery(
        'INSERT INTO users (email, display_name) VALUES ($1, $2) RETURNING id',
        [userId, 'Demo User'],
        requestId
      );
      userId = newUserResult.rows[0].id;
    } else {
      userId = userResult.rows[0].id;
    }
    
    // Save passenger details
    const result = await executeQuery(
      `INSERT INTO passenger_details (
        user_id, passenger_type, title, first_name, last_name, 
        date_of_birth, document_type, document_number, 
        document_expiry_date, nationality, is_primary_passenger, 
        is_favorite, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id`,
      [
        userId, passenger_type, title, first_name, last_name,
        date_of_birth, document_type, document_number,
        document_expiry_date, nationality, 
        is_primary_passenger || false, is_favorite || false, notes
      ],
      requestId
    );
    
    const passengerId = result.rows[0].id;
    console.log(`[${requestId}] ✅ Passenger details saved with ID: ${passengerId}`);
    
    logTelemetry('passenger_details_saved', {
      requestId,
      success: true,
      passengerId,
      passengerType: passenger_type,
      userId: userId
    });
    
    res.status(201).json({
      success: true,
      message: 'Passenger details saved successfully',
      passengerId,
      requestId
    });
    
  } catch (error) {
    console.error(`[${requestId}] ❌ Failed to save passenger details:`, error);
    throw error;
  }
}

// Update existing passenger details
async function updatePassengerDetails(req, res, userId, requestId) {
  try {
    const { 
      passenger_id, passenger_type, title, first_name, last_name, 
      date_of_birth, document_type, document_number, 
      document_expiry_date, nationality, is_primary_passenger, 
      is_favorite, notes 
    } = req.body;
    
    if (!passenger_id) {
      return res.status(400).json({
        error: 'Missing passenger_id',
        message: 'passenger_id is required for updates'
      });
    }
    
    console.log(`[${requestId}] 🔄 Updating passenger details for ID: ${passenger_id}`);
    
    // Get user ID from database
    const userResult = await executeQuery(
      'SELECT id FROM users WHERE email = $1',
      [userId],
      requestId
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User profile does not exist'
      });
    }
    
    userId = userResult.rows[0].id;
    
    // Update passenger details
    const result = await executeQuery(
      `UPDATE passenger_details SET
        passenger_type = COALESCE($2, passenger_type),
        title = COALESCE($3, title),
        first_name = COALESCE($4, first_name),
        last_name = COALESCE($5, last_name),
        date_of_birth = COALESCE($6, date_of_birth),
        document_type = COALESCE($7, document_type),
        document_number = COALESCE($8, document_number),
        document_expiry_date = COALESCE($9, document_expiry_date),
        nationality = COALESCE($10, nationality),
        is_primary_passenger = COALESCE($11, is_primary_passenger),
        is_favorite = COALESCE($12, is_favorite),
        notes = COALESCE($13, notes),
        updated_at = NOW()
       WHERE id = $1 AND user_id = $14
       RETURNING id`,
      [
        passenger_id, passenger_type, title, first_name, last_name,
        date_of_birth, document_type, document_number,
        document_expiry_date, nationality, 
        is_primary_passenger, is_favorite, notes, userId
      ],
      requestId
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Passenger not found',
        message: 'Passenger details not found or you do not have permission to update them'
      });
    }
    
    console.log(`[${requestId}] ✅ Passenger details updated successfully`);
    
    logTelemetry('passenger_details_updated', {
      requestId,
      success: true,
      passengerId: passenger_id,
      userId: userId
    });
    
    res.status(200).json({
      success: true,
      message: 'Passenger details updated successfully',
      passengerId,
      requestId
    });
    
  } catch (error) {
    console.error(`[${requestId}] ❌ Failed to update passenger details:`, error);
    throw error;
  }
}

// Delete passenger details
async function deletePassengerDetails(req, res, userId, requestId) {
  try {
    const { passenger_id } = req.body;
    
    if (!passenger_id) {
      return res.status(400).json({
        error: 'Missing passenger_id',
        message: 'passenger_id is required for deletion'
      });
    }
    
    console.log(`[${requestId}] 🗑️ Deleting passenger details for ID: ${passenger_id}`);
    
    // Get user ID from database
    const userResult = await executeQuery(
      'SELECT id FROM users WHERE email = $1',
      [userId],
      requestId
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User profile does not exist'
      });
    }
    
    userId = userResult.rows[0].id;
    
    // Delete passenger details
    const result = await executeQuery(
      'DELETE FROM passenger_details WHERE id = $1 AND user_id = $2 RETURNING id',
      [passenger_id, userId],
      requestId
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Passenger not found',
        message: 'Passenger details not found or you do not have permission to delete them'
      });
    }
    
    console.log(`[${requestId}] ✅ Passenger details deleted successfully`);
    
    logTelemetry('passenger_details_deleted', {
      requestId,
      success: true,
      passengerId: passenger_id,
      userId: userId
    });
    
    res.status(200).json({
      success: true,
      message: 'Passenger details deleted successfully',
      passengerId,
      requestId
    });
    
  } catch (error) {
    console.error(`[${requestId}] ❌ Failed to delete passenger details:`, error);
    throw error;
  }
}
