const { executeQuery } = require('./database/connection');

// Demo script to showcase user profile persistence across sessions
async function demoUserProfileSystem() {
  console.log('🎭 Demo: User Profile System - Session Persistence\n');
  
  try {
    // Test database connection
    console.log('1️⃣ Testing database connection...');
    const connectionTest = await executeQuery('SELECT NOW()');
    console.log('✅ Database connected:', connectionTest.rows[0].now);
    
    // Create a demo user
    console.log('\n2️⃣ Creating demo user profile...');
    const demoUserId = `demo_user_${Date.now()}`;
    
    const userResult = await executeQuery(`
      INSERT INTO users (id, email, display_name, first_name, last_name, phone, timezone, language)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      demoUserId,
      'demo@portertravel.com',
      'Demo Traveler',
      'Demo',
      'Traveler',
      '+1234567890',
      'America/New_York',
      'en'
    ]);
    
    console.log('✅ Demo user created:', userResult.rows[0].display_name);
    
    // Create comprehensive user preferences
    console.log('\n3️⃣ Setting up user preferences...');
    
    const preferences = {
      travel_style: {
        preferred_seasons: ['spring', 'fall'],
        travel_pace: 'relaxed',
        adventure_level: 'moderate',
        cultural_interest: 'high',
        food_exploration: 'very_high',
        photography_focus: true,
        solo_travel_comfort: 'very_comfortable',
        group_travel_preference: 'small_groups'
      },
      accommodation: {
        preferred_types: ['boutique_hotel', 'airbnb'],
        budget_range: 'mid_range',
        amenities: ['wifi', 'breakfast', 'air_conditioning', 'private_bathroom'],
        location_preference: 'city_center',
        quiet_level: 'moderate',
        eco_friendly: true,
        pet_friendly: false
      },
      transportation: {
        preferred_airlines: ['delta', 'united', 'american'],
        seat_preference: 'aisle',
        meal_preference: 'vegetarian',
        entertainment: 'movies',
        baggage_preference: 'carry_on_only',
        layover_tolerance: 'max_2_hours',
        red_eye_comfort: 'comfortable'
      },
      dining: {
        cuisine_preferences: ['italian', 'japanese', 'mediterranean', 'indian'],
        dietary_restrictions: ['vegetarian'],
        meal_timing: 'flexible',
        reservation_preference: 'advance_booking',
        price_range: 'mid_range',
        atmosphere: ['casual', 'romantic', 'authentic_local'],
        wine_preference: 'red_wines'
      },
      activities: {
        outdoor_activities: ['hiking', 'swimming', 'photography'],
        cultural_activities: ['museums', 'historical_sites', 'local_markets'],
        entertainment: ['live_music', 'theater', 'festivals'],
        adventure_level: 'moderate',
        group_activities: 'small_groups',
        guided_tours: 'mixed',
        free_time_preference: 'balanced'
      }
    };
    
    // Insert preferences
    for (const [category, prefs] of Object.entries(preferences)) {
      await executeQuery(`
        INSERT INTO user_preferences (user_id, category, preferences)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, category)
        DO UPDATE SET preferences = $3
      `, [demoUserId, category, JSON.stringify(prefs)]);
    }
    
    console.log('✅ User preferences set for all categories');
    
    // Add some travel history
    console.log('\n4️⃣ Adding travel history...');
    
    const travelHistory = [
      {
        trip_type: 'leisure',
        destination_country: 'Italy',
        destination_city: 'Rome',
        departure_date: '2024-06-01',
        return_date: '2024-06-08',
        total_cost: 2500.00,
        currency: 'USD',
        accommodation_type: 'boutique_hotel',
        transportation_type: 'flight',
        travel_class: 'economy',
        companions_count: 2,
        companions_type: 'couple',
        rating: 5,
        notes: 'Amazing cultural experience! Loved the food and history.'
      },
      {
        trip_type: 'business',
        destination_country: 'Japan',
        destination_city: 'Tokyo',
        departure_date: '2024-03-15',
        return_date: '2024-03-20',
        total_cost: 3200.00,
        currency: 'USD',
        accommodation_type: 'hotel',
        transportation_type: 'flight',
        travel_class: 'business',
        companions_count: 1,
        companions_type: 'solo',
        rating: 4,
        notes: 'Great business trip. Very efficient and clean city.'
      },
      {
        trip_type: 'leisure',
        destination_country: 'Mexico',
        destination_city: 'Cancun',
        departure_date: '2024-01-10',
        return_date: '2024-01-17',
        total_cost: 1800.00,
        currency: 'USD',
        accommodation_type: 'resort',
        transportation_type: 'flight',
        travel_class: 'economy',
        companions_count: 4,
        companions_type: 'family',
        rating: 4,
        notes: 'Perfect family vacation. Beautiful beaches and great food.'
      }
    ];
    
    for (const trip of travelHistory) {
      await executeQuery(`
        INSERT INTO travel_history (
          user_id, trip_type, destination_country, destination_city,
          departure_date, return_date, total_cost, currency,
          accommodation_type, transportation_type, travel_class,
          companions_count, companions_type, rating, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `, [
        demoUserId, trip.trip_type, trip.destination_country, trip.destination_city,
        trip.departure_date, trip.return_date, trip.total_cost, trip.currency,
        trip.accommodation_type, trip.transportation_type, trip.travel_class,
        trip.companions_count, trip.companions_type, trip.rating, trip.notes
      ]);
    }
    
    console.log('✅ Travel history added (3 trips)');
    
    // Simulate user interactions across multiple sessions
    console.log('\n5️⃣ Simulating user interactions across sessions...');
    
    const interactions = [
      {
        type: 'flight_search',
        data: { origin: 'JFK', destination: 'LAX', dates: '2024-09-15' },
        query: 'JFK to LAX on September 15',
        time_spent: 45
      },
      {
        type: 'preference_update',
        data: { category: 'transportation', preference: 'seat_preference' },
        query: 'Updated seat preference to window',
        time_spent: 30
      },
      {
        type: 'hotel_search',
        data: { destination: 'Paris', dates: '2024-10-20', guests: 2 },
        query: 'Hotels in Paris for October 20',
        time_spent: 60
      }
    ];
    
    for (const interaction of interactions) {
      await executeQuery(`
        INSERT INTO user_interactions (user_id, interaction_type, interaction_data, search_query, time_spent_seconds)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        demoUserId, interaction.type, JSON.stringify(interaction.data), 
        interaction.query, interaction.time_spent
      ]);
    }
    
    console.log('✅ User interactions tracked');
    
    // Now demonstrate session persistence
    console.log('\n🎯 DEMONSTRATING SESSION PERSISTENCE\n');
    console.log('=' .repeat(50));
    
    // Simulate Session 1: User sets preferences
    console.log('\n📱 SESSION 1: User sets preferences');
    console.log('User completes onboarding and sets travel preferences...');
    
    // Simulate Session 2: User returns and searches
    console.log('\n🔄 SESSION 2: User returns (next day)');
    console.log('User searches for flights - system remembers preferences...');
    
    // Get user profile with all data
    const profileResult = await executeQuery(`
      SELECT * FROM user_profile_summary WHERE id = $1
    `, [demoUserId]);
    
    const preferencesResult = await executeQuery(`
      SELECT category, preferences FROM user_preferences WHERE user_id = $1
    `, [demoUserId]);
    
    const historyResult = await executeQuery(`
      SELECT * FROM travel_history WHERE user_id = $1 ORDER BY created_at DESC
    `, [demoUserId]);
    
    const interactionsResult = await executeQuery(`
      SELECT interaction_type, search_query, created_at FROM user_interactions 
      WHERE user_id = $1 ORDER BY created_at DESC
    `, [demoUserId]);
    
    console.log('\n📊 USER PROFILE DATA (Persisted across sessions):');
    console.log('• Name:', profileResult.rows[0].display_name);
    console.log('• Total trips:', profileResult.rows[0].total_trips);
    console.log('• Average rating:', profileResult.rows[0].average_trip_rating?.toFixed(1) || 'N/A');
    console.log('• Saved searches:', profileResult.rows[0].saved_searches_count);
    
    console.log('\n🎯 PREFERENCES (Remembered from Session 1):');
    const prefs = preferencesResult.rows.reduce((acc, row) => {
      acc[row.category] = row.preferences;
      return acc;
    }, {});
    
    console.log('• Travel style:', prefs.travel_style.travel_pace, 'pace,', prefs.travel_style.adventure_level, 'adventure');
    console.log('• Preferred seasons:', prefs.travel_style.preferred_seasons.join(', '));
    console.log('• Favorite airlines:', prefs.transportation.preferred_airlines.join(', '));
    console.log('• Seat preference:', prefs.transportation.seat_preference);
    console.log('• Cuisine preferences:', prefs.dining.cuisine_preferences.join(', '));
    
    console.log('\n✈️ TRAVEL HISTORY (Learning from past trips):');
    historyResult.rows.forEach((trip, index) => {
      console.log(`${index + 1}. ${trip.destination_city}, ${trip.destination_country} (${trip.trip_type}) - ${trip.rating}/5 stars`);
    });
    
    console.log('\n📱 INTERACTION PATTERNS (Behavior tracking):');
    interactionsResult.rows.forEach((interaction, index) => {
      console.log(`${index + 1}. ${interaction.interaction_type}: ${interaction.search_query}`);
    });
    
    // Simulate Session 3: Personalized recommendations
    console.log('\n🔄 SESSION 3: User gets personalized experience');
    console.log('System applies learned preferences automatically...');
    
    // Show how preferences would be applied to a new search
    console.log('\n🎯 HOW PREFERENCES ARE APPLIED TO NEW SEARCHES:');
    console.log('• Origin: JFK, Destination: Paris');
    console.log('• System automatically:');
    console.log('  - Prefers Delta/United/American airlines');
    console.log('  - Suggests boutique hotels or Airbnbs');
    console.log('  - Recommends Italian/Mediterranean restaurants');
    console.log('  - Avoids red-eye flights (user preference)');
    console.log('  - Considers spring/fall timing (favorite seasons)');
    
    // Clean up demo data
    console.log('\n🧹 Cleaning up demo data...');
    await executeQuery('DELETE FROM user_interactions WHERE user_id = $1', [demoUserId]);
    await executeQuery('DELETE FROM travel_history WHERE user_id = $1', [demoUserId]);
    await executeQuery('DELETE FROM user_preferences WHERE user_id = $1', [demoUserId]);
    await executeQuery('DELETE FROM users WHERE id = $1', [demoUserId]);
    console.log('✅ Demo data cleaned up');
    
    console.log('\n🎉 DEMO COMPLETED!');
    console.log('\n💡 KEY BENEFITS OF SESSION PERSISTENCE:');
    console.log('1. Users never lose their preferences');
    console.log('2. System learns and improves over time');
    console.log('3. Personalized experiences from day one');
    console.log('4. No need to re-enter information');
    console.log('5. Smart recommendations based on history');
    console.log('6. Seamless experience across devices');
    
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the demo if this file is executed directly
if (require.main === module) {
  demoUserProfileSystem().then(() => {
    console.log('\n🏁 Demo script finished');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Demo script crashed:', error);
    process.exit(1);
  });
}

module.exports = { demoUserProfileSystem };
