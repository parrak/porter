// Enhanced flight search with user profile integration
const { generateRequestId, logTelemetry } = require('../utils/common');
const { executeQuery } = require('../database/connection');
const { convertCurrency } = require('../utils/currency-converter');
const { searchFlights } = require('../flight-search');

module.exports = async (req, res) => {
  const requestId = generateRequestId();
  
  try {
    const { 
      origin, 
      destination, 
      departureDate, 
      returnDate, 
      adults, 
      travelClass,
      user_id // New parameter for user identification
    } = req.body;

    console.log(`[${requestId}] 🚀 Flight search request: ${origin} → ${destination} on ${departureDate} for user: ${user_id || 'anonymous'}`);

    // Validate required parameters
    if (!origin || !destination || !departureDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: origin, destination, departureDate'
      });
    }

    let userPreferences = null;
    let userProfile = null;
    let actualUserId = user_id; // Create a separate variable for the actual user ID

    // Load user profile and preferences if user_id is provided
    if (user_id) {
      try {
        // If user_id is an email address (string), look up the actual user ID first
        if (typeof user_id === 'string' && user_id.includes('@')) {
          const userResult = await executeQuery(`
            SELECT id FROM users WHERE email = $1
          `, [user_id]);
          
          if (userResult.rows.length > 0) {
            actualUserId = userResult.rows[0].id;
            console.log(`[${requestId}] 🔍 Found user ID ${actualUserId} for email ${user_id}`);
          } else {
            console.log(`[${requestId}] ⚠️ No user found for email ${user_id}, continuing without profile`);
            actualUserId = null;
          }
        }
        
        // Only proceed with profile loading if we have a valid user ID
        if (actualUserId && !isNaN(actualUserId)) {
          // Get user profile
          const profileResult = await executeQuery(`
            SELECT * FROM user_profile_summary WHERE id = $1
          `, [actualUserId]);
          
          if (profileResult.rows.length > 0) {
            userProfile = profileResult.rows[0];
            
            // Get user preferences
            const preferencesResult = await executeQuery(`
              SELECT category, preferences FROM user_preferences WHERE user_id = $1
            `, [actualUserId]);
            
            userPreferences = preferencesResult.rows.reduce((acc, row) => {
              acc[row.category] = row.preferences;
              return acc;
            }, {});
            
            console.log(`[${requestId}] ✅ User profile loaded: ${userProfile.display_name || userProfile.email}`);
          }
        }
      } catch (error) {
        console.log(`[${requestId}] ⚠️ Could not load user profile: ${error.message}`);
        // Continue without profile data
      }
    }

    // Build search parameters
    const searchParams = {
      originLocationCode: origin,
      destinationLocationCode: destination,
      departureDate: departureDate,
      returnDate: returnDate,
      adults: adults || 1,
      travelClass: travelClass || 'ECONOMY',
      max: 50
    };

    // Apply user preferences to search parameters
    if (userPreferences) {
      const enhancedParams = applyUserPreferencesToSearch(searchParams, userPreferences);
      Object.assign(searchParams, enhancedParams);
      console.log(`[${requestId}] 🎯 Enhanced search params with user preferences:`, enhancedParams);
    }

    // Perform flight search
    const searchStartTime = Date.now();
    const searchData = await searchFlights(searchParams);
    const searchDuration = Date.now() - searchStartTime;

    // Personalize results based on user preferences
    let personalizedFlights = searchData.flights || [];
    if (userPreferences && personalizedFlights.length > 0) {
      personalizedFlights = personalizeFlightResults(personalizedFlights, userPreferences);
    }

    // Convert prices to USD and add personalization info
    const enhancedFlights = await Promise.all(personalizedFlights.map(async (flight) => {
      let convertedPrice = flight.price;
      let originalPrice = flight.price;
      let originalCurrency = flight.currency || 'EUR';
      let exchangeRate = 1;

      // Convert price if it's in EUR
      if (originalCurrency === 'EUR') {
        try {
          convertedPrice = await convertCurrency(flight.price, 'EUR', 'USD');
          exchangeRate = convertedPrice / flight.price;
        } catch (error) {
          console.log(`[${requestId}] ⚠️ Currency conversion failed: ${error.message}`);
        }
      }

      return {
        ...flight,
        price: convertedPrice,
        originalPrice,
        originalCurrency,
        exchangeRate,
        currency: 'USD'
      };
    }));

    // Track this interaction if user is authenticated
    if (actualUserId) {
      try {
        await executeQuery(`
          INSERT INTO user_interactions (user_id, interaction_type, interaction_data, search_query, search_results_count)
          VALUES ($1, 'direct_flight_search', $2, $3, $4)
        `, [
          actualUserId, 
          JSON.stringify({ 
            origin, 
            destination, 
            departureDate, 
            returnDate, 
            adults, 
            travelClass,
            searchDuration,
            resultsCount: enhancedFlights.length
          }), 
          `${origin} to ${destination} on ${departureDate}`,
          enhancedFlights.length
        ]);
      } catch (error) {
        console.log(`[${requestId}] ⚠️ Could not track interaction: ${error.message}`);
      }
    }

    // Generate personalized response message
    const responseMessage = generatePersonalizedResponse(
      origin, 
      destination, 
      enhancedFlights, 
      userProfile, 
      userPreferences
    );

    const response = {
      success: true,
      message: responseMessage,
      requestId,
      flights: enhancedFlights,
      // Include complete Amadeus flight offers for booking
      // Frontend should use flightOffers[flightIndex] when sending to book-flight endpoint
      // This ensures all required Amadeus fields are preserved for successful booking
      flightOffers: searchData.flightOffers || [],
      searchParams,
      dataSource: searchData.dataSource || 'unknown',
      searchDuration,
      userProfile: userProfile ? {
        displayName: userProfile.display_name,
        preferences: userPreferences,
        totalTrips: userProfile.total_trips,
        averageRating: userProfile.average_trip_rating
      } : null
    };

    console.log(`[${requestId}] ✅ Flight search completed in ${searchDuration}ms, found ${enhancedFlights.length} flights`);
    return res.status(200).json(response);

  } catch (error) {
    console.error(`[${requestId}] ❌ Flight search error:`, error);
    return res.status(500).json({
      success: false,
      error: 'Flight search failed',
      details: error.message
    });
  }
};

