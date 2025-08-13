// OpenAPI specification endpoint for Vercel
module.exports = (req, res) => {
  // Set CORS headers to allow all origins
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  try {
    // Embedded OpenAPI specification for GPT-5 compatibility
    const openapiSpec = {
      "openapi": "3.1.0",
      "info": {
        "title": "Flight Booking Agent",
        "description": "Search for flights using natural language or specific parameters",
        "version": "1.0.0"
      },
      "servers": [
        {
          "url": "https://porter-cd2kjhtay-rakesh-paridas-projects.vercel.app"
        }
      ],
      "paths": {
        "/api/chatgpt": {
          "post": {
            "summary": "Search flights with natural language",
            "operationId": "chatgptFlightSearch",
            "requestBody": {
              "required": true,
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "message": {
                        "type": "string",
                        "description": "Natural language flight request"
                      }
                    },
                    "required": ["message"]
                  }
                }
              }
            },
                         "responses": {
               "200": {
                 "description": "Flight search results",
                 "content": {
                   "application/json": {
                     "schema": {
                       "type": "object",
                       "properties": {
                         "success": {
                           "type": "boolean"
                         },
                         "message": {
                           "type": "string"
                         },
                         "intent": {
                           "type": "object",
                           "properties": {
                             "from": { "type": "string" },
                             "to": { "type": "string" },
                             "date": { "type": "string" },
                             "passengers": { "type": "integer" },
                             "class": { "type": "string" }
                           }
                         },
                         "flights": {
                           "type": "array",
                           "items": {
                             "type": "object",
                             "properties": {
                               "flightNumber": { "type": "string" },
                               "route": { "type": "string" },
                               "time": { "type": "string" },
                               "stops": { "type": "string" },
                               "price": { "type": "string" },
                               "seats": { "type": "integer" },
                               "airline": { "type": "string" },
                               "class": { "type": "string" }
                             }
                           }
                         },
                         "searchParams": {
                           "type": "object",
                           "properties": {
                             "from": { "type": "string" },
                             "to": { "type": "string" },
                             "date": { "type": "string" },
                             "passengers": { "type": "integer" },
                             "travelClass": { "type": "string" }
                           }
                         }
                       }
                     }
                   }
                 }
               }
             }
          }
        },
                 "/api/search-flights": {
           "post": {
             "summary": "Search flights with parameters",
             "operationId": "searchFlights",
             "requestBody": {
               "required": true,
               "content": {
                 "application/json": {
                   "schema": {
                     "type": "object",
                     "properties": {
                       "from": {
                         "type": "string",
                         "description": "Departure airport code (e.g., SEA, LAX)"
                       },
                       "to": {
                         "type": "string",
                         "description": "Destination airport code (e.g., YVR, JFK)"
                       },
                       "date": {
                         "type": "string",
                         "description": "Travel date (YYYY-MM-DD)"
                       },
                       "passengers": {
                         "type": "integer",
                         "description": "Number of passengers",
                         "default": 1
                       },
                       "travelClass": {
                         "type": "string",
                         "description": "Travel class (ECONOMY, BUSINESS, FIRST)",
                         "default": "ECONOMY"
                       },
                       "userId": {
                         "type": "string",
                         "description": "User identifier (optional)"
                       }
                     },
                     "required": ["from", "to", "date"]
                   }
                 }
               }
             },
             "responses": {
               "200": {
                 "description": "Available flights",
                 "content": {
                   "application/json": {
                     "schema": {
                       "type": "object",
                       "properties": {
                         "success": {
                           "type": "boolean"
                         },
                         "flights": {
                           "type": "array",
                           "items": {
                             "type": "object"
                           }
                         }
                       }
                     }
                   }
                 }
               }
             }
           }
         },
         "/api/public": {
           "get": {
             "summary": "Public endpoint with no authentication",
             "operationId": "publicTest",
             "responses": {
               "200": {
                 "description": "Public access confirmed",
                 "content": {
                   "application/json": {
                     "schema": {
                       "type": "object",
                       "properties": {
                         "success": {
                           "type": "boolean"
                         },
                         "message": {
                           "type": "string"
                         },
                         "public": {
                           "type": "boolean"
                         }
                       }
                     }
                   }
                 }
               }
             }
           }
         }
      }
    };
    
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(openapiSpec);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to generate OpenAPI specification',
      message: error.message
    });
  }
};
