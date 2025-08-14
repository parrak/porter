# 🧪 Porter Travel Testing Guide

## Overview
This guide covers the comprehensive testing setup for Porter Travel, including automated testing, CI/CD integration, and best practices for maintaining code quality.

## 🚀 Quick Start

### Run All Tests
```bash
npm run test:full
```

### Run Specific Test Types
```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Coverage tests
npm run test:coverage

# Quick tests (no failures)
npm run test:quick

# Debug tests
npm run test:debug
```

### CI/CD Commands
```bash
# Full CI pipeline
npm run ci:full

# Quick CI check
npm run ci:test

# Security audit
npm run security:audit
```

## 📁 Test Structure

```
tests/
├── setup.js                 # Global test setup
├── test-config.js          # Test configuration and utilities
├── unit/                   # Unit tests
│   ├── api.test.js        # API unit tests
│   ├── chatgpt.test.js    # ChatGPT integration tests
│   └── utils.test.js      # Utility function tests
└── integration/            # Integration tests
    ├── api-integration.test.js  # API integration tests
    └── database.test.js         # Database integration tests
```

## 🔧 Test Configuration

### Environment Variables
- `NODE_ENV=test` - Sets test environment
- `TESTING=true` - Enables test mode
- `TEST_DATABASE_URL` - Test database connection

### Jest Configuration
- **Coverage Thresholds**: 70% for all metrics
- **Timeout**: 30 seconds per test
- **Environment**: Node.js
- **Setup Files**: `tests/setup.js`, `tests/test-config.js`

## 🧪 Writing Tests

### Unit Tests
Unit tests should test individual functions in isolation:

```javascript
describe('User Management', () => {
  test('should create user with valid data', () => {
    const userData = TEST_UTILS.generateTestUser();
    const result = createUser(userData);
    
    expect(result).toBeDefined();
    expect(result.email).toBe(userData.email);
  });
});
```

### Integration Tests
Integration tests should test component interactions:

```javascript
describe('Database Integration', () => {
  test('should connect to database successfully', async () => {
    const isConnected = await testConnection();
    expect(isConnected).toBe(true);
  });
});
```

### Test Utilities
Use the provided test utilities for consistent test data:

```javascript
const { TEST_UTILS } = require('../test-config');

// Generate test data
const testUser = TEST_UTILS.generateTestUser();
const testPassenger = TEST_UTILS.generateTestPassenger();
const testFlightSearch = TEST_UTILS.generateTestFlightSearch();
```

## 🔄 Automated Testing

### GitHub Actions
Tests run automatically on:
- **Push** to `main` or `deploy` branches
- **Pull Requests** to `main` or `deploy` branches
- **Tags** starting with `v*`
- **Daily** at 2 AM UTC (scheduled)

### Pre-commit Hooks
Run tests before each commit:
```bash
node scripts/pre-commit.js
```

### CI/CD Pipeline
1. **Test Job**: Runs comprehensive test suite
2. **Security Job**: Security audit and vulnerability checks
3. **Quality Job**: Coverage analysis and validation
4. **Deploy Job**: Production deployment (deploy branch only)
5. **Notify Job**: Results summary and notifications

## 📊 Test Coverage

### Coverage Requirements
- **Lines**: 70% minimum
- **Functions**: 70% minimum
- **Branches**: 70% minimum
- **Statements**: 70% minimum

### Coverage Reports
- **HTML**: `coverage/index.html`
- **JSON**: `coverage/coverage-summary.json`
- **LCOV**: `coverage/lcov.info`

## 🗄️ Database Testing

### Test Database
- Uses production Neon database for integration tests
- Creates test data in isolated transactions
- Automatically cleans up after tests
- Tests all new database features

### Database Test Utilities
```javascript
// Clean up test data
await TEST_UTILS.cleanupTestData(pool, userId);

// Generate test database connections
const { TEST_CONFIG } = require('../test-config');
const pool = new Pool(TEST_CONFIG.database);
```

## 🚨 Error Handling

### Test Failures
When tests fail:
1. Check the error message and stack trace
2. Verify test data and environment
3. Run individual test files for debugging
4. Check database connectivity
5. Review recent code changes

### Common Issues
- **Database Connection**: Ensure Neon database is accessible
- **Environment Variables**: Check test environment setup
- **Dependencies**: Verify all packages are installed
- **Async Operations**: Ensure proper async/await usage

## 📈 Performance Testing

### Test Performance
- **Unit Tests**: < 1 second each
- **Integration Tests**: < 5 seconds each
- **Full Suite**: < 2 minutes total

### Optimization Tips
- Use `beforeAll` and `afterAll` for setup/teardown
- Mock external API calls
- Use test databases for integration tests
- Implement proper cleanup procedures

## 🔒 Security Testing

### Security Checks
- **Dependency Audit**: `npm audit`
- **Vulnerability Scanning**: `npx audit-ci`
- **Code Analysis**: Security-focused linting rules

### Security Best Practices
- Never commit API keys or secrets
- Use environment variables for configuration
- Validate all user inputs
- Implement proper authentication

## 📝 Test Documentation

### Test Naming Conventions
- **Describe blocks**: Feature or component name
- **Test names**: Should describe expected behavior
- **File names**: `*.test.js` or `*.spec.js`

### Example Test Structure
```javascript
describe('Feature Name', () => {
  describe('when condition is met', () => {
    test('should perform expected action', () => {
      // Test implementation
    });
  });
  
  describe('when condition is not met', () => {
    test('should handle error gracefully', () => {
      // Test implementation
    });
  });
});
```

## 🚀 Continuous Improvement

### Regular Tasks
- **Weekly**: Review test coverage reports
- **Monthly**: Update test dependencies
- **Quarterly**: Review and update test strategies
- **Annually**: Comprehensive test suite audit

### Metrics to Track
- Test coverage percentage
- Test execution time
- Test failure rate
- Security vulnerability count
- Build success rate

## 🆘 Getting Help

### Troubleshooting
1. Check the test logs and error messages
2. Review the test configuration
3. Verify environment setup
4. Check database connectivity
5. Review recent changes

### Resources
- **Jest Documentation**: https://jestjs.io/
- **GitHub Actions**: https://docs.github.com/en/actions
- **Testing Best Practices**: See internal documentation
- **Team Support**: Reach out to the development team

---

## 📋 Quick Reference

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests |
| `npm run test:unit` | Unit tests only |
| `npm run test:integration` | Integration tests only |
| `npm run test:coverage` | Coverage report |
| `npm run test:full` | Comprehensive test suite |
| `npm run ci:full` | Full CI pipeline |
| `npm run security:audit` | Security check |

---

*Last updated: August 13, 2025*
*Maintained by: Porter Travel Development Team*
