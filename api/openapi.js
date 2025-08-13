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
    // Dynamically determine the server URL
    const serverUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : req.headers.host 
        ? `https://${req.headers.host}` 
        : 'http://localhost:3000';
    
    console.log(`[OPENAPI] Generating specification with server URL: ${serverUrl}`);
    
    // Embedded OpenAPI specification for GPT-5 compatibility
    const openapiSpec = {
      "openapi": "3.1.0",
      "info": {
        "title": "Flight Booking Agent",
        "description": "Search for flights using natural language or specific parameters",
        "version": "1.0.0",
        "contact": {
          "name": "Flight Booking Agent API",
          "url": serverUrl
        }
      },
      "servers": [
        {
          "url": serverUrl,
          "description": "Production server"
        }
      ],
      "paths": {
        "/api/chatgpt": {
          "post": {
            "summary": "Search flights with natural language",
            "description": "Use ChatGPT to parse natural language flight requests and return flight options",
            "operationId": "chatgptFlightSearch",
            "tags": ["Flight Search"],
            "requestBody": {
              "required": true,
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "message": {
                        "type": "string",
                        "description": "Natural language flight request (e.g., 'Find me a flight from New York to Los Angeles on September 5th')",
                        "example": "Find me a flight from New York to Los Angeles on September 5th for 1 passenger in economy class"
                      },
                      "userId": {
                        "type": "string",
                        "description": "Optional user identifier for tracking",
                        "example": "user_123"
                      }
                    },
                    "required": ["message"]
                  }
                }
              }
            },
            "responses": {
              "200": {
                "description": "Flight search results with parsed intent",
                "content": {
                  "application/json": {
                    "schema": {
                      "type": "object",
                      "properties": {
                        "success": {
                          "type": "boolean",
                          "description": "Whether the request was successful"
                        },
                        "message": {
                          "type": "string",
                          "description": "Human-readable response message"
                        },
                        "requestId": {
                          "type": "string",
                          "description": "Unique request identifier for tracking"
                        },
                        "intent": {
                          "type": "object",
                          "description": "Parsed flight search intent",
                          "properties": {
                            "from": { 
                              "type": "string",
                              "description": "Departure airport code",
                              "example": "JFK"
                            },
                            "to": { 
                              "type": "string",
                              "description": "Destination airport code",
                              "example": "LAX"
                            },
                            "date": { 
                              "type": "string",
                              "description": "Travel date in YYYY-MM-DD format",
                              "example": "2024-09-05"
                            },
                            "passengers": { 
                              "type": "integer",
                              "description": "Number of passengers",
                              "example": 1
                            },
                            "class": { 
                              "type": "string",
                              "description": "Travel class",
                              "example": "economy"
                            }
                          }
                        },
                        "flights": {
                          "type": "array",
                          "description": "Available flight options",
                          "items": {
                            "type": "object",
                            "properties": {
                              "flightNumber": { 
                                "type": "string",
                                "example": "AA123"
                              },
                              "route": { 
                                "type": "string",
                                "example": "JFK → LAX"
                              },
                              "time": { 
                                "type": "string",
                                "example": "10:00 AM - 11:30 AM"
                              },
                              "stops": { 
                                "type": "string",
                                "example": "Direct"
                              },
                              "price": { 
                                "type": "string",
                                "example": "$299"
                              },
                              "seats": { 
                                "type": "integer",
                                "example": 4
                              },
                              "airline": { 
                                "type": "string",
                                "example": "American Airlines"
                              },
                              "class": { 
                                "type": "string",
                                "example": "economy"
                              }
                            }
                          }
                        },
                        "searchParams": {
                          "type": "object",
                          "description": "Search parameters used",
                          "properties": {
                            "from": { 
                              "type": "string",
                              "example": "JFK"
                            },
                            "to": { 
                              "type": "string",
                              "example": "LAX"
                            },
                            "date": { 
                              "type": "string",
                              "example": "2024-09-05"
                            },
                            "passengers": { 
                              "type": "integer",
                              "example": 1
                            },
                            "travelClass": { 
                              "type": "string",
                              "example": "ECONOMY"
                            }
                          }
                        }
                      }
                    }
                  }
                }
              },
              "400": {
                "description": "Bad request - missing required parameters",
                "content": {
                  "application/json": {
                    "schema": {
                      "type": "object",
                      "properties": {
                        "error": {
                          "type": "string",
                          "example": "Message is required"
                        }
                      }
                    }
                  }
                }
              },
              "500": {
                "description": "Internal server error",
                "content": {
                  "application/json": {
                    "schema": {
                      "type": "object",
                      "properties": {
                        "error": {
                          "type": "string",
                          "example": "Internal server error"
                        },
                        "message": {
                          "type": "string",
                          "example": "ChatGPT intent parsing failed"
                        },
                        "requestId": {
                          "type": "string",
                          "description": "Request identifier for debugging"
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
            "summary": "Search flights with specific parameters",
            "description": "Search for flights using exact airport codes and parameters",
            "operationId": "searchFlights",
            "tags": ["Flight Search"],
            "requestBody": {
              "required": true,
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "from": {
                        "type": "string",
                        "description": "Departure airport code (e.g., SEA, LAX, JFK)",
                        "example": "JFK"
                      },
                      "to": {
                        "type": "string",
                        "description": "Destination airport code (e.g., YVR, LAX, SFO)",
                        "example": "LAX"
                      },
                      "date": {
                        "type": "string",
                        "description": "Travel date in YYYY-MM-DD format",
                        "example": "2024-09-05"
                      },
                      "passengers": {
                        "type": "integer",
                        "description": "Number of passengers",
                        "default": 1,
                        "example": 1
                      },
                      "travelClass": {
                        "type": "string",
                        "description": "Travel class (ECONOMY, BUSINESS, FIRST)",
                        "default": "ECONOMY",
                        "enum": ["ECONOMY", "BUSINESS", "FIRST"],
                        "example": "ECONOMY"
                      },
                      "userId": {
                        "type": "string",
                        "description": "User identifier for tracking (optional)",
                        "example": "user_123"
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
                          "type": "boolean",
                          "description": "Whether the search was successful"
                        },
                        "flights": {
                          "type": "array",
                          "description": "List of available flights",
                          "items": {
                            "type": "object",
                            "properties": {
                              "flightNumber": {
                                "type": "string",
                                "example": "AA123"
                              },
                              "route": {
                                "type": "string",
                                "example": "JFK → LAX"
                              },
                              "time": {
                                "type": "string",
                                "example": "10:00 AM - 11:30 AM"
                              },
                              "stops": {
                                "type": "string",
                                "example": "Direct"
                              },
                              "price": {
                                "type": "string",
                                "example": "$299"
                              },
                              "seats": {
                                "type": "integer",
                                "example": 4
                              },
                              "airline": {
                                "type": "string",
                                "example": "American Airlines"
                              },
                              "class": {
                                "type": "string",
                                "example": "ECONOMY"
                              }
                            }
                          }
                        },
                        "searchParams": {
                          "type": "object",
                          "description": "Search parameters used"
                        },
                        "requestId": {
                          "type": "string",
                          "description": "Unique request identifier"
                        },
                        "dataSource": {
                          "type": "string",
                          "description": "Source of flight data (amadeus_api or mock_data)",
                          "enum": ["amadeus_api", "mock_data"]
                        }
                      }
                    }
                  }
                }
              },
              "400": {
                "description": "Bad request - missing required parameters",
                "content": {
                  "application/json": {
                    "schema": {
                      "type": "object",
                      "properties": {
                        "error": {
                          "type": "string",
                          "example": "from, to, and date are required"
                        }
                      }
                    }
                  }
                }
              },
              "500": {
                "description": "Internal server error",
                "content": {
                  "application/json": {
                    "schema": {
                      "type": "object",
                      "properties": {
                        "error": {
                          "type": "string",
                          "example": "Internal server error"
                        },
                        "message": {
                          "type": "string",
                          "example": "Flight search failed"
                        },
                        "requestId": {
                          "type": "string",
                          "description": "Request identifier for debugging"
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        "/api/health": {
          "get": {
            "summary": "Health check endpoint",
            "description": "Check if the API is running and healthy",
            "operationId": "healthCheck",
            "tags": ["System"],
            "responses": {
              "200": {
                "description": "API is healthy",
                "content": {
                  "application/json": {
                    "schema": {
                      "type": "object",
                      "properties": {
                        "status": {
                          "type": "string",
                          "example": "ok"
                        },
                        "timestamp": {
                          "type": "string",
                          "format": "date-time"
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        "/api/openapi": {
          "get": {
            "summary": "OpenAPI specification",
            "description": "Get the OpenAPI specification for this API",
            "operationId": "getOpenAPISpec",
            "tags": ["System"],
            "responses": {
              "200": {
                "description": "OpenAPI specification",
                "content": {
                  "application/json": {
                    "schema": {
                      "type": "object"
                    }
                  }
                }
              }
            }
          }
        }
      },
      "tags": [
        {
          "name": "Flight Search",
          "description": "Endpoints for searching and booking flights"
        },
        {
          "name": "System",
          "description": "System health and documentation endpoints"
        }
      ],
      "components": {
        "schemas": {
          "Flight": {
            "type": "object",
            "properties": {
              "flightNumber": {
                "type": "string",
                "description": "Flight number"
              },
              "route": {
                "type": "string",
                "description": "Route description"
              },
              "time": {
                "type": "string",
                "description": "Departure and arrival times"
              },
              "stops": {
                "type": "string",
                "description": "Number of stops"
              },
              "price": {
                "type": "string",
                "description": "Ticket price"
              },
              "seats": {
                "type": "integer",
                "description": "Available seats"
              },
              "airline": {
                "type": "string",
                "description": "Airline name"
              },
              "class": {
                "type": "string",
                "description": "Travel class"
              }
            }
          }
        }
      }
    };
    
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(openapiSpec);
  } catch (error) {
    console.error('[OPENAPI] Error generating specification:', error);
    res.status(500).json({
      error: 'Failed to generate OpenAPI specification',
      message: error.message
    });
  }
};
