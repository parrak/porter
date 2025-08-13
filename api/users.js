// User Profile API endpoint for Vercel - enables user-aware Custom GPTs
module.exports = async (req, res) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  console.log(`[${requestId}] 👤 User profile request: ${req.method} ${req.url}`);
  
  // Set CORS headers to allow all origins
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    console.log(`[${requestId}] ✅ Preflight OPTIONS request handled`);
    res.status(200).end();
    return;
  }
  
  try {
    // Extract user identifier from URL path
    const userId = req.url.split('/').pop();
    
    if (!userId || userId === 'users') {
      console.log(`[${requestId}] ❌ No user ID provided`);
      return res.status(400).json({ 
        error: 'User ID is required',
        message: 'Please provide a user identifier (email, code, or ID)',
        requestId 
      });
    }
    
    console.log(`[${requestId}] 🔍 Looking up profile for user: ${userId}`);
    
    // Log profile lookup attempt
    logTelemetry('user_profile_lookup', {
      requestId,
      userId,
      method: req.method,
      success: true
    });
    
    if (req.method === 'GET') {
      // GET /api/users/{id} - Fetch user profile for personalization
      const userProfile = await getUserProfile(userId, requestId);
      
      if (!userProfile) {
        console.log(`[${requestId}] ❌ User profile not found: ${userId}`);
        return res.status(404).json({
          error: 'User not found',
          message: 'No profile found for this identifier. Please check your email/code or create a new profile.',
          requestId
        });
      }
      
      console.log(`[${requestId}] ✅ User profile retrieved successfully`);
      
      // Return minimal profile data for GPT personalization
      const response = {
        success: true,
        displayName: userProfile.displayName,
        role: userProfile.role || 'Traveler',
        preferences: userProfile.preferences || {
          tone: 'friendly',
          format: 'detailed',
          travelStyle: 'flexible'
        },
        recentContext: userProfile.recentContext || [
          'Flight search preferences saved',
          'Last searched: economy class',
          'Prefers direct flights when possible'
        ],
        requestId
      };
      
      const totalDuration = Date.now() - startTime;
      console.log(`[${requestId}] 🎉 Profile lookup completed in ${totalDuration}ms`);
      
      // Log successful profile retrieval
      logTelemetry('user_profile_retrieved', {
        requestId,
        userId,
        duration: totalDuration,
        hasPreferences: !!userProfile.preferences,
        hasRecentContext: !!userProfile.recentContext
      });
      
      res.status(200).json(response);
      
    } else if (req.method === 'POST') {
      // POST /api/users/{id}/preferences - Update user preferences with consent
      const { preferences, recentContext, consent } = req.body;
      
      if (!consent) {
        console.log(`[${requestId}] ❌ No consent provided for preference update`);
        return res.status(400).json({
          error: 'Consent required',
          message: 'Explicit consent is required to save preferences. Please confirm you want to save this data.',
          requestId
        });
      }
      
      console.log(`[${requestId}] 💾 Updating preferences for user: ${userId}`);
      
      const updatedProfile = await updateUserProfile(userId, { preferences, recentContext }, requestId);
      
      if (!updatedProfile) {
        console.log(`[${requestId}] ❌ Failed to update user profile: ${userId}`);
        return res.status(500).json({
          error: 'Update failed',
          message: 'Failed to save preferences. Please try again.',
          requestId
        });
      }
      
      console.log(`[${requestId}] ✅ User preferences updated successfully`);
      
      const response = {
        success: true,
        message: 'Preferences saved successfully',
        updatedAt: new Date().toISOString(),
        requestId
      };
      
      const totalDuration = Date.now() - startTime;
      console.log(`[${requestId}] 🎉 Preference update completed in ${totalDuration}ms`);
      
      // Log successful preference update
      logTelemetry('user_preferences_updated', {
        requestId,
        userId,
        duration: totalDuration,
        preferencesUpdated: Object.keys(preferences || {}).length,
        hasRecentContext: !!recentContext
      });
      
      res.status(200).json(response);
      
    } else {
      console.log(`[${requestId}] ❌ Method not allowed: ${req.method}`);
      return res.status(405).json({ 
        error: 'Method not allowed',
        message: 'Only GET and POST methods are supported',
        requestId 
      });
    }
    
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error(`[${requestId}] ❌ User profile request failed after ${totalDuration}ms:`, error);
    
    // Log error telemetry
    logTelemetry('user_profile_error', {
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

// Mock user profile storage (in production, use a real database)
const userProfiles = new Map();

// Initialize with some sample profiles
userProfiles.set('demo@example.com', {
  displayName: 'Demo User',
  role: 'Business Traveler',
  preferences: {
    tone: 'professional',
    format: 'concise',
    travelStyle: 'business',
    preferredAirlines: ['American Airlines', 'Delta'],
    seatPreference: 'aisle'
  },
  recentContext: [
      'Frequently travels JFK to LAX',
      'Prefers business class for long flights',
      'Books 2-3 weeks in advance',
      'Likes morning departures'
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

userProfiles.set('traveler123', {
  displayName: 'Adventure Seeker',
  role: 'Leisure Traveler',
  preferences: {
    tone: 'casual',
    format: 'detailed',
    travelStyle: 'adventure',
    preferredAirlines: ['Southwest', 'JetBlue'],
    seatPreference: 'window'
  },
  recentContext: [
      'Likes exploring new destinations',
      'Prefers budget-friendly options',
      'Flexible with travel dates',
      'Enjoys layovers for sightseeing'
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

// Get user profile by identifier
async function getUserProfile(userId, requestId) {
  console.log(`[${requestId}] 🔍 Looking up profile for: ${userId}`);
  
  // Check if it's an email
  if (userId.includes('@')) {
    return userProfiles.get(userId);
  }
  
  // Check if it's a code/ID
  return userProfiles.get(userId);
}

// Update user profile
async function updateUserProfile(userId, updates, requestId) {
  console.log(`[${requestId}] 💾 Updating profile for: ${userId}`);
  
  const existingProfile = userProfiles.get(userId);
  
  if (!existingProfile) {
    // Create new profile if it doesn't exist
    const newProfile = {
      displayName: updates.displayName || 'New User',
      role: updates.role || 'Traveler',
      preferences: updates.preferences || {},
      recentContext: updates.recentContext || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    userProfiles.set(userId, newProfile);
    console.log(`[${requestId}] ✅ Created new profile for: ${userId}`);
    return newProfile;
  }
  
  // Update existing profile
  const updatedProfile = {
    ...existingProfile,
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  userProfiles.set(userId, updatedProfile);
  console.log(`[${requestId}] ✅ Updated existing profile for: ${userId}`);
  return updatedProfile;
}

// Utility functions
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function logTelemetry(event, data) {
  const timestamp = new Date().toISOString();
  const telemetryData = {
    timestamp,
    event,
    ...data,
    environment: process.env.NODE_ENV || 'production',
    deployment: process.env.VERCEL_URL || 'local'
  };
  
  console.log(`[TELEMETRY] ${JSON.stringify(telemetryData)}`);
  
  // In production, you could send this to a logging service like:
  // - Vercel Analytics
  // - LogRocket
  // - Sentry
  // - Custom logging endpoint
}
