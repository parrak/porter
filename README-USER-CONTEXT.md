# 🧠 User Context Management Module

## Overview

The User Context Management Module is a sophisticated system that transforms your flight booking agent from a simple tool into an intelligent, learning assistant. It remembers user preferences, learns from conversations, and provides personalized suggestions based on booking history.

## 🚀 Key Features

### 1. **Traveler Profile Management**
- **Personal Information**: Store names, contact details, dates of birth
- **Document Management**: Passport details, visa information
- **Preferences**: Seat preferences, meal choices, special assistance needs
- **Loyalty Programs**: Track frequent flyer memberships

### 2. **Intelligent Learning System**
- **Conversation Memory**: Remembers every interaction and decision
- **Preference Learning**: Automatically learns travel class, airline, and budget preferences
- **Route Analysis**: Identifies frequently traveled routes
- **Behavioral Patterns**: Understands user booking patterns over time

### 3. **Smart Suggestions Engine**
- **Frequent Routes**: Suggests commonly traveled destinations
- **Preferred Airlines**: Recommends airlines based on past choices
- **Budget Optimization**: Suggests flights within typical spending range
- **Travel Class**: Remembers preferred cabin class

### 4. **Comprehensive Data Storage**
- **Persistent Storage**: All data saved to JSON files
- **Data Export**: Full user data export capabilities
- **Privacy Controls**: User data deletion options
- **Backup Ready**: Easy to backup and restore

## 📁 File Structure

```
porter/
├── user-context.js           # Main context management module
├── main-with-context.js      # Enhanced main application
├── test-user-context.js      # Test script for the module
├── user-data/                # Data storage directory
│   ├── traveler-profiles.json
│   ├── booking-history.json
│   ├── conversation-context.json
│   └── user-preferences.json
└── README-USER-CONTEXT.md    # This file
```

## 🛠️ Installation & Setup

### 1. **Install Dependencies**
```bash
npm install
```

### 2. **Configure Environment Variables**
Create a `.env` file with:
```env
OPENAI_API_KEY=your_openai_api_key
AMADEUS_CLIENT_ID=your_amadeus_client_id
AMADEUS_CLIENT_SECRET=your_amadeus_client_secret
```

### 3. **Run Tests**
```bash
# Test the user context module
node test-user-context.js

# Test the enhanced main application
node main-with-context.js
```

## 📊 How It Works

### **Profile Creation Flow**
```
User Input → Profile Questions → Profile Creation → Data Storage
```

### **Learning Process**
```
Conversation → Intent Extraction → Decision Recording → Preference Update
```

### **Suggestion Generation**
```
User Query → Context Analysis → Pattern Recognition → Smart Suggestions
```

## 🔧 API Reference

### **UserContextManager Class**

#### **Constructor**
```javascript
const contextManager = new UserContextManager();
```

#### **Profile Management**
```javascript
// Create profile
await contextManager.createTravelerProfile(userId, profileData);

// Get profile
const profile = contextManager.getTravelerProfile(userId);

// Update profile
await contextManager.updateTravelerProfile(userId, updates);
```

#### **Booking History**
```javascript
// Add booking
await contextManager.addBookingToHistory(bookingData);

// Get history
const history = contextManager.getUserBookingHistory(userId, limit);

// Get popular routes
const routes = contextManager.getUserPopularRoutes(userId);
```

#### **Conversation Context**
```javascript
// Store context
await contextManager.storeConversationContext(userId, context);

// Get recent context
const recent = contextManager.getRecentConversationContext(userId, limit);
```

#### **Smart Suggestions**
```javascript
// Generate suggestions
const suggestions = contextManager.generateSmartSuggestions(userId, query);

// Get user stats
const stats = contextManager.getUserStats(userId);
```

## 🎯 Use Cases

### **1. First-Time User**
- Creates comprehensive profile
- Learns initial preferences
- Builds first booking history

### **2. Returning User**
- Welcomes back with personalized greeting
- Shows booking statistics
- Suggests frequent routes

### **3. Preference Learning**
- Remembers travel class choices
- Learns airline preferences
- Adapts to budget patterns

