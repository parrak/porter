const { executeQuery, executeTransaction } = require('../database/connection');
const { generateRequestId } = require('../utils/common');

// Create or update user profile
async function createOrUpdateProfile(req, res) {
  const requestId = generateRequestId();
  const { user_id, profile_data } = req.body;
  
  console.log(`[${requestId}] 🚀 Creating/updating user profile for user: ${user_id}`);
  
  try {
    // Validate required fields
    if (!user_id || !profile_data) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: user_id and profile_data'
      });
    }

    const {
      email,
      display_name,
      first_name,
      last_name,
      phone,
      date_of_birth,
      profile_picture_url,
      timezone,
      language
    } = profile_data;

    // Check if user exists by email
    const existingUser = await executeQuery(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length === 0) {
      // Create new user - let the database generate the UUID
      const newUser = await executeQuery(`
        INSERT INTO users (email, display_name, first_name, last_name, phone, date_of_birth, profile_picture_url, timezone, language)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [email, display_name, first_name, last_name, phone, date_of_birth, profile_picture_url, timezone, language]);

      const newUserId = newUser.rows[0].id;
      console.log(`[${requestId}] ✅ New user created: ${newUserId}`);
      
      // Create default communication preferences
      await executeQuery(`
        INSERT INTO user_communication_preferences (user_id)
        VALUES ($1)
      `, [newUserId]);

      return res.status(201).json({
        success: true,
        message: 'User profile created successfully',
        user: newUser.rows[0]
      });
         } else {
       // Update existing user - use the existing user's ID
       const existingUserId = existingUser.rows[0].id;
       const updatedUser = await executeQuery(`
         UPDATE users 
         SET email = COALESCE($2, email),
             display_name = COALESCE($3, display_name),
             first_name = COALESCE($4, first_name),
             last_name = COALESCE($5, last_name),
             phone = COALESCE($6, phone),
             date_of_birth = COALESCE($7, date_of_birth),
             profile_picture_url = COALESCE($8, profile_picture_url),
             timezone = COALESCE($9, timezone),
             language = COALESCE($10, language),
             updated_at = NOW()
         WHERE id = $1
         RETURNING *
       `, [existingUserId, email, display_name, first_name, last_name, phone, date_of_birth, profile_picture_url, timezone, language]);

             console.log(`[${requestId}] ✅ User profile updated: ${existingUserId}`);
      
      return res.status(200).json({
        success: true,
        message: 'User profile updated successfully',
        user: updatedUser.rows[0]
      });
    }
  } catch (error) {
    console.error(`[${requestId}] ❌ Error creating/updating user profile:`, error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}

// Get user profile
async function getUserProfile(req, res) {
  const requestId = generateRequestId();
  const { user_id } = req.query;
  
  console.log(`[${requestId}] 📋 Getting user profile for user: ${user_id}`);
  
  try {
    // Get user profile directly from users table
    const profileResult = await executeQuery(`
      SELECT * FROM users WHERE id = $1
    `, [user_id]);

    if (profileResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User profile not found'
      });
    }

    // Get user preferences
    const preferencesResult = await executeQuery(`
      SELECT category, preferences FROM user_preferences WHERE user_id = $1
    `, [user_id]);

    // Get recent travel history
    const travelHistoryResult = await executeQuery(`
      SELECT * FROM travel_history 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT 5
    `, [user_id]);

    // Get recent interactions
    const interactionsResult = await executeQuery(`
      SELECT interaction_type, interaction_data, created_at 
      FROM user_interactions 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT 10
    `, [user_id]);

    const profile = profileResult.rows[0];
    const preferences = preferencesResult.rows.reduce((acc, row) => {
      acc[row.category] = row.preferences;
      return acc;
    }, {});
    const travelHistory = travelHistoryResult.rows;
    const recentInteractions = interactionsResult.rows;

    console.log(`[${requestId}] ✅ User profile retrieved successfully: ${user_id}`);
    
    return res.status(200).json({
      success: true,
      profile,
      preferences,
      travelHistory,
      recentInteractions
    });
  } catch (error) {
    console.error(`[${requestId}] ❌ Error getting user profile:`, error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}

// Update user preferences
async function updatePreferences(req, res) {
  const requestId = generateRequestId();
  const { user_id, category, preferences } = req.body;
  
  console.log(`[${requestId}] 🔧 Updating preferences for user: ${user_id}, category: ${category}`);
  
  try {
    if (!category || !preferences) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: category and preferences'
      });
    }

    // Upsert preferences
    const result = await executeQuery(`
      INSERT INTO user_preferences (user_id, category, preferences)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, category)
      DO UPDATE SET 
        preferences = $3,
        updated_at = NOW()
      RETURNING *
    `, [user_id, category, preferences]);

    // Track this interaction
    await executeQuery(`
      INSERT INTO user_interactions (user_id, interaction_type, interaction_data)
      VALUES ($1, 'preference_update', $2)
    `, [user_id, JSON.stringify({ category, preferences })]);

    console.log(`[${requestId}] ✅ Preferences updated successfully: ${user_id}`);
    
    return res.status(200).json({
      success: true,
      message: 'Preferences updated successfully',
      preference: result.rows[0]
    });
  } catch (error) {
    console.error(`[${requestId}] ❌ Error updating preferences:`, error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}

// Add travel history entry
async function addTravelHistory(req, res) {
  const requestId = generateRequestId();
  const { user_id, ...travelData } = req.body;
  
  console.log(`[${requestId}] ✈️ Adding travel history for user: ${user_id}`);
  
  try {
    const {
      trip_type,
      destination_country,
      destination_city,
      destination_airport,
      departure_date,
      return_date,
      duration_days,
      total_cost,
      currency,
      accommodation_type,
      transportation_type,
      travel_class,
      companions_count,
      companions_type,
      rating,
      notes
    } = travelData;

    const result = await executeQuery(`
      INSERT INTO travel_history (
        user_id, trip_type, destination_country, destination_city, destination_airport,
        departure_date, return_date, duration_days, total_cost, currency,
        accommodation_type, transportation_type, travel_class, companions_count,
        companions_type, rating, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `, [
      user_id, trip_type, destination_country, destination_city, destination_airport,
      departure_date, return_date, duration_days, total_cost, currency,
      accommodation_type, transportation_type, travel_class, companions_count,
      companions_type, rating, notes
    ]);

    // Track this interaction
    await executeQuery(`
      INSERT INTO user_interactions (user_id, interaction_type, interaction_data)
      VALUES ($1, 'travel_history_add', $2)
    `, [user_id, JSON.stringify({ trip_type, destination_city, destination_country })]);

    console.log(`[${requestId}] ✅ Travel history added successfully: ${user_id}`);
    
    return res.status(201).json({
      success: true,
      message: 'Travel history added successfully',
      travelEntry: result.rows[0]
    });
  } catch (error) {
    console.error(`[${requestId}] ❌ Error adding travel history:`, error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}

// Track user interaction
async function trackInteraction(req, res) {
  const requestId = generateRequestId();
  const { user_id, ...interactionData } = req.body;
  
  console.log(`[${requestId}] 📊 Tracking interaction for user: ${user_id}`);
  
  try {
    const {
      session_id,
      interaction_type,
      interaction_data,
      search_query,
      search_results_count,
      selected_option,
      time_spent_seconds,
      interaction_path
    } = interactionData;

    if (!interaction_type) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: interaction_type'
      });
    }

    const result = await executeQuery(`
      INSERT INTO user_interactions (
        user_id, session_id, interaction_type, interaction_data, search_query,
        search_results_count, selected_option, time_spent_seconds, interaction_path
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `, [
      user_id, session_id, interaction_type, interaction_data, search_query,
      search_results_count, selected_option, time_spent_seconds, interaction_path
    ]);

    console.log(`[${requestId}] ✅ Interaction tracked successfully: ${result.rows[0].id}`);
    
    return res.status(201).json({
      success: true,
      message: 'Interaction tracked successfully',
      interaction_id: result.rows[0].id
    });
  } catch (error) {
    console.error(`[${requestId}] ❌ Error tracking interaction:`, error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}

// Get user recommendations based on preferences and history
async function getUserRecommendations(req, res) {
  const requestId = generateRequestId();
  const { user_id } = req.query;
  
  console.log(`[${requestId}] 🎯 Getting recommendations for user: ${user_id}`);
  
  try {
    // Get user preferences
    const preferencesResult = await executeQuery(`
      SELECT category, preferences FROM user_preferences WHERE user_id = $1
    `, [user_id]);

    // Get travel history patterns
    const historyResult = await executeQuery(`
      SELECT 
        destination_country,
        destination_city,
        trip_type,
        travel_class,
        accommodation_type,
        COUNT(*) as visit_count,
        AVG(rating) as avg_rating
      FROM travel_history 
      WHERE user_id = $1 
      GROUP BY destination_country, destination_city, trip_type, travel_class, accommodation_type
      ORDER BY visit_count DESC, avg_rating DESC
      LIMIT 10
    `, [user_id]);

    // Get recent search patterns
    const searchPatternsResult = await executeQuery(`
      SELECT 
        interaction_data->>'search_query' as search_query,
        COUNT(*) as search_count
      FROM user_interactions 
      WHERE user_id = $1 AND interaction_type = 'flight_search'
      GROUP BY interaction_data->>'search_query'
      ORDER BY search_count DESC
      LIMIT 5
    `, [user_id]);

    const preferences = preferencesResult.rows.reduce((acc, row) => {
      acc[row.category] = row.preferences;
      return acc;
    }, {});
    const travelPatterns = historyResult.rows;
    const searchPatterns = searchPatternsResult.rows;

    // Generate recommendations based on patterns
    const recommendations = {
      destinations: travelPatterns.slice(0, 3).map(pattern => ({
        type: 'favorite_destination',
        destination: `${pattern.destination_city}, ${pattern.destination_country}`,
        reason: `Visited ${pattern.visit_count} times with ${pattern.avg_rating.toFixed(1)}/5 rating`,
        confidence: Math.min(pattern.visit_count * 0.3 + pattern.avg_rating * 0.2, 1.0)
      })),
      travel_style: preferences.travel_style ? {
        type: 'travel_style_insight',
        insights: [
          `You prefer ${preferences.travel_style.travel_pace || 'moderate'} paced travel`,
          `Adventure level: ${preferences.travel_style.adventure_level || 'moderate'}`,
          `Cultural interest: ${preferences.travel_style.cultural_interest || 'moderate'}`
        ]
      } : null,
      accommodation: preferences.accommodation ? {
        type: 'accommodation_preference',
        preferred_types: preferences.accommodation.preferred_types || [],
        budget_range: preferences.accommodation.budget_range || 'flexible'
      } : null,
      seasonal_preferences: preferences.travel_style?.preferred_seasons ? {
        type: 'seasonal_recommendation',
        seasons: preferences.travel_style.preferred_seasons,
        reason: 'Based on your travel history and preferences'
      } : null
    };

    console.log(`[${requestId}] ✅ Recommendations generated successfully: ${user_id}`);
    
    return res.status(200).json({
      success: true,
      recommendations,
      preferences,
      travelPatterns,
      searchPatterns
    });
  } catch (error) {
    console.error(`[${requestId}] ❌ Error getting recommendations:`, error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}

// Main handler function
module.exports = async (req, res) => {
  const { method } = req;
  const path = req.url.split('?')[0];
  const endpoint = path.split('/').pop();

  try {
    switch (method) {
      case 'POST':
        if (endpoint === 'profile') {
          return await createOrUpdateProfile(req, res);
        } else if (endpoint === 'preferences') {
          return await updatePreferences(req, res);
        } else if (endpoint === 'travel-history') {
          return await addTravelHistory(req, res);
        } else if (endpoint === 'interaction') {
          return await trackInteraction(req, res);
        } else {
          return res.status(404).json({ error: 'Endpoint not found' });
        }
        break;

      case 'GET':
        if (endpoint === 'profile') {
          return await getUserProfile(req, res);
        } else if (endpoint === 'recommendations') {
          return await getUserRecommendations(req, res);
        } else {
          return res.status(404).json({ error: 'Endpoint not found' });
        }
        break;

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in user profiles API:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};
