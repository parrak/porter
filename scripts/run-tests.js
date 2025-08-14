#!/usr/bin/env node

/**
 * Comprehensive Test Runner for Porter Travel
 * This script runs all tests and generates reports for CI/CD
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  // Test types and their commands
  testTypes: {
    unit: 'npm run test:unit',
    integration: 'npm run test:integration',
    coverage: 'npm run test:coverage',
    all: 'npm test'
  },
  
  // Coverage thresholds
  coverageThresholds: {
    branches: 70,
    functions: 70,
    lines: 70,
    statements: 70
  },
  
  // Output directories
  outputDirs: {
    coverage: 'coverage',
    reports: 'test-reports',
    artifacts: 'test-artifacts'
  }
};

// Colors for console output
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Utility functions
const log = (message, color = 'reset') => {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
};

const logHeader = (title) => {
  log('\n' + '='.repeat(60), 'cyan');
  log(` ${title}`, 'bright');
  log('='.repeat(60), 'cyan');
};

const logSection = (title) => {
  log(`\n${title}`, 'yellow');
  log('-'.repeat(title.length));
};

const runCommand = (command, description) => {
  try {
    logSection(description);
    log(`Running: ${command}`, 'blue');
    
    const startTime = Date.now();
    const result = execSync(command, { 
      stdio: 'inherit',
      encoding: 'utf8',
      env: { ...process.env, FORCE_COLOR: '1' }
    });
    const duration = Date.now() - startTime;
    
    log(`✅ ${description} completed in ${duration}ms`, 'green');
    return { success: true, duration, output: result };
  } catch (error) {
    log(`❌ ${description} failed: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
};

const createOutputDirectories = () => {
  Object.values(TEST_CONFIG.outputDirs).forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

const generateTestReport = (results) => {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: Object.keys(results).length,
      passed: Object.values(results).filter(r => r.success).length,
      failed: Object.values(results).filter(r => !r.success).length
    },
    results: results,
    coverage: {
      thresholds: TEST_CONFIG.coverageThresholds,
      status: 'pending'
    }
  };
  
  // Save report to file
  const reportPath = path.join(TEST_CONFIG.outputDirs.reports, 'test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  return report;
};

const checkCoverage = () => {
  const coveragePath = path.join(TEST_CONFIG.outputDirs.coverage, 'coverage-summary.json');
  
  if (fs.existsSync(coveragePath)) {
    const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
    const total = coverage.total;
    
    logSection('Coverage Analysis');
    log(`Total Coverage: ${total.lines.pct}%`, total.lines.pct >= 70 ? 'green' : 'red');
    log(`Lines: ${total.lines.covered}/${total.lines.total} (${total.lines.pct}%)`);
    log(`Functions: ${total.functions.covered}/${total.functions.total} (${total.functions.pct}%)`);
    log(`Branches: ${total.branches.covered}/${total.branches.total} (${total.branches.pct}%)`);
    log(`Statements: ${total.statements.covered}/${total.statements.total} (${total.statements.pct}%)`);
    
    // Check thresholds
    const meetsThresholds = 
      total.lines.pct >= TEST_CONFIG.coverageThresholds.lines &&
      total.functions.pct >= TEST_CONFIG.coverageThresholds.functions &&
      total.branches.pct >= TEST_CONFIG.coverageThresholds.branches &&
      total.statements.pct >= TEST_CONFIG.coverageThresholds.statements;
    
    if (meetsThresholds) {
      log('✅ Coverage thresholds met!', 'green');
    } else {
      log('❌ Coverage thresholds not met!', 'red');
    }
    
    return { meetsThresholds, coverage: total };
  }
  
  return { meetsThresholds: false, coverage: null };
};

const runAllTests = async () => {
  logHeader('🚀 Porter Travel Test Suite');
  log(`Starting comprehensive test run at ${new Date().toLocaleString()}`);
  
  // Create output directories
  createOutputDirectories();
  
  // Run tests
  const results = {};
  
  // Run unit tests
  results.unit = runCommand(TEST_CONFIG.testTypes.unit, 'Unit Tests');
  
  // Run integration tests
  results.integration = runCommand(TEST_CONFIG.testTypes.integration, 'Integration Tests');
  
  // Run coverage tests
  results.coverage = runCommand(TEST_CONFIG.testTypes.coverage, 'Coverage Tests');
  
  // Generate test report
  const report = generateTestReport(results);
  
  // Check coverage
  const coverageResult = checkCoverage();
  
  // Final summary
  logHeader('📊 Test Summary');
  log(`Total Tests: ${report.summary.total}`, 'bright');
  log(`Passed: ${report.summary.passed}`, 'green');
  log(`Failed: ${report.summary.failed}`, report.summary.failed > 0 ? 'red' : 'green');
  
  if (coverageResult.meetsThresholds) {
    log('✅ All tests passed and coverage thresholds met!', 'green');
  } else {
    log('⚠️  Tests completed but coverage thresholds not met', 'yellow');
  }
  
  // Exit with appropriate code
  const hasFailures = report.summary.failed > 0;
  const coverageFailed = !coverageResult.meetsThresholds;
  
  if (hasFailures) {
    log('\n❌ Test suite failed!', 'red');
    process.exit(1);
  } else if (coverageFailed) {
    log('\n⚠️  Tests passed but coverage insufficient', 'yellow');
    process.exit(0); // Don't fail build for coverage
  } else {
    log('\n🎉 All tests passed successfully!', 'green');
    process.exit(0);
  }
};

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    log(`\n💥 Test runner failed: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  TEST_CONFIG,
  COLORS
};
