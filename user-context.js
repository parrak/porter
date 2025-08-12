// User Context Management Module
// Handles traveler profiles, booking history, and preference learning

const fs = require('fs').promises;
const path = require('path');

class UserContextManager {
    constructor() {
        this.dataDir = path.join(__dirname, 'user-data');
        this.profilesFile = path.join(this.dataDir, 'traveler-profiles.json');
        this.historyFile = path.join(this.dataDir, 'booking-history.json');
        this.conversationsFile = path.join(this.dataDir, 'conversation-context.json');
        this.preferencesFile = path.join(this.dataDir, 'user-preferences.json');
        
        this.ensureDataDirectory();
        this.loadData();
    }

    // Ensure data directory exists
    async ensureDataDirectory() {
        try {
            await fs.access(this.dataDir);
        } catch {
            await fs.mkdir(this.dataDir, { recursive: true });
        }
    }

    // Load all data from files
    async loadData() {
        try {
            this.travelerProfiles = await this.loadJsonFile(this.profilesFile, {});
            this.bookingHistory = await this.loadJsonFile(this.historyFile, []);
            this.conversationContext = await this.loadJsonFile(this.conversationsFile, {});
            this.userPreferences = await this.loadJsonFile(this.preferencesFile, {});
        } catch (error) {
            console.log('📁 Initializing new user context data...');
            this.travelerProfiles = {};
            this.bookingHistory = [];
            this.conversationContext = {};
            this.userPreferences = {};
        }
    }

    // Load JSON file with fallback
    async loadJsonFile(filePath, defaultValue) {
        try {
            const data = await fs.readFile(filePath, 'utf8');
            return JSON.parse(data);
        } catch {
            return defaultValue;
        }
    }

    // Save data to file
    async saveData() {
        try {
            await Promise.all([
                fs.writeFile(this.profilesFile, JSON.stringify(this.travelerProfiles, null, 2)),
                fs.writeFile(this.historyFile, JSON.stringify(this.bookingHistory, null, 2)),
                fs.writeFile(this.conversationsFile, JSON.stringify(this.conversationContext, null, 2)),
                fs.writeFile(this.preferencesFile, JSON.stringify(this.userPreferences, null, 2))
            ]);
        } catch (error) {
            console.error('❌ Error saving user context data:', error.message);
        }
    }

    // ===== TRAVELER PROFILE MANAGEMENT =====

    // Create or update a traveler profile
    async createTravelerProfile(userId, profileData) {
        const profile = {
            id: userId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            personalInfo: {
                firstName: profileData.firstName || '',
                lastName: profileData.lastName || '',
                dateOfBirth: profileData.dateOfBirth || '',
                gender: profileData.gender || '',
                nationality: profileData.nationality || 'US',
                email: profileData.email || '',
                phone: profileData.phone || ''
            },
            documents: profileData.documents || [],
            preferences: {
                seatPreference: profileData.seatPreference || 'AISLE',
                mealPreference: profileData.mealPreference || 'STANDARD',
                specialAssistance: profileData.specialAssistance || [],
                loyaltyPrograms: profileData.loyaltyPrograms || []
            },
            frequentRoutes: [],
            budgetPreferences: {
                preferredAirlines: [],
                maxBudget: null,
                preferredClass: 'ECONOMY'
            }
        };

        this.travelerProfiles[userId] = profile;
        await this.saveData();
        
        console.log(`✅ Created traveler profile for user: ${userId}`);
        return profile;
    }

    // Get traveler profile
    getTravelerProfile(userId) {
        return this.travelerProfiles[userId] || null;
    }

    // Update traveler profile
    async updateTravelerProfile(userId, updates) {
        if (!this.travelerProfiles[userId]) {
            throw new Error(`Traveler profile not found for user: ${userId}`);
        }

        const profile = this.travelerProfiles[userId];
        
        // Update fields
        if (updates.personalInfo) {
            profile.personalInfo = { ...profile.personalInfo, ...updates.personalInfo };
        }
        if (updates.documents) {
            profile.documents = updates.documents;
        }
        if (updates.preferences) {
            profile.preferences = { ...profile.preferences, ...updates.preferences };
        }
        if (updates.budgetPreferences) {
            profile.budgetPreferences = { ...profile.budgetPreferences, ...updates.budgetPreferences };
        }

        profile.updatedAt = new Date().toISOString();
        await this.saveData();
        
        console.log(`✅ Updated traveler profile for user: ${userId}`);
        return profile;
    }

