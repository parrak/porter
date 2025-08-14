-- PostgreSQL Database Schema for Porter Travel User Profiles
-- This schema captures comprehensive user data for personalized travel experiences

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table - Core user information
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    date_of_birth DATE,
    profile_picture_url TEXT,
    timezone VARCHAR(50) DEFAULT 'UTC',
    language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    phone_verified BOOLEAN DEFAULT false
);

-- User authentication and sessions
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true
);

-- User preferences - Flexible JSON storage for travel preferences
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL, -- 'travel_style', 'accommodation', 'transportation', 'dining', 'activities'
    preferences JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, category)
);

-- Travel history and patterns
CREATE TABLE travel_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    trip_type VARCHAR(50), -- 'business', 'leisure', 'family', 'romantic', 'adventure'
    destination_country VARCHAR(100),
    destination_city VARCHAR(100),
    destination_airport VARCHAR(10),
    departure_date DATE,
    return_date DATE,
    duration_days INTEGER,
    total_cost DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    accommodation_type VARCHAR(50), -- 'hotel', 'airbnb', 'hostel', 'resort'
    transportation_type VARCHAR(50), -- 'flight', 'train', 'car', 'bus'
    travel_class VARCHAR(20), -- 'economy', 'business', 'first'
    companions_count INTEGER DEFAULT 1,
    companions_type VARCHAR(50), -- 'solo', 'couple', 'family', 'friends', 'colleagues'
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User interactions and behavior tracking
CREATE TABLE user_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES user_sessions(id) ON DELETE SET NULL,
    interaction_type VARCHAR(100) NOT NULL, -- 'flight_search', 'hotel_search', 'booking', 'preference_update', 'feedback'
    interaction_data JSONB NOT NULL DEFAULT '{}',
    search_query TEXT,
    search_results_count INTEGER,
    selected_option JSONB,
    time_spent_seconds INTEGER,
    interaction_path TEXT[], -- Array of pages/actions taken
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Saved searches and favorites
CREATE TABLE saved_searches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    search_name VARCHAR(255),
    search_type VARCHAR(50), -- 'flight', 'hotel', 'package', 'car'
    search_criteria JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE user_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    favorite_type VARCHAR(50), -- 'destination', 'airline', 'hotel_chain', 'route'
    favorite_data JSONB NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User feedback and ratings
CREATE TABLE user_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    feedback_type VARCHAR(50), -- 'search_experience', 'booking_process', 'customer_service', 'app_usage'
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback_text TEXT,
    category VARCHAR(100), -- 'usability', 'performance', 'accuracy', 'support'
    tags TEXT[], -- Array of tags for categorization
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User goals and travel plans
CREATE TABLE user_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    goal_type VARCHAR(50), -- 'bucket_list', 'annual_travel', 'business_travel', 'family_trips'
    title VARCHAR(255) NOT NULL,
    description TEXT,
    target_date DATE,
    destination VARCHAR(255),
    estimated_budget DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    priority INTEGER CHECK (priority >= 1 AND priority <= 5),
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User communication preferences
CREATE TABLE user_communication_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    email_notifications BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT false,
    push_notifications BOOLEAN DEFAULT true,
    marketing_emails BOOLEAN DEFAULT false,
    price_alerts BOOLEAN DEFAULT true,
    travel_reminders BOOLEAN DEFAULT true,
    newsletter BOOLEAN DEFAULT false,
    frequency VARCHAR(20) DEFAULT 'daily', -- 'immediate', 'daily', 'weekly', 'monthly'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Passenger details for quick reuse
CREATE TABLE passenger_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    passenger_type VARCHAR(20) NOT NULL, -- 'adult', 'child', 'infant'
    title VARCHAR(10), -- 'Mr', 'Ms', 'Dr', etc.
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    document_type VARCHAR(50), -- 'passport', 'national_id', 'drivers_license'
    document_number VARCHAR(100),
    document_expiry_date DATE,
    nationality VARCHAR(100),
    is_primary_passenger BOOLEAN DEFAULT false, -- For the main user
    is_favorite BOOLEAN DEFAULT false, -- Mark as favorite for quick access
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_display_name ON users(display_name);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_user_preferences_category ON user_preferences(category);
CREATE INDEX idx_travel_history_user_id ON travel_history(user_id);
CREATE INDEX idx_travel_history_destination ON travel_history(destination_city, destination_country);
CREATE INDEX idx_travel_history_dates ON travel_history(departure_date, return_date);
CREATE INDEX idx_user_interactions_user_id ON user_interactions(user_id);
CREATE INDEX idx_user_interactions_type ON user_interactions(interaction_type);
CREATE INDEX idx_user_interactions_created_at ON user_interactions(created_at);
CREATE INDEX idx_saved_searches_user_id ON saved_searches(user_id);
CREATE INDEX idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX idx_user_goals_user_id ON user_goals(user_id);
CREATE INDEX idx_user_goals_status ON user_goals(status);
CREATE INDEX idx_passenger_details_user_id ON passenger_details(user_id);
CREATE INDEX idx_passenger_details_primary ON passenger_details(user_id, is_primary_passenger);
CREATE INDEX idx_passenger_details_favorite ON passenger_details(user_id, is_favorite);

