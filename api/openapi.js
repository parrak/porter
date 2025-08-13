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
        "description": "Search for flights using natural language or specific parameters. This API supports user-aware personalization for Custom GPTs.",
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
                        "description": "Optional user identifier for tracking and personalization",
                        "example": "demo@example.com"
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
            "operationId": "searchFlights",
            "tags": ["Flight Search"],
            "summary": "Search for available flights",
            "description": "Search for flights using specific parameters. Integrates with Amadeus API for real-time flight data.",
            "requestBody": {
              "required": true,
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "required": ["from", "to", "date"],
                    "properties": {
                      "from": {
                        "type": "string",
                        "description": "3-letter departure airport code",
                        "example": "JFK"
                      },
                      "to": {
                        "type": "string", 
                        "description": "3-letter arrival airport code",
                        "example": "LAX"
                      },
                      "date": {
                        "type": "string",
                        "description": "Departure date in YYYY-MM-DD format",
                        "example": "2025-01-15"
                      },
                      "passengers": {
                        "type": "integer",
                        "description": "Number of passengers",
                        "default": 1,
                        "minimum": 1,
                        "example": 2
                      },
                      "travelClass": {
                        "type": "string",
                        "description": "Travel class preference",
                        "enum": ["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"],
                        "default": "ECONOMY",
                        "example": "ECONOMY"
                      },
                      "userId": {
                        "type": "string",
                        "description": "User identifier for personalization",
                        "example": "john@example.com"
                      }
                    }
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
                        "success": { "type": "boolean" },
                        "searchParams": { "$ref": "#/components/schemas/SearchParams" },
                        "flightsFound": { "type": "integer" },
                        "flights": {
                          "type": "array",
                          "items": { "$ref": "#/components/schemas/Flight" }
                        },
                        "message": { "type": "string" },
                        "requestId": { "type": "string" },
                        "dataSource": { "type": "string" }
                      }
                    }
                  }
                }
              },
              "400": {
                "description": "Bad request - validation error",
                "content": {
                  "application/json": {
                    "schema": {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string" },
                        "message": { "type": "string" },
                        "suggestions": { "type": "array", "items": { "type": "string" } },
                        "requestId": { "type": "string" }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        "/api/book-flight": {
          "post": {
            "operationId": "bookFlight",
            "tags": ["Flight Booking"],
            "summary": "Book a selected flight",
            "description": "Book a flight using the flight offer ID from search results. Integrates with Amadeus API for real bookings.",
            "requestBody": {
              "required": true,
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "required": ["flightOfferId", "passengers", "contactInfo"],
                    "properties": {
                      "flightOfferId": {
                        "type": "string",
                        "description": "Flight offer ID from search results",
                        "example": "1"
                      },
                      "passengers": {
                        "type": "array",
                        "description": "Array of passenger information",
                        "items": {
                          "type": "object",
                          "required": ["firstName", "lastName", "dateOfBirth", "documentNumber", "documentExpiryDate"],
                          "properties": {
                            "type": {
                              "type": "string",
                              "description": "Passenger type",
                              "enum": ["adult", "child", "infant"],
                              "default": "adult"
                            },
                            "title": {
                              "type": "string",
                              "description": "Title (Mr, Ms, Dr, etc.)",
                              "example": "Mr"
                            },
                            "firstName": {
                              "type": "string",
                              "description": "First name",
                              "example": "John"
                            },
                            "lastName": {
                              "type": "string",
                              "description": "Last name",
                              "example": "Doe"
                            },
                            "dateOfBirth": {
                              "type": "string",
                              "description": "Date of birth in YYYY-MM-DD format",
                              "example": "1990-01-01"
                            },
                            "gender": {
                              "type": "string",
                              "description": "Gender",
                              "enum": ["MALE", "FEMALE"],
                              "default": "MALE"
                            },
                            "documentType": {
                              "type": "string",
                              "description": "Travel document type",
                              "enum": ["PASSPORT", "ID_CARD", "DRIVING_LICENSE"],
                              "default": "PASSPORT"
                            },
                            "documentNumber": {
                              "type": "string",
                              "description": "Document number",
                              "example": "AB123456"
                            },
                            "documentExpiryDate": {
                              "type": "string",
                              "description": "Document expiry date in YYYY-MM-DD format",
                              "example": "2030-01-01"
                            },
                            "birthPlace": {
                              "type": "string",
                              "description": "Place of birth",
                              "example": "UNITED STATES"
                            },
                            "issuanceLocation": {
                              "type": "string",
                              "description": "Document issuance location",
                              "example": "UNITED STATES"
                            }
                          }
                        }
                      },
                      "contactInfo": {
                        "type": "object",
                        "required": ["email", "phone"],
                        "properties": {
                          "email": {
                            "type": "string",
                            "description": "Contact email address",
                            "format": "email",
                            "example": "john.doe@example.com"
                          },
                          "phone": {
                            "type": "string",
                            "description": "Contact phone number",
                            "example": "+1-555-123-4567"
                          },
                          "address": {
                            "type": "object",
                            "properties": {
                              "street": { "type": "string" },
                              "city": { "type": "string" },
                              "state": { "type": "string" },
                              "country": { "type": "string" },
                              "postalCode": { "type": "string" }
                            }
                          }
                        }
                      },
                      "paymentInfo": {
                        "type": "object",
                        "description": "Payment information (optional for demo)",
                        "properties": {
                          "method": {
                            "type": "string",
                            "enum": ["credit_card", "debit_card", "paypal"],
                            "example": "credit_card"
                          },
                          "cardNumber": {
                            "type": "string",
                            "description": "Last 4 digits of card",
                            "example": "1234"
                          }
                        }
                      },
                      "userId": {
                        "type": "string",
                        "description": "User identifier for personalization",
                        "example": "john@example.com"
                      },
                      "searchParams": {
                        "type": "object",
                        "description": "Original search parameters for context",
                        "properties": {
                          "from": { "type": "string" },
                          "to": { "type": "string" },
                          "date": { "type": "string" },
                          "passengers": { "type": "integer" },
                          "travelClass": { "type": "string" }
                        }
                      },
                      "originalIntent": {
                        "type": "object",
                        "description": "Original user intent from ChatGPT",
                        "properties": {
                          "from": { "type": "string" },
                          "to": { "type": "string" },
                          "date": { "type": "string" },
                          "passengers": { "type": "integer" },
                          "class": { "type": "string" }
                        }
                      }
                    }
                  }
                }
              }
            },
            "responses": {
              "200": {
                "description": "Flight booked successfully",
                "content": {
                  "application/json": {
                    "schema": {
                      "type": "object",
                      "properties": {
                        "success": { "type": "boolean" },
                        "message": { "type": "string" },
                        "bookingReference": { "type": "string" },
                        "bookingDetails": {
                          "type": "object",
                          "properties": {
                            "status": { "type": "string" },
                            "confirmationNumber": { "type": "string" },
                            "bookingDate": { "type": "string" },
                            "totalPrice": { "type": "string" },
                            "currency": { "type": "string" },
                            "flightDetails": { "type": "object" }
                          }
                        },
                        "passengers": {
                          "type": "array",
                          "items": { "type": "object" }
                        },
                        "contactInfo": { "type": "object" },
                        "searchParams": { "type": "object" },
                        "originalIntent": { "type": "object" },
                        "requestId": { "type": "string" },
                        "dataSource": { "type": "string" },
                        "bookingDuration": { "type": "number" }
                      }
                    }
                  }
                }
              },
              "400": {
                "description": "Bad request - validation error",
                "content": {
                  "application/json": {
                    "schema": {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string" },
                        "message": { "type": "string" },
                        "required": { "type": "array", "items": { "type": "string" } },
                        "examples": {
                          "type": "array",
                          "items": { "type": "object" }
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
                        "error": { "type": "string" },
                        "message": { "type": "string" },
                        "requestId": { "type": "string" }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        "/api/users/{id}": {
          "get": {
            "summary": "Fetch minimal user profile for personalization",
            "description": "Get user profile data for Custom GPT personalization. Returns display name, role, preferences, and recent context.",
            "operationId": "getUserProfile",
            "tags": ["User Management"],
            "parameters": [
              {
                "name": "id",
                "in": "path",
                "required": true,
                "description": "User identifier (email, code, or ID)",
                "schema": { "type": "string" },
                "example": "demo@example.com"
              }
            ],
            "responses": {
              "200": {
                "description": "User profile data for personalization",
                "content": {
                  "application/json": {
                    "schema": {
                      "type": "object",
                      "properties": {
                        "success": {
                          "type": "boolean",
                          "description": "Whether the request was successful"
                        },
                        "displayName": {
                          "type": "string",
                          "description": "User's display name for addressing",
                          "example": "Demo User"
                        },
                        "role": {
                          "type": "string",
                          "description": "User's role or travel style",
                          "example": "Business Traveler"
                        },
                        "preferences": {
                          "type": "object",
                          "description": "User preferences for personalization",
                          "properties": {
                            "tone": {
                              "type": "string",
                              "description": "Preferred communication tone",
                              "example": "professional"
                            },
                            "format": {
                              "type": "string",
                              "description": "Preferred response format",
                              "example": "concise"
                            },
                            "travelStyle": {
                              "type": "string",
                              "description": "User's travel style preference",
                              "example": "business"
                            },
                            "preferredAirlines": {
                              "type": "array",
                              "items": { "type": "string" },
                              "description": "Preferred airlines",
                              "example": ["American Airlines", "Delta"]
                            },
                            "seatPreference": {
                              "type": "string",
                              "description": "Seat preference",
                              "example": "aisle"
                            }
                          }
                        },
                        "recentContext": {
                          "type": "array",
                          "items": { "type": "string" },
                          "description": "Recent context bullets for the GPT to read aloud",
                          "example": [
                            "Frequently travels JFK to LAX",
                            "Prefers business class for long flights",
                            "Books 2-3 weeks in advance"
                          ]
                        },
                        "requestId": {
                          "type": "string",
                          "description": "Request identifier for tracking"
                        }
                      },
                      "required": ["success", "displayName"]
                    }
                  }
                }
              },
              "404": {
                "description": "User not found",
                "content": {
                  "application/json": {
                    "schema": {
                      "type": "object",
                      "properties": {
                        "error": {
                          "type": "string",
                          "example": "User not found"
                        },
                        "message": {
                          "type": "string",
                          "example": "No profile found for this identifier"
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
          },
          "post": {
            "summary": "Persist updated preferences with consent",
            "description": "Update user preferences and recent context. Requires explicit consent in the request body.",
            "operationId": "updatePreferences",
            "tags": ["User Management"],
            "parameters": [
              {
                "name": "id",
                "in": "path",
                "required": true,
                "description": "User identifier (email, code, or ID)",
                "schema": { "type": "string" },
                "example": "demo@example.com"
              }
            ],
            "requestBody": {
              "required": true,
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "preferences": {
                        "type": "object",
                        "description": "User preferences to update",
                        "additionalProperties": true,
                        "example": {
                          "tone": "professional",
                          "travelStyle": "business"
                        }
                      },
                      "recentContext": {
                        "type": "array",
                        "items": { "type": "string" },
                        "description": "Recent context to remember",
                        "example": [
                          "Just booked JFK to LAX flight",
                          "Prefers morning departures"
                        ]
                      },
                      "consent": {
                        "type": "boolean",
                        "description": "Explicit consent to save data",
                        "example": true
                      }
                    },
                    "required": ["consent"]
                  }
                }
              }
            },
            "responses": {
              "200": {
                "description": "Preferences saved successfully",
                "content": {
                  "application/json": {
                    "schema": {
                      "type": "object",
                      "properties": {
                        "success": {
                          "type": "boolean",
                          "description": "Whether the update was successful"
                        },
                        "message": {
                          "type": "string",
                          "example": "Preferences saved successfully"
                        },
                        "updatedAt": {
                          "type": "string",
                          "format": "date-time",
                          "description": "Timestamp of the update"
                        },
                        "requestId": {
                          "type": "string",
                          "description": "Request identifier for tracking"
                        }
                      }
                    }
                  }
                }
              },
              "400": {
                "description": "Bad request - missing consent",
                "content": {
                  "application/json": {
                    "schema": {
                      "type": "object",
                      "properties": {
                        "error": {
                          "type": "string",
                          "example": "Consent required"
                        },
                        "message": {
                          "type": "string",
                          "example": "Explicit consent is required to save preferences"
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
                      "type": "object",
                      "description": "Complete OpenAPI 3.1.0 specification for the Flight Booking Agent API",
                      "properties": {
                        "openapi": {
                          "type": "string",
                          "description": "OpenAPI version",
                          "example": "3.1.0"
                        },
                        "info": {
                          "type": "object",
                          "description": "API information"
                        },
                        "servers": {
                          "type": "array",
                          "description": "Server configurations"
                        },
                        "paths": {
                          "type": "object",
                          "description": "API endpoints"
                        },
                        "tags": {
                          "type": "array",
                          "description": "API tags"
                        },
                        "components": {
                          "type": "object",
                          "description": "Reusable components"
                        }
                      },
                      "required": ["openapi", "info", "paths"]
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
          "description": "Search for available flights using various criteria"
        },
        {
          "name": "Flight Booking", 
          "description": "Book selected flights with passenger and payment information"
        },
        {
          "name": "User Management",
          "description": "Manage user profiles and preferences for personalization"
        },
        {
          "name": "System",
          "description": "System health and API information"
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
          },
          "UserProfile": {
            "type": "object",
            "properties": {
              "displayName": {
                "type": "string",
                "description": "User's display name"
              },
              "role": {
                "type": "string",
                "description": "User's role or travel style"
              },
              "preferences": {
                "type": "object",
                "description": "User preferences",
                "additionalProperties": true
              },
              "recentContext": {
                "type": "array",
                "items": { "type": "string" },
                "description": "Recent context for personalization"
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
