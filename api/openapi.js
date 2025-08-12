// OpenAPI specification endpoint for Vercel
module.exports = (req, res) => {
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
          "url": "https://porter-gcdnzaqo6-rakesh-paridas-projects.vercel.app"
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
                        "description": "Departure airport code"
                      },
                      "to": {
                        "type": "string",
                        "description": "Destination airport code"
                      },
                      "date": {
                        "type": "string",
                        "description": "Travel date (YYYY-MM-DD)"
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
