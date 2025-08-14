// Currency conversion utility for Amadeus API responses
// Converts EUR to USD by default

// Exchange rate cache to avoid repeated API calls
const exchangeRateCache = new Map();
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

/**
 * Get current exchange rate from EUR to USD
 * @returns {Promise<number>} Exchange rate (1 EUR = X USD)
 */
async function getEURtoUSDRate() {
  const cacheKey = 'EUR_USD';
  const cached = exchangeRateCache.get(cacheKey);
  
  // Return cached rate if still valid
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    console.log(`[CURRENCY] Using cached EUR to USD rate: ${cached.rate}`);
    return cached.rate;
  }
  
  try {
    // Try multiple exchange rate APIs for reliability
    const rate = await getExchangeRateFromAPI();
    
    // Cache the rate
    exchangeRateCache.set(cacheKey, {
      rate,
      timestamp: Date.now()
    });
    
    console.log(`[CURRENCY] Updated EUR to USD rate: ${rate}`);
    return rate;
    
  } catch (error) {
    console.error('[CURRENCY] Error getting exchange rate:', error);
    
    // Return cached rate if available, even if expired
    if (cached) {
      console.log(`[CURRENCY] Using expired cached rate: ${cached.rate}`);
      return cached.rate;
    }
    
    // Fallback to a reasonable default rate
    const fallbackRate = 1.08; // Approximate EUR to USD rate
    console.log(`[CURRENCY] Using fallback rate: ${fallbackRate}`);
    return fallbackRate;
  }
}

/**
 * Get exchange rate from external API
 * @returns {Promise<number>} Exchange rate
 */
async function getExchangeRateFromAPI() {
  // Try multiple free exchange rate APIs
  const apis = [
    'https://api.exchangerate-api.com/v4/latest/EUR',
    'https://open.er-api.com/v6/latest/EUR',
    'https://api.frankfurter.app/latest?from=EUR&to=USD'
  ];
  
  for (const apiUrl of apis) {
    try {
      console.log(`[CURRENCY] Trying API: ${apiUrl}`);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Flight-Booking-Agent/1.0'
        },
        timeout: 5000
      });
      
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      let rate;
      
      // Parse different API response formats
      if (apiUrl.includes('exchangerate-api.com')) {
        rate = data.rates.USD;
      } else if (apiUrl.includes('er-api.com')) {
        rate = data.rates.USD;
      } else if (apiUrl.includes('frankfurter.app')) {
        rate = data.rates.USD;
      } else {
        throw new Error('Unknown API response format');
      }
      
      if (rate && typeof rate === 'number' && rate > 0) {
        console.log(`[CURRENCY] Successfully got rate from ${apiUrl}: ${rate}`);
        return rate;
      }
      
    } catch (error) {
      console.log(`[CURRENCY] API ${apiUrl} failed:`, error.message);
      continue;
    }
  }
  
  throw new Error('All exchange rate APIs failed');
}

/**
 * Convert price from EUR to USD
 * @param {number|string} price - Price in EUR
 * @param {string} fromCurrency - Source currency (default: 'EUR')
 * @param {string} toCurrency - Target currency (default: 'USD')
 * @returns {Promise<{price: number, currency: string, originalPrice: number, originalCurrency: string, exchangeRate: number}>}
 */
async function convertCurrency(price, fromCurrency = 'EUR', toCurrency = 'USD') {
  // If already in USD, return as is
  if (fromCurrency === 'USD') {
    return {
      price: parseFloat(price),
      currency: 'USD',
      originalPrice: parseFloat(price),
      originalCurrency: 'USD',
      exchangeRate: 1
    };
  }
  
  // If from EUR to USD, convert
  if (fromCurrency === 'EUR' && toCurrency === 'USD') {
    const rate = await getEURtoUSDRate();
    const convertedPrice = parseFloat(price) * rate;
    
    return {
      price: Math.round(convertedPrice * 100) / 100, // Round to 2 decimal places
      currency: 'USD',
      originalPrice: parseFloat(price),
      originalCurrency: 'EUR',
      exchangeRate: rate
    };
  }
  
  // For other currency pairs, return original (can be extended later)
  console.log(`[CURRENCY] Unsupported conversion: ${fromCurrency} to ${toCurrency}`);
  return {
    price: parseFloat(price),
    currency: fromCurrency,
    originalPrice: parseFloat(price),
    originalCurrency: fromCurrency,
    exchangeRate: 1
  };
}