// Apply user preferences to search parameters
function applyUserPreferencesToSearch(searchParams, userPreferences) {
  const enhanced = {};
  
  // Apply transportation preferences
  if (userPreferences.transportation) {
    const transport = userPreferences.transportation;
    
    // Prefer user's favorite airlines
    if (transport.preferred_airlines && transport.preferred_airlines.length > 0) {
      enhanced.preferredAirlines = transport.preferred_airlines;
    }
    
    // Apply layover tolerance
    if (transport.layover_tolerance) {
      if (transport.layover_tolerance === 'max_2_hours') {
        enhanced.maxLayovers = 1;
      } else if (transport.layover_tolerance === 'no_layovers') {
        enhanced.maxLayovers = 0;
      }
    }
    
    // Apply red-eye comfort
    if (transport.red_eye_comfort === 'avoid') {
      enhanced.avoidRedEye = true;
    }
  }
  
  // Apply travel style preferences
  if (userPreferences.travel_style) {
    const style = userPreferences.travel_style;
    
    // Adjust search based on travel pace
    if (style.travel_pace === 'relaxed') {
      enhanced.maxLayovers = Math.min(enhanced.maxLayovers || 2, 1);
    } else if (style.travel_pace === 'fast-paced') {
      enhanced.maxLayovers = 0;
    }
    
    // Consider adventure level for destination suggestions
    if (style.adventure_level === 'high' || style.adventure_level === 'extreme') {
      enhanced.adventureFriendly = true;
    }
  }
  
  // Apply accommodation preferences if searching for packages
  if (userPreferences.accommodation && searchParams.includeHotels) {
    const accommodation = userPreferences.accommodation;
    enhanced.hotelPreferences = {
      types: accommodation.preferred_types || [],
      budgetRange: accommodation.budget_range || 'mid_range',
      amenities: accommodation.amenities || []
    };
  }
  
  return enhanced;
}

