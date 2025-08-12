# Testing Guide for Airline Booking Agent

This document explains how to run tests for the Airline Booking Agent application.

## Prerequisites

Before running tests, you need to have Node.js installed on your system:

1. **Install Node.js**: Download and install from [nodejs.org](https://nodejs.org/)
2. **Verify installation**: Run `node --version` and `npm --version` in your terminal

## Test Files

- **`main.test.js`**: Comprehensive Jest tests for all functionality
- **`simple-test.js`**: Basic test runner that works without Jest
- **`jest.config.js`**: Jest configuration file
- **`test-setup.js`**: Basic setup verification

## Running Tests

### Option 1: Using Jest (Recommended)

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run all tests**:
   ```bash
   npm test
   ```

3. **Run tests in watch mode**:
   ```bash
   npm run test:watch
   ```

4. **Run tests with coverage report**:
   ```bash
   npm run test:coverage
   ```

### Option 2: Using Simple Test Runner

If you don't want to install Jest or encounter issues:

```bash
node simple-test.js
```

### Option 3: Basic Setup Verification

```bash
node test-setup.js
```

## Test Coverage

The test suite covers:

- **`searchFlights` function**:
  - Exact matches
  - Case-insensitive searches
  - No matches scenarios
  - Edge cases (empty/null parameters)

- **`askLLM` function**:
  - API call structure
  - Error handling
  - Response parsing

- **Integration tests**:
  - Complete booking flow
  - Data consistency

- **Edge cases**:
  - Invalid inputs
  - Error conditions

## Test Results

When running Jest tests, you'll see:
- Individual test results with ✅ (pass) or ❌ (fail)
- Summary of passed/failed tests
- Coverage report (if using `npm run test:coverage`)

When running simple tests, you'll see:
- Test-by-test results
- Final summary with success rate

## Troubleshooting

### Common Issues

1. **"node is not recognized"**:
   - Install Node.js from [nodejs.org](https://nodejs.org/)

2. **"npm is not recognized"**:
   - Node.js installation includes npm, reinstall if needed

3. **"Jest not found"**:
   - Run `npm install` to install dependencies

4. **API key errors**:
   - Tests use mocked responses, so API keys aren't required for testing

### Getting Help

If you encounter issues:
1. Check that Node.js is properly installed
2. Verify all dependencies are installed with `npm install`
3. Check the console output for specific error messages

## Continuous Integration

The test suite is designed to work in CI/CD environments:
- No external API calls (mocked)
- Fast execution
- Clear pass/fail indicators
- Coverage reporting