/**
 * Convert Amadeus flight offer prices from EUR to USD
 * @param {Object} flightOffer - Flight offer object from Amadeus API
 * @returns {Promise<Object>} Flight offer with converted prices
 */
async function convertFlightOfferPrices(flightOffer) {
  try {
    if (!flightOffer.price || !flightOffer.price.total) {
      return flightOffer;
    }
    
    const originalCurrency = flightOffer.price.currency || 'EUR';
    const originalPrice = flightOffer.price.total;
    
    // Convert main price
    const convertedMain = await convertCurrency(originalPrice, originalCurrency, 'USD');
    
    // Convert base price if available
    let convertedBase = null;
    if (flightOffer.price.base) {
      convertedBase = await convertCurrency(flightOffer.price.base, originalCurrency, 'USD');
    }
    
    // Convert fees if available
    let convertedFees = null;
    if (flightOffer.price.fees) {
      convertedFees = await convertCurrency(flightOffer.price.fees, originalCurrency, 'USD');
    }
    
    // Convert grand total if available
    let convertedGrandTotal = null;
    if (flightOffer.price.grandTotal) {
      convertedGrandTotal = await convertCurrency(flightOffer.price.grandTotal, originalCurrency, 'USD');
    }
    
    // Create converted price object
    const convertedPrice = {
      total: convertedMain.price.toString(),
      currency: 'USD',
      base: convertedBase ? convertedBase.price.toString() : undefined,
      fees: convertedFees ? convertedFees.price.toString() : undefined,
      grandTotal: convertedGrandTotal ? convertedGrandTotal.price.toString() : undefined,
      originalPrice: originalPrice,
      originalCurrency: originalCurrency,
      exchangeRate: convertedMain.exchangeRate
    };
    
    // Return flight offer with converted prices
    return {
      ...flightOffer,
      price: convertedPrice
    };
    
  } catch (error) {
    console.error('[CURRENCY] Error converting flight offer prices:', error);
    // Return original offer if conversion fails
    return flightOffer;
  }
}

/**
 * Convert multiple flight offers at once
 * @param {Array} flightOffers - Array of flight offer objects
 * @returns {Promise<Array>} Array of flight offers with converted prices
 */
async function convertFlightOffersPrices(flightOffers) {
  if (!Array.isArray(flightOffers)) {
    return flightOffers;
  }
  
  try {
    const convertedOffers = await Promise.all(
      flightOffers.map(offer => convertFlightOfferPrices(offer))
    );
    
    console.log(`[CURRENCY] Converted ${convertedOffers.length} flight offers from EUR to USD`);
    return convertedOffers;
    
  } catch (error) {
    console.error('[CURRENCY] Error converting flight offers:', error);
    return flightOffers;
  }
}

/**
 * Convert destination inspiration prices
 * @param {Array} destinations - Array of destination objects
 * @returns {Promise<Array>} Array of destinations with converted prices
 */
async function convertDestinationPrices(destinations) {
  if (!Array.isArray(destinations)) {
    return destinations;
  }
  
  try {
    const convertedDestinations = await Promise.all(
      destinations.map(async (destination) => {
        if (!destination.price || !destination.price.total) {
          return destination;
        }
        
        const converted = await convertCurrency(
          destination.price.total, 
          destination.price.currency || 'EUR', 
          'USD'
        );
        
        return {
          ...destination,
          price: {
            total: converted.price.toString(),
            currency: 'USD',
            originalPrice: converted.originalPrice,
            originalCurrency: converted.originalCurrency,
            exchangeRate: converted.exchangeRate
          }
        };
      })
    );
    
    console.log(`[CURRENCY] Converted ${convertedDestinations.length} destination prices from EUR to USD`);
    return convertedDestinations;
    
  } catch (error) {
    console.error('[CURRENCY] Error converting destination prices:', error);
    return destinations;
  }
}

module.exports = {
  convertCurrency,
  convertFlightOfferPrices,
  convertFlightOffersPrices,
  convertDestinationPrices,
  getEURtoUSDRate
};