-- JSONB indexes for efficient querying
CREATE INDEX idx_user_preferences_jsonb ON user_preferences USING GIN (preferences);
CREATE INDEX idx_user_interactions_jsonb ON user_interactions USING GIN (interaction_data);
CREATE INDEX idx_saved_searches_jsonb ON saved_searches USING GIN (search_criteria);
CREATE INDEX idx_user_favorites_jsonb ON user_favorites USING GIN (favorite_data);

-- Full-text search indexes
CREATE INDEX idx_users_search ON users USING GIN (to_tsvector('english', display_name || ' ' || first_name || ' ' || last_name));
CREATE INDEX idx_travel_history_search ON travel_history USING GIN (to_tsvector('english', destination_city || ' ' || destination_country || ' ' || COALESCE(notes, '')));

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_goals_updated_at BEFORE UPDATE ON user_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_communication_preferences_updated_at BEFORE UPDATE ON user_communication_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_passenger_details_updated_at BEFORE UPDATE ON passenger_details FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for common queries
CREATE VIEW user_profile_summary AS
SELECT 
    u.id,
    u.email,
    u.display_name,
    u.first_name,
    u.last_name,
    u.created_at,
    u.last_login_at,
    COUNT(DISTINCT th.id) as total_trips,
    COUNT(DISTINCT ss.id) as saved_searches_count,
    COUNT(DISTINCT uf.id) as favorites_count,
    AVG(th.rating) as average_trip_rating,
    MAX(th.created_at) as last_trip_date
FROM users u
LEFT JOIN travel_history th ON u.id = th.user_id
LEFT JOIN saved_searches ss ON u.id = ss.user_id
LEFT JOIN user_favorites uf ON u.id = uf.user_id
GROUP BY u.id, u.email, u.display_name, u.first_name, u.last_name, u.created_at, u.last_login_at;

-- Sample data insertion functions
CREATE OR REPLACE FUNCTION create_sample_user_preferences(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
    -- Travel style preferences
    INSERT INTO user_preferences (user_id, category, preferences) VALUES
    (user_uuid, 'travel_style', '{
        "preferred_seasons": ["spring", "fall"],
        "travel_pace": "relaxed",
        "adventure_level": "moderate",
        "cultural_interest": "high",
        "food_exploration": "very_high",
        "photography_focus": true,
        "solo_travel_comfort": "very_comfortable",
        "group_travel_preference": "small_groups"
    }');
    
    -- Accommodation preferences
    INSERT INTO user_preferences (user_id, category, preferences) VALUES
    (user_uuid, 'accommodation', '{
        "preferred_types": ["boutique_hotel", "airbnb"],
        "budget_range": "mid_range",
        "amenities": ["wifi", "breakfast", "air_conditioning", "private_bathroom"],
        "location_preference": "city_center",
        "quiet_level": "moderate",
        "eco_friendly": true,
        "pet_friendly": false
    }');
    
    -- Transportation preferences
    INSERT INTO user_preferences (user_id, category, preferences) VALUES
    (user_uuid, 'transportation', '{
        "preferred_airlines": ["delta", "united", "american"],
        "seat_preference": "aisle",
        "meal_preference": "vegetarian",
        "entertainment": "movies",
        "baggage_preference": "carry_on_only",
        "layover_tolerance": "max_2_hours",
        "red_eye_comfort": "comfortable"
    }');
    
    -- Dining preferences
    INSERT INTO user_preferences (user_id, category, preferences) VALUES
    (user_uuid, 'dining', '{
        "cuisine_preferences": ["italian", "japanese", "mediterranean", "indian"],
        "dietary_restrictions": ["vegetarian"],
        "meal_timing": "flexible",
        "reservation_preference": "advance_booking",
        "price_range": "mid_range",
        "atmosphere": ["casual", "romantic", "authentic_local"],
        "wine_preference": "red_wines"
    }');
    
    -- Activities preferences
    INSERT INTO user_preferences (user_id, category, preferences) VALUES
    (user_uuid, 'activities', '{
        "outdoor_activities": ["hiking", "swimming", "photography"],
        "cultural_activities": ["museums", "historical_sites", "local_markets"],
        "entertainment": ["live_music", "theater", "festivals"],
        "adventure_level": "moderate",
        "group_activities": "small_groups",
        "guided_tours": "mixed",
        "free_time_preference": "balanced"
    }');
END;
$$ LANGUAGE plpgsql;
