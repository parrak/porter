// Test script for User Context Management Module
require('dotenv').config();
const UserContextManager = require('./user-context');

async function testUserContext() {
    console.log('🧪 Testing User Context Management Module...\n');
    
    const contextManager = new UserContextManager();
    
    // Wait for data to load
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const userId = 'user_123';
    
    try {
        // ===== TEST 1: Create Traveler Profile =====
        console.log('📋 Test 1: Creating Traveler Profile');
        console.log('─'.repeat(50));
        
        const profileData = {
            firstName: 'John',
            lastName: 'Doe',
            dateOfBirth: '1990-05-15',
            gender: 'MALE',
            nationality: 'US',
            email: 'john.doe@example.com',
            phone: '+1-555-123-4567',
            seatPreference: 'WINDOW',
            mealPreference: 'VEGETARIAN',
            specialAssistance: ['WHEELCHAIR'],
            loyaltyPrograms: ['DELTA_SKYMILES', 'AMERICAN_AADVANTAGE']
        };
        
        const profile = await contextManager.createTravelerProfile(userId, profileData);
        console.log('✅ Profile created:', JSON.stringify(profile, null, 2));
        
        // ===== TEST 2: Add Booking History =====
        console.log('\n📚 Test 2: Adding Booking History');
        console.log('─'.repeat(50));
        
        const booking1 = {
            userId: userId,
            from: 'SEA',
            to: 'YVR',
            date: '2025-01-15',
            airline: 'WS',
            flightNumber: '6910',
            class: 'ECONOMY',
            price: { total: '281.32', currency: 'USD' },
            passengerCount: 1,
            preferences: { seatPreference: 'WINDOW' }
        };
        
        const booking2 = {
            userId: userId,
            from: 'YVR',
            to: 'SEA',
            date: '2025-01-20',
            airline: 'WS',
            flightNumber: '6911',
            class: 'ECONOMY',
            price: { total: '295.50', currency: 'USD' },
            passengerCount: 1,
            preferences: { seatPreference: 'WINDOW' }
        };
        
        const booking3 = {
            userId: userId,
            from: 'SEA',
            to: 'LAX',
            date: '2025-02-10',
            airline: 'AS',
            flightNumber: '1234',
            class: 'BUSINESS',
            price: { total: '450.00', currency: 'USD' },
            passengerCount: 1,
            preferences: { seatPreference: 'AISLE' }
        };
        
        await contextManager.addBookingToHistory(booking1);
        await contextManager.addBookingToHistory(booking2);
        await contextManager.addBookingToHistory(booking3);
        
        console.log('✅ Added 3 bookings to history');
        
        // ===== TEST 3: Store Conversation Context =====
        console.log('\n💬 Test 3: Storing Conversation Context');
        console.log('─'.repeat(50));
        
        const conversation1 = {
            userInput: 'I need a flight from Seattle to Vancouver',
            extractedIntent: {
                from: 'SEA',
                to: 'YVR',
                date: '2025-01-15',
                passengers: 1,
                class: 'economy'
            },
            suggestedFlights: [
                {
                    id: 'flight_1',
                    price: { total: '281.32' },
                    validatingAirlineCodes: ['WS']
                }
            ],
            userResponse: 'Yes, that looks good',
            bookingDecision: {
                flightId: 'flight_1',
                confirmed: true
            }
        };
        
        const conversation2 = {
            userInput: 'Book me a business class flight to LA',
            extractedIntent: {
                from: 'SEA',
                to: 'LAX',
                date: '2025-02-10',
                passengers: 1,
                class: 'business'
            },
            suggestedFlights: [
                {
                    id: 'flight_2',
                    price: { total: '450.00' },
                    validatingAirlineCodes: ['AS']
                }
            ],
            userResponse: 'Perfect, book it',
            bookingDecision: {
                flightId: 'flight_2',
                confirmed: true
            }
        };
        
        await contextManager.storeConversationContext(userId, conversation1);
        await contextManager.storeConversationContext(userId, conversation2);
        
        console.log('✅ Stored 2 conversation contexts');
        
        // ===== TEST 4: Generate Smart Suggestions =====
        console.log('\n🧠 Test 4: Generating Smart Suggestions');
        console.log('─'.repeat(50));
        
        const suggestions = contextManager.generateSmartSuggestions(userId, 'I need a flight');
        console.log('Smart Suggestions:', JSON.stringify(suggestions, null, 2));
        
        // ===== TEST 5: Get User Statistics =====
        console.log('\n📊 Test 5: User Statistics');
        console.log('─'.repeat(50));
        
        const stats = contextManager.getUserStats(userId);
        console.log('User Stats:', JSON.stringify(stats, null, 2));
        
        // ===== TEST 6: Get Recent Context =====
        console.log('\n🕒 Test 6: Recent Conversation Context');
        console.log('─'.repeat(50));
        
        const recentContext = contextManager.getRecentConversationContext(userId, 3);
        console.log('Recent Context:', JSON.stringify(recentContext, null, 2));
        
        // ===== TEST 7: Get Popular Routes =====
        console.log('\n🛫 Test 7: Popular Routes');
        console.log('─'.repeat(50));
        
        const popularRoutes = contextManager.getUserPopularRoutes(userId);
        console.log('Popular Routes:', JSON.stringify(popularRoutes, null, 2));
        
        // ===== TEST 8: Export User Data =====
        console.log('\n📤 Test 8: Export User Data');
        console.log('─'.repeat(50));
        
        const exportedData = contextManager.exportUserData(userId);
        console.log('Exported Data Keys:', Object.keys(exportedData));
        console.log('Profile Summary:', {
            name: `${exportedData.profile.personalInfo.firstName} ${exportedData.profile.personalInfo.lastName}`,
            totalBookings: exportedData.stats.totalBookings,
            preferredClass: exportedData.stats.preferredClass,
            totalSpent: exportedData.stats.totalSpent
        });
        
        // ===== TEST 9: Update Profile =====
        console.log('\n✏️ Test 9: Update Profile');
        console.log('─'.repeat(50));
        
        const updates = {
            preferences: {
                seatPreference: 'AISLE',
                mealPreference: 'STANDARD'
            },
            budgetPreferences: {
                maxBudget: 500.00,
                preferredClass: 'BUSINESS'
            }
        };
        
        const updatedProfile = await contextManager.updateTravelerProfile(userId, updates);
        console.log('✅ Profile updated:', JSON.stringify(updatedProfile, null, 2));
        
        // ===== TEST 10: Test Learning =====
        console.log('\n🎓 Test 10: Testing Learning Capabilities');
        console.log('─'.repeat(50));
        
        // Simulate a new conversation that should trigger learning
        const learningConversation = {
            userInput: 'Find me a first class flight to Tokyo',
            extractedIntent: {
                from: 'SEA',
                to: 'NRT',
                date: '2025-03-15',
                passengers: 1,
                class: 'first'
            },
            suggestedFlights: [
                {
                    id: 'flight_3',
                    price: { total: '1200.00' },
                    validatingAirlineCodes: ['JL']
                }
            ],
            userResponse: 'Book the first class option',
            bookingDecision: {
                flightId: 'flight_3',
                confirmed: true
            }
        };
        
        await contextManager.storeConversationContext(userId, learningConversation);
        
        // Check if preferences were learned
        const learnedProfile = contextManager.getTravelerProfile(userId);
        console.log('Learned Preferences:', {
            preferredClass: learnedProfile.budgetPreferences.preferredClass,
            preferredAirlines: learnedProfile.budgetPreferences.preferredAirlines,
            maxBudget: learnedProfile.budgetPreferences.maxBudget
        });
        
        console.log('\n🎉 All tests completed successfully!');
        console.log('📁 Check the user-data/ directory for saved files');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
    }
}

// Run the test
testUserContext();
