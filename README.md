# 🚀 Real Flight Booking Agent

A sophisticated flight booking application that uses **ChatGPT** for natural language processing and **Amadeus API** for real flight data and booking capabilities.

## ✨ Features

- **Natural Language Processing**: Ask for flights in plain English
- **Real Flight Data**: Search actual flights using Amadeus API
- **Real Booking**: Actually book flights through the system
- **Smart Intent Extraction**: ChatGPT understands complex requests
- **Multiple Travel Classes**: Economy, Business, and First Class
- **Passenger Management**: Handle multiple passengers
- **Real-time Pricing**: Live pricing and availability

## 🛠️ Prerequisites

Before running this application, you need:

1. **OpenAI API Key** - For ChatGPT integration
2. **Amadeus API Credentials** - For real flight data and booking
3. **Node.js** (v14 or higher)

## 🔑 Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure API Keys

Copy the environment template and add your API keys:

```bash
cp env-template.txt .env
```

Edit `.env` and add your actual API keys:

```env
OPENAI_API_KEY=sk-your-openai-api-key-here
AMADEUS_CLIENT_ID=your-amadeus-client-id
AMADEUS_CLIENT_SECRET=your-amadeus-client-secret
```

### 3. Get API Keys

- **OpenAI**: [Get API Key](https://platform.openai.com/api-keys)
- **Amadeus**: [Get API Credentials](https://developers.amadeus.com/)

## 🚀 Usage

### Run the Application

```bash
npm run run
# or
node main.js
```

### Example Natural Language Requests

The system understands natural language requests like:

- "I need a flight from New York to London on December 15th"
- "Book me a flight from JFK to LHR tomorrow for 2 passengers"
- "I want to fly from San Francisco to Tokyo on March 20th in business class"
- "Find flights from LAX to Paris for next Friday"

### How It Works

1. **Input**: You type your request in natural language
2. **Processing**: ChatGPT extracts flight details (from, to, date, passengers, class)
3. **Search**: Amadeus API searches for real flights
4. **Results**: Display available flights with prices and details
5. **Booking**: Book your selected flight through the system

## 🧪 Testing

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run simple tests without Jest
node simple-test.js
```

### Test Coverage

The test suite covers:
- Flight search functionality
- API integration
- Error handling
- Edge cases
- Function exports

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | Your OpenAI API key | Yes |
| `AMADEUS_CLIENT_ID` | Your Amadeus client ID | Yes |
| `AMADEUS_CLIENT_SECRET` | Your Amadeus client secret | Yes |

### API Endpoints

- **Amadeus Test Environment**: `https://test.api.amadeus.com/`
- **Amadeus Production**: `https://api.amadeus.com/` (requires production credentials)

## 📱 Example Session

```
🚀 Welcome to the Real Flight Booking Agent!
I can help you book real flights using natural language.
Example: "I need a flight from New York to London on December 15th for 2 passengers in business class"

How can I help you book a flight today?
I need a flight from JFK to LHR on December 15th

🤖 Processing your request with ChatGPT...
✅ Intent extracted: {
  "from": "JFK",
  "to": "LHR", 
  "date": "2024-12-15",
  "passengers": 1,
  "class": "economy"
}

🔍 Searching for flights with Amadeus API...

✈️  Available Flights:
────────────────────────────────────────────────────────────────────────────────
1. JFK → LHR
   14:30 - 02:45
   Direct | 450.00 USD | 4 seats available

2. JFK → LHR
   18:15 - 06:30
   1 stop | 380.00 USD | 2 seats available

Would you like to book one of these flights? (Enter flight number or "no"): 1

🔄 Processing your booking...
🎉 Flight booked successfully!
Booking ID: 12345678
Thank you for using our service!
```

## 🚨 Important Notes

- **Test Environment**: Uses Amadeus test API by default
- **Real Bookings**: Can actually book flights (use with caution)
- **API Limits**: Respect OpenAI and Amadeus rate limits
- **Security**: Never commit your .env file to version control

## 🐛 Troubleshooting

### Common Issues

1. **"API key not configured"**
   - Check your .env file
   - Verify API keys are correct

2. **"Failed to get Amadeus token"**
   - Verify Amadeus credentials
   - Check network connectivity

3. **"No flights found"**
   - Verify airport codes (use IATA codes like JFK, LHR)
   - Check date format (YYYY-MM-DD)
   - Try different dates or routes

### Getting Help

- Check the console output for specific error messages
- Verify all dependencies are installed
- Ensure API keys are valid and have sufficient credits

## 🔮 Future Enhancements

- Multi-city itineraries
- Hotel booking integration
- Car rental options
- Price alerts and tracking
- Mobile app interface
- Multi-language support

## 📄 License

ISC License - see package.json for details

## 🤝 Contributing

Feel free to submit issues and enhancement requests! 