    // ===== BOOKING HISTORY MANAGEMENT =====

    // Add booking to history
    async addBookingToHistory(bookingData) {
        const booking = {
            id: `booking_${Date.now()}`,
            timestamp: new Date().toISOString(),
            userId: bookingData.userId,
            flightDetails: {
                from: bookingData.from,
                to: bookingData.to,
                date: bookingData.date,
                airline: bookingData.airline,
                flightNumber: bookingData.flightNumber,
                class: bookingData.class,
                price: bookingData.price
            },
            passengerCount: bookingData.passengerCount,
            status: bookingData.status || 'CONFIRMED',
            preferences: bookingData.preferences || {},
            notes: bookingData.notes || ''
        };

        this.bookingHistory.push(booking);
        await this.saveData();
        
        // Update frequent routes
        await this.updateFrequentRoutes(bookingData.userId, bookingData.from, bookingData.to);
        
        console.log(`✅ Added booking to history: ${booking.id}`);
        return booking;
    }

    // Get booking history for user
    getUserBookingHistory(userId, limit = 10) {
        return this.bookingHistory
            .filter(booking => booking.userId === userId)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, limit);
    }

    // Get popular routes for user
    getUserPopularRoutes(userId) {
        const userBookings = this.bookingHistory.filter(booking => booking.userId === userId);
        const routeCounts = {};

        userBookings.forEach(booking => {
            const route = `${booking.flightDetails.from}-${booking.flightDetails.to}`;
            routeCounts[route] = (routeCounts[route] || 0) + 1;
        });

        return Object.entries(routeCounts)
            .map(([route, count]) => ({ route, count }))
            .sort((a, b) => b.count - a.count);
    }

    // Update frequent routes in profile
    async updateFrequentRoutes(userId, from, to) {
        if (!this.travelerProfiles[userId]) return;

        const profile = this.travelerProfiles[userId];
        const route = `${from}-${to}`;
        
        const existingRoute = profile.frequentRoutes.find(r => r.route === route);
        if (existingRoute) {
            existingRoute.count++;
            existingRoute.lastTraveled = new Date().toISOString();
        } else {
            profile.frequentRoutes.push({
                route,
                from,
                to,
                count: 1,
                firstTraveled: new Date().toISOString(),
                lastTraveled: new Date().toISOString()
            });
        }

        // Sort by frequency
        profile.frequentRoutes.sort((a, b) => b.count - a.count);
        
        // Keep only top 10 routes
        profile.frequentRoutes = profile.frequentRoutes.slice(0, 10);
        
        await this.saveData();
    }

    // ===== CONVERSATION CONTEXT MANAGEMENT =====

    // Store conversation context
    async storeConversationContext(userId, context) {
        if (!this.conversationContext[userId]) {
            this.conversationContext[userId] = [];
        }

        const conversationEntry = {
            timestamp: new Date().toISOString(),
            userInput: context.userInput,
            extractedIntent: context.extractedIntent,
            suggestedFlights: context.suggestedFlights || [],
            userResponse: context.userResponse || null,
            bookingDecision: context.bookingDecision || null,
            sessionId: context.sessionId || `session_${Date.now()}`
        };

        this.conversationContext[userId].push(conversationEntry);
        
        // Keep only last 50 conversations
        if (this.conversationContext[userId].length > 50) {
            this.conversationContext[userId] = this.conversationContext[userId].slice(-50);
        }

        await this.saveData();
        
        // Learn from conversation
        await this.learnFromConversation(userId, conversationEntry);
    }

    // Get recent conversation context
    getRecentConversationContext(userId, limit = 5) {
        if (!this.conversationContext[userId]) return [];
        
        return this.conversationContext[userId]
            .slice(-limit)
            .reverse();
    }

    // ===== PREFERENCE LEARNING =====

    // Learn from conversation and update preferences
    async learnFromConversation(userId, conversationEntry) {
        if (!this.travelerProfiles[userId]) return;

        const profile = this.travelerProfiles[userId];
        const intent = conversationEntry.extractedIntent;

        // Learn travel class preference
        if (intent.class && intent.class !== 'economy') {
            profile.budgetPreferences.preferredClass = intent.class.toUpperCase();
        }

        // Learn route preferences
        if (intent.from && intent.to) {
            await this.updateFrequentRoutes(userId, intent.from, intent.to);
        }

        // Learn budget preferences from price selection
        if (conversationEntry.bookingDecision && conversationEntry.suggestedFlights.length > 0) {
            const selectedFlight = conversationEntry.suggestedFlights.find(f => 
                f.id === conversationEntry.bookingDecision.flightId
            );
            
            if (selectedFlight && selectedFlight.price) {
                const price = parseFloat(selectedFlight.price.total);
                if (!profile.budgetPreferences.maxBudget || price < profile.budgetPreferences.maxBudget) {
                    profile.budgetPreferences.maxBudget = price;
                }
            }
        }

        // Learn airline preferences
        if (conversationEntry.bookingDecision && conversationEntry.suggestedFlights.length > 0) {
            const selectedFlight = conversationEntry.suggestedFlights.find(f => 
                f.id === conversationEntry.bookingDecision.flightId
            );
            
            if (selectedFlight && selectedFlight.validatingAirlineCodes) {
                const airline = selectedFlight.validatingAirlineCodes[0];
                if (!profile.budgetPreferences.preferredAirlines.includes(airline)) {
                    profile.budgetPreferences.preferredAirlines.push(airline);
                }
            }
        }

        await this.saveData();
    }

    // ===== SMART SUGGESTIONS =====

    // Generate smart suggestions based on user context
    generateSmartSuggestions(userId, currentQuery) {
        if (!this.travelerProfiles[userId]) return [];

        const profile = this.travelerProfiles[userId];
        const suggestions = [];

        // Suggest frequent routes
        if (profile.frequentRoutes.length > 0) {
            suggestions.push({
                type: 'frequent_route',
                title: 'Frequently Traveled Routes',
                items: profile.frequentRoutes.slice(0, 3).map(route => ({
                    text: `${route.from} → ${route.to}`,
                    action: `book flight from ${route.from} to ${route.to}`,
                    confidence: Math.min(0.9, 0.5 + (route.count * 0.1))
                }))
            });
        }

        // Suggest preferred travel class
        if (profile.budgetPreferences.preferredClass !== 'ECONOMY') {
            suggestions.push({
                type: 'travel_class',
                title: 'Preferred Travel Class',
                text: `You usually prefer ${profile.budgetPreferences.preferredClass.toLowerCase()} class`,
                action: `book ${profile.budgetPreferences.preferredClass.toLowerCase()} class flight`
            });
        }

        // Suggest based on budget
        if (profile.budgetPreferences.maxBudget) {
            suggestions.push({
                type: 'budget',
                title: 'Budget-Friendly Options',
                text: `Your typical budget is around $${profile.budgetPreferences.maxBudget}`,
                action: `find flights under $${profile.budgetPreferences.maxBudget}`
            });
        }

        // Suggest preferred airlines
        if (profile.budgetPreferences.preferredAirlines.length > 0) {
            suggestions.push({
                type: 'airline',
                title: 'Preferred Airlines',
                text: `You often fly with: ${profile.budgetPreferences.preferredAirlines.join(', ')}`,
                action: `find flights with ${profile.budgetPreferences.preferredAirlines[0]}`
            });
        }

        return suggestions;
    }

    // ===== UTILITY FUNCTIONS =====

    // Get user statistics
    getUserStats(userId) {
        const profile = this.travelerProfiles[userId];
        const bookings = this.getUserBookingHistory(userId);
        const routes = this.getUserPopularRoutes(userId);

        return {
            totalBookings: bookings.length,
            favoriteRoute: routes.length > 0 ? routes[0] : null,
            preferredClass: profile?.budgetPreferences?.preferredClass || 'ECONOMY',
            totalSpent: bookings.reduce((sum, b) => sum + (parseFloat(b.flightDetails.price?.total) || 0), 0),
            memberSince: profile?.createdAt || null,
            lastTravel: bookings.length > 0 ? bookings[0].timestamp : null
        };
    }

    // Export user data
    exportUserData(userId) {
        return {
            profile: this.getTravelerProfile(userId),
            history: this.getUserBookingHistory(userId, 1000),
            conversations: this.conversationContext[userId] || [],
            preferences: this.userPreferences[userId] || {},
            stats: this.getUserStats(userId)
        };
    }

    // Clear user data
    async clearUserData(userId) {
        delete this.travelerProfiles[userId];
        delete this.conversationContext[userId];
        delete this.userPreferences[userId];
        
        // Remove from booking history
        this.bookingHistory = this.bookingHistory.filter(booking => booking.userId !== userId);
        
        await this.saveData();
        console.log(`🗑️ Cleared all data for user: ${userId}`);
    }
}

// Export the class
module.exports = UserContextManager;