// Personalize flight results based on user preferences
function personalizeFlightResults(flights, userPreferences) {
  return flights.map(flight => {
    let personalizationScore = 0;
    const personalizationFactors = [];
    
    // Score based on transportation preferences
    if (userPreferences.transportation) {
      const transport = userPreferences.transportation;
      
      // Airline preference scoring
      if (transport.preferred_airlines && flight.airline) {
        const airline = flight.airline.toLowerCase();
        if (transport.preferred_airlines.some(pref => 
          airline.includes(pref.toLowerCase())
        )) {
          personalizationScore += 20;
          personalizationFactors.push('preferred_airline');
        }
      }
      
      // Seat preference scoring
      if (transport.seat_preference && flight.availableSeats) {
        if (flight.availableSeats && flight.availableSeats.some(seat => 
          seat.type === transport.seat_preference
        )) {
          personalizationScore += 15;
          personalizationFactors.push('preferred_seat_available');
        }
      }
      
      // Red-eye avoidance scoring
      if (transport.red_eye_comfort === 'avoid' && flight.departureTime) {
        const hour = new Date(flight.departureTime).getHours();
        if (hour >= 6 && hour <= 22) { // Daytime flights
          personalizationScore += 10;
          personalizationFactors.push('daytime_flight');
        }
      }
    }
    
    // Score based on travel style
    if (userPreferences.travel_style) {
      const style = userPreferences.travel_style;
      
      // Time of day preferences
      if (style.travel_pace === 'relaxed' && flight.departureTime) {
        const hour = new Date(flight.departureTime).getHours();
        if (hour >= 9 && hour <= 17) { // Daytime flights
          personalizationScore += 10;
          personalizationFactors.push('daytime_flight');
        }
      }
      
      // Seasonal preferences
      if (style.preferred_seasons && flight.departureDate) {
        const month = new Date(flight.departureDate).getMonth();
        const season = getSeasonFromMonth(month);
        if (style.preferred_seasons.includes(season)) {
          personalizationScore += 15;
          personalizationFactors.push('preferred_season');
        }
      }
    }
    
    return {
      ...flight,
      personalizationScore,
      personalizationFactors,
      isPersonalized: personalizationScore > 0
    };
  }).sort((a, b) => b.personalizationScore - a.personalizationScore);
}

// Generate personalized response message
function generatePersonalizedResponse(origin, destination, flights, userProfile, userPreferences) {
  let message = `Found ${flights?.length || 0} flights from ${origin} to ${destination}`;
  
  if (userProfile && userPreferences) {
    message += '\n\n🎯 **Personalized for you:**';
    
    // Add personalized insights
    if (userPreferences.travel_style) {
      const style = userPreferences.travel_style;
      message += `\n• Based on your ${style.travel_pace || 'moderate'} travel pace preference`;
      
      if (style.preferred_seasons && style.preferred_seasons.length > 0) {
        message += `\n• Considering your favorite seasons: ${style.preferred_seasons.join(', ')}`;
      }
    }
    
    if (userPreferences.transportation) {
      const transport = userPreferences.transportation;
      if (transport.preferred_airlines && transport.preferred_airlines.length > 0) {
        message += `\n• Prioritizing your preferred airlines: ${transport.preferred_airlines.join(', ')}`;
      }
      
      if (transport.layover_tolerance) {
        message += `\n• Respecting your layover tolerance: ${transport.layover_tolerance}`;
      }
    }
    
    // Add user context
    if (userProfile.total_trips > 0) {
      message += `\n• Based on your ${userProfile.total_trips} previous trips`;
      if (userProfile.average_trip_rating && typeof userProfile.average_trip_rating === 'number') {
        message += ` (average rating: ${userProfile.average_trip_rating.toFixed(1)}/5)`;
      }
    }
    
    // Add personalized recommendations
    const personalizedFlights = flights?.filter(f => f.isPersonalized) || [];
    if (personalizedFlights.length > 0) {
      message += `\n• ${personalizedFlights.length} flights are specially matched to your preferences`;
    }
  }
  
  return message;
}

// Helper function to get season from month
function getSeasonFromMonth(month) {
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
}
