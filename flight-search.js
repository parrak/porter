// Amadeus API integration for flight search
const Amadeus = require('amadeus');
const { convertFlightOffersPrices, convertDestinationPrices } = require('./utils/currency-converter');

// Initialize Amadeus client
const amadeus = new Amadeus({
    clientId: process.env.AMADEUS_CLIENT_ID,
    clientSecret: process.env.AMADEUS_CLIENT_SECRET
});

// Flight search function using Amadeus API
async function searchFlights(searchParams) {
    try {
        // Extract parameters from the searchParams object
        const {
            originLocationCode: origin,
            destinationLocationCode: destination,
            departureDate,
            returnDate,
            adults = 1,
            travelClass = 'ECONOMY',
            max = 50
        } = searchParams;

        const amadeusParams = {
            originLocationCode: origin,
            destinationLocationCode: destination,
            departureDate: departureDate,
            adults: adults,
            currencyCode: 'USD',
            max: max
        };

        // Add return date if provided
        if (returnDate) {
            amadeusParams.returnDate = returnDate;
        }

        // Add travel class if specified
        if (travelClass && travelClass !== 'ECONOMY') {
            amadeusParams.travelClass = travelClass;
        }

        console.log('🔍 Amadeus API search params:', amadeusParams);

        const response = await amadeus.shopping.flightOffersSearch.get(amadeusParams);
        
        // Transform Amadeus response to match our expected format
        // Convert prices from EUR to USD before processing
        const convertedOffers = await convertFlightOffersPrices(response.data);
        
        const flights = convertedOffers.map((offer, index) => {
            const outboundSegment = offer.itineraries[0].segments[0];
            const inboundSegment = offer.itineraries[1]?.segments[0];
            
            return {
                id: offer.id,
                from: outboundSegment.departure.iataCode,
                to: outboundSegment.arrival.iataCode,
                departureDate: outboundSegment.departure.at,
                returnDate: inboundSegment?.departure.at || null,
                price: parseFloat(offer.price.total),
                currency: offer.price.currency,
                airline: outboundSegment.carrierCode,
                flightNumber: outboundSegment.number,
                duration: offer.itineraries[0].duration,
                stops: offer.itineraries[0].segments.length - 1,
                cabinClass: offer.travelerPricings[0].fareDetailsBySegment[0].cabin,
                // Include conversion info for transparency
                originalPrice: offer.price.originalPrice,
                originalCurrency: offer.price.originalCurrency,
                exchangeRate: offer.price.exchangeRate
            };
        });

        return { 
            flights, 
            flightOffers: response.data, // Return complete Amadeus flight offers
            dataSource: 'amadeus' 
        };
    } catch (error) {
        console.error('Error searching flights:', error);
        throw new Error('Failed to search flights. Please try again.');
    }
}

// Get airport suggestions for autocomplete
async function getAirportSuggestions(keyword) {
    try {
        const response = await amadeus.referenceData.locations.get({
            keyword: keyword,
            subType: Amadeus.location.any
        });

        return response.data.map(location => ({
            code: location.iataCode,
            name: location.name,
            city: location.address.cityName,
            country: location.address.countryName
        }));
    } catch (error) {
        console.error('Error getting airport suggestions:', error);
        return [];
    }
}

// Get flight offers for inspiration (trending destinations)
async function getFlightInspiration(origin) {
    try {
        const response = await amadeus.shopping.flightDestinations.get({
            origin: origin
        });

        // Convert prices from EUR to USD
        const convertedDestinations = await convertDestinationPrices(response.data);

        return convertedDestinations.map(destination => ({
            destination: destination.destination,
            departureDate: destination.departureDate,
            returnDate: destination.returnDate,
            price: parseFloat(destination.price.total),
            currency: destination.price.currency,
            // Include conversion info for transparency
            originalPrice: destination.price.originalPrice,
            originalCurrency: destination.price.originalCurrency,
            exchangeRate: destination.price.exchangeRate
        }));
    } catch (error) {
        console.error('Error getting flight inspiration:', error);
        return [];
    }
}

// Get flight price prediction
async function getFlightPricePrediction(origin, destination, departureDate) {
    try {
        const response = await amadeus.shopping.flightOffers.prediction.get({
            origin: origin,
            destination: destination,
            departureDate: departureDate
        });

        return {
            prediction: response.data,
            confidence: response.meta.confidence
        };
    } catch (error) {
        console.error('Error getting flight price prediction:', error);
        return null;
    }
}

// Example usage functions
async function searchRoundTripFlights(origin, destination, departureDate, returnDate) {
    return await searchFlights({ 
        originLocationCode: origin, 
        destinationLocationCode: destination, 
        departureDate, 
        returnDate 
    });
}

async function searchOneWayFlights(origin, destination, departureDate) {
    return await searchFlights({ 
        originLocationCode: origin, 
        destinationLocationCode: destination, 
        departureDate 
    });
}

// Export functions for use in other modules
module.exports = {
    searchFlights,
    searchRoundTripFlights,
    searchOneWayFlights,
    getAirportSuggestions,
    getFlightInspiration,
    getFlightPricePrediction
};

// Example usage:
/*
// Search for round-trip flights
const flights = await searchRoundTripFlights('JFK', 'LHR', '2024-07-01', '2024-07-15');

// Get airport suggestions
const airports = await getAirportSuggestions('New York');

// Get flight inspiration
const inspiration = await getFlightInspiration('JFK');
*/ 