### **4. Smart Recommendations**
- Suggests routes based on frequency
- Recommends airlines based on history
- Optimizes for budget preferences

## 🔍 Data Schema

### **Traveler Profile**
```json
{
  "id": "user_123",
  "createdAt": "2025-08-12T10:00:00.000Z",
  "updatedAt": "2025-08-12T10:00:00.000Z",
  "personalInfo": {
    "firstName": "John",
    "lastName": "Doe",
    "dateOfBirth": "1990-05-15",
    "gender": "MALE",
    "nationality": "US",
    "email": "john.doe@example.com",
    "phone": "+1-555-123-4567"
  },
  "documents": [],
  "preferences": {
    "seatPreference": "WINDOW",
    "mealPreference": "VEGETARIAN",
    "specialAssistance": [],
    "loyaltyPrograms": []
  },
  "frequentRoutes": [],
  "budgetPreferences": {
    "preferredAirlines": [],
    "maxBudget": null,
    "preferredClass": "ECONOMY"
  }
}
```

### **Booking History**
```json
{
  "id": "booking_1234567890",
  "timestamp": "2025-08-12T10:00:00.000Z",
  "userId": "user_123",
  "flightDetails": {
    "from": "SEA",
    "to": "YVR",
    "date": "2025-01-15",
    "airline": "WS",
    "flightNumber": "6910",
    "class": "ECONOMY",
    "price": { "total": "281.32", "currency": "USD" }
  },
  "passengerCount": 1,
  "status": "CONFIRMED",
  "preferences": {},
  "notes": ""
}
```

### **Conversation Context**
```json
{
  "timestamp": "2025-08-12T10:00:00.000Z",
  "userInput": "I need a flight from Seattle to Vancouver",
  "extractedIntent": {
    "from": "SEA",
    "to": "YVR",
    "date": "2025-01-15",
    "passengers": 1,
    "class": "economy"
  },
  "suggestedFlights": [],
  "userResponse": "Yes, that looks good",
  "bookingDecision": {
    "flightId": "flight_1",
    "confirmed": true
  },
  "sessionId": "session_1234567890"
}
```

## 🧪 Testing

### **Run All Tests**
```bash
node test-user-context.js
```

### **Test Individual Components**
```javascript
// Test profile creation
const profile = await contextManager.createTravelerProfile(userId, profileData);

// Test booking history
await contextManager.addBookingToHistory(bookingData);

// Test conversation context
await contextManager.storeConversationContext(userId, context);

// Test smart suggestions
const suggestions = contextManager.generateSmartSuggestions(userId, query);
```

## 🔒 Privacy & Security

### **Data Storage**
- All data stored locally in JSON files
- No external data transmission
- User data isolated by user ID

### **Data Management**
- User can export their data
- User can delete their data
- No data sharing with third parties

### **Compliance**
- GDPR compliant data handling
- User consent for data collection
- Right to be forgotten

## 🚀 Production Deployment

### **1. Database Integration**
Replace file storage with:
- PostgreSQL for user profiles
- Redis for conversation context
- MongoDB for booking history

### **2. Authentication**
Integrate with:
- JWT tokens
- OAuth providers
- Multi-factor authentication

### **3. Scaling**
- Horizontal scaling with load balancers
- Database sharding by user ID
- Caching with Redis

### **4. Monitoring**
- User engagement metrics
- Learning algorithm performance
- Suggestion accuracy tracking

## 🔮 Future Enhancements

### **1. Advanced Learning**
- Machine learning for preference prediction
- Seasonal travel pattern recognition
- Price sensitivity analysis

### **2. Integration Features**
- Calendar integration
- Email notifications
- Mobile app support

### **3. Social Features**
- Travel group coordination
- Shared preferences
- Collaborative booking

### **4. AI Enhancements**
- Natural language understanding
- Sentiment analysis
- Proactive suggestions

## 📞 Support & Contributing

### **Issues**
Report bugs and feature requests in the project repository.

### **Contributing**
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

### **Documentation**
- API documentation
- Integration guides
- Best practices

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**🎉 Congratulations!** You now have a fully intelligent, learning flight booking system that remembers user preferences and provides personalized experiences.
