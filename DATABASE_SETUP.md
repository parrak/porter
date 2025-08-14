# 🗄️ PostgreSQL Database Setup Guide

## Prerequisites

1. **PostgreSQL installed and running** on your system
2. **Node.js and npm** installed
3. **Git** for version control

## 🚀 Quick Setup (Recommended)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Create .env file
Create a `.env` file in the root directory with your database credentials:

```env
# Database Configuration
DB_USER=postgres
DB_HOST=localhost
DB_NAME=porter_travel
DB_PASSWORD=your_actual_password
DB_PORT=5432

# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Amadeus API Configuration
AMADEUS_CLIENT_ID=your_amadeus_client_id_here
AMADEUS_CLIENT_SECRET=your_amadeus_client_secret_here

# Server Configuration
PORT=3000
NODE_ENV=development

# OAuth 2.0 Configuration
OAUTH_CLIENT_ID=porter-flight-booking
OAUTH_CLIENT_SECRET=your_oauth_client_secret_here
OAUTH_REDIRECT_URI=https://chatgpt.com/aip/{g-YOUR-GPT-ID-HERE}/oauth/callback
OAUTH_AUTHORIZATION_URL=https://porter-preview.vercel.app/api/oauth/authorize
OAUTH_TOKEN_URL=https://porter-preview.vercel.app/api/oauth/token

# API Configuration
API_BASE_URL=https://porter-preview.vercel.app
API_HEALTH_URL=https://porter-preview.vercel.app/api/health
API_OPENAPI_URL=https://porter-preview.vercel.app/api/openapi
DEPLOYMENT_URL=porter-preview.vercel.app
```

### Step 3: Setup Database
```bash
npm run setup-db
```

This will:
- Create the `porter_travel` database
- Create all required tables
- Insert sample data
- Set up indexes and triggers

### Step 4: Test Database
```bash
npm run test-db
```

## 🔧 Manual Setup (Alternative)

### Step 1: Create Database
```sql
CREATE DATABASE porter_travel;
```

### Step 2: Run Schema
```bash
psql -d porter_travel -f database/schema.sql
```

### Step 3: Test Connection
```bash
node quick-db-test.js
```

## 📊 Database Schema Overview

The database includes these main tables:

- **`users`** - Core user information
- **`user_preferences`** - Flexible JSONB storage for travel preferences
- **`travel_history`** - Past trips and patterns
- **`user_interactions`** - Behavior tracking and analytics
- **`saved_searches`** - User's saved search criteria
- **`user_favorites`** - Liked destinations, airlines, etc.
- **`user_feedback`** - User ratings and comments
- **`user_goals`** - Travel goals and bucket lists

## 🧪 Testing User Profile Functionality

### Test 1: Basic Database Operations
```bash
npm run test-db
```

### Test 2: User Profile Demo
```bash
npm run demo-profile
```

### Test 3: API Endpoints
Test the user profile API endpoints:

```bash
# Create a user profile
curl -X POST http://localhost:3000/api/profile \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "display_name": "Test User",
    "first_name": "Test",
    "last_name": "User"
  }'

# Get user profile
curl http://localhost:3000/api/profile/test@example.com

# Update preferences
curl -X POST http://localhost:3000/api/preferences/test@example.com \
  -H "Content-Type: application/json" \
  -d '{
    "category": "travel_style",
    "preferences": {
      "seat_preference": "window",
      "meal_preference": "vegetarian"
    }
  }'
```

## 🚨 Troubleshooting

### Common Issues:

1. **Connection Refused**
   - Ensure PostgreSQL is running
   - Check if port 5432 is accessible

2. **Authentication Failed**
   - Verify username/password in .env
   - Check PostgreSQL authentication settings

3. **Database Not Found**
   - Run `npm run setup-db` to create database
   - Check DB_NAME in .env file

4. **Permission Denied**
   - Ensure PostgreSQL user has CREATE privileges
   - Check if user can create databases

### Debug Commands:

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Connect to PostgreSQL
psql -U postgres -h localhost

# List databases
\l

# List tables in porter_travel
\c porter_travel
\dt
```

## 🔄 Integration with Flight Search

Once the database is set up, the user profile system will automatically:

1. **Load user preferences** when searching flights
2. **Apply personalized filters** to search results
3. **Track user interactions** for analytics
4. **Store travel history** for recommendations
5. **Provide personalized responses** in ChatGPT integration

## 📈 Next Steps

After successful setup:

1. **Test the API endpoints** with sample data
2. **Integrate with flight search** to see personalization in action
3. **Test ChatGPT integration** with user context
4. **Monitor database performance** and optimize queries
5. **Add more user preference categories** as needed

## 🆘 Need Help?

If you encounter issues:

1. Check the error messages in the console
2. Verify your PostgreSQL installation
3. Ensure all environment variables are set correctly
4. Run the test scripts to isolate the problem
5. Check the database logs for detailed error information
