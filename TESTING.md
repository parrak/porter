# 🧪 Testing Guide for Porter Travel API

This document provides comprehensive information about the testing suite for the Porter Travel API.

## 📋 Table of Contents

- [Overview](#overview)
- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Test Types](#test-types)
- [CI/CD Integration](#cicd-integration)
- [Writing Tests](#writing-tests)
- [Test Data](#test-data)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

The testing suite ensures code quality, reliability, and prevents regressions. It includes:

- **Unit Tests**: Test individual functions and components in isolation
- **Integration Tests**: Test API endpoints and database interactions
- **CI/CD Pipeline**: Automated testing on every push and deployment
- **Coverage Reports**: Track test coverage and identify untested code
- **Security Audits**: Check for vulnerabilities in dependencies

## 🏗️ Test Structure

```
tests/
├── setup.js                 # Global test configuration
├── unit/                    # Unit tests
│   ├── utils.test.js       # Utility function tests
│   └── api.test.js         # API endpoint tests
└── integration/             # Integration tests
    ├── api-integration.test.js  # API integration tests
    └── database.test.js         # Database integration tests
```

## 🚀 Running Tests

### Quick Start

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test types
npm run test:unit
npm run test:integration

# Run in watch mode
npm run test:watch
```

### Using the Test Runner Script

```bash
# Run all tests
node scripts/run-tests.js

# Run specific test types
node scripts/run-tests.js unit
node scripts/run-tests.js integration
node scripts/run-tests.js full

# Run with options
node scripts/run-tests.js all --coverage --verbose
```

### Test Modes

| Mode | Description | Command |
|------|-------------|---------|
| `unit` | Unit tests only | `npm run test:unit` |
| `integration` | Integration tests only | `npm run test:integration` |
| `all` | All tests | `npm test` |
| `watch` | Watch mode for development | `npm run test:watch` |
| `coverage` | Generate coverage report | `npm run test:coverage` |
| `ci` | CI/CD mode | `npm run test:ci` |

## 🧪 Test Types

### Unit Tests

Unit tests verify individual functions and components work correctly in isolation.

**Location**: `tests/unit/`

**Examples**:
- Utility function validation
- Input sanitization
- Error handling
- Business logic

**Running Unit Tests**:
```bash
npm run test:unit
```

### Integration Tests

Integration tests verify that different components work together correctly.

**Location**: `tests/integration/`

**Examples**:
- API endpoint functionality
- Database operations
- OAuth flow
- Error responses

**Running Integration Tests**:
```bash
npm run test:integration
```

### Database Tests

Database tests verify database schema, constraints, and operations.

**Location**: `tests/integration/database.test.js`

**Examples**:
- Table creation and constraints
- Data validation
- JSONB operations
- Foreign key relationships

## 🔄 CI/CD Integration

### GitHub Actions Workflow

The `.github/workflows/test-and-deploy.yml` file defines the CI/CD pipeline:

1. **Test Job**: Runs on multiple Node.js versions
2. **Security Job**: Audits dependencies for vulnerabilities
3. **Deploy Job**: Deploys to Vercel after successful tests

### Automated Testing

Tests run automatically on:
- Every push to `main` or `deploy` branches
- Every pull request
- Before deployment

### Required Secrets

Set these secrets in your GitHub repository:

```bash
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_org_id
VERCEL_PROJECT_ID=your_project_id
TEST_DATABASE_URL=your_test_database_url  # Optional
```

## ✍️ Writing Tests

### Test File Structure

```javascript
describe('Feature Name', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    // Setup test data
    mockReq = { /* mock request */ };
    mockRes = { /* mock response */ };
  });

  it('should do something specific', async () => {
    // Arrange
    const input = 'test data';
    
    // Act
    const result = await functionUnderTest(input);
    
    // Assert
    expect(result).toBe('expected output');
  });

  afterEach(() => {
    // Cleanup
  });
});
```

### Testing Utilities

#### Global Test Data

```javascript
// Available in all tests
global.TEST_DATA = {
  validUser: { /* user data */ },
  validPassenger: { /* passenger data */ },
  validFlightSearch: { /* flight search data */ }
};
```

#### Mock Functions

```javascript
// Mock console methods
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn()
};

// Mock fetch
global.fetch = jest.fn();
```

### Best Practices

1. **Descriptive Test Names**: Use clear, descriptive test names
2. **Arrange-Act-Assert**: Structure tests with clear sections
3. **Test Isolation**: Each test should be independent
4. **Mock External Dependencies**: Don't rely on external services
5. **Clean Up**: Always clean up test data
6. **Error Testing**: Test both success and failure scenarios

## 📊 Test Data

### Test Environment Variables

```bash
NODE_ENV=test
TESTING=true
```

### Database Test Setup

For database tests, ensure you have:
- Test database credentials
- Proper schema setup
- Test data isolation

### Mock Data Examples

```javascript
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  display_name: 'Test User'
};

const mockPassenger = {
  passenger_type: 'adult',
  first_name: 'John',
  last_name: 'Doe',
  document_number: 'US123456789'
};
```

## 🔧 Troubleshooting

### Common Issues

#### Tests Failing Due to Database Connection

```bash
# Check database connection
npm run test-db

# Verify environment variables
echo $DATABASE_URL
```

#### Mock Issues

```bash
# Clear Jest cache
npx jest --clearCache

# Reset mocks
jest.resetAllMocks();
```

#### Coverage Issues

```bash
# Generate coverage report
npm run test:coverage

# Check coverage thresholds
# Update jest.config.js if needed
```

### Debug Mode

```bash
# Run tests with debug output
DEBUG=* npm test

# Run specific test with verbose output
npm test -- --verbose
```

### Performance Issues

```bash
# Run tests in parallel
npm test -- --maxWorkers=4

# Run tests sequentially
npm test -- --runInBand
```

## 📈 Coverage Reports

### Coverage Types

- **Statements**: Percentage of statements executed
- **Branches**: Percentage of branches executed
- **Functions**: Percentage of functions called
- **Lines**: Percentage of lines executed

### Coverage Thresholds

Set minimum coverage requirements in `jest.config.js`:

```javascript
module.exports = {
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80
    }
  }
};
```

### Viewing Coverage

```bash
# Generate HTML coverage report
npm run test:coverage

# Open coverage report
open coverage/lcov-report/index.html
```

## 🚀 Next Steps

### Adding New Tests

1. Create test file in appropriate directory
2. Follow naming convention: `*.test.js`
3. Import functions/endpoints to test
4. Write comprehensive test cases
5. Ensure good coverage

### Expanding Test Suite

- Add performance tests
- Add load testing
- Add end-to-end tests
- Add visual regression tests

### Continuous Improvement

- Monitor test coverage trends
- Identify slow tests
- Optimize test execution
- Add test documentation

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [API Testing Guide](https://www.postman.com/use-cases/api-testing/)

---

**Happy Testing! 🧪✨**
