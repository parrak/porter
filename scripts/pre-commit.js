#!/usr/bin/env node

/**
 * Pre-commit Hook Script
 * Runs tests before allowing commits to ensure code quality
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

const log = (message, color = 'reset') => {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
};

const logHeader = (title) => {
  log('\n' + '='.repeat(50), 'blue');
  log(` ${title}`, 'bright');
  log('='.repeat(50), 'blue');
};

const runCommand = (command, description) => {
  try {
    log(`\n🔍 ${description}...`, 'yellow');
    log(`Running: ${command}`, 'blue');
    
    const startTime = Date.now();
    execSync(command, { 
      stdio: 'inherit',
      encoding: 'utf8',
      env: { ...process.env, NODE_ENV: 'test', TESTING: 'true' }
    });
    const duration = Date.now() - startTime;
    
    log(`✅ ${description} completed in ${duration}ms`, 'green');
    return { success: true, duration };
  } catch (error) {
    log(`❌ ${description} failed: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
};

const checkStagedFiles = () => {
  try {
    const stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf8' })
      .split('\n')
      .filter(file => file.trim() && !file.includes('node_modules'));
    
    if (stagedFiles.length === 0) {
      log('ℹ️  No staged files to test', 'yellow');
      return [];
    }
    
    log(`📁 Found ${stagedFiles.length} staged files:`, 'blue');
    stagedFiles.forEach(file => log(`   ${file}`));
    
    return stagedFiles;
  } catch (error) {
    log(`❌ Error checking staged files: ${error.message}`, 'red');
    return [];
  }
};

const runPreCommitTests = async () => {
  logHeader('🚀 Pre-commit Test Suite');
  log(`Running pre-commit checks at ${new Date().toLocaleString()}`);
  
  // Check if we're in a git repository
  if (!fs.existsSync('.git')) {
    log('❌ Not in a git repository. Skipping pre-commit checks.', 'red');
    process.exit(0);
  }
  
  // Check staged files
  const stagedFiles = checkStagedFiles();
  
  // Run quick tests
  const results = {};
  
  // Run linting (if configured)
  if (fs.existsSync('package.json')) {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    if (packageJson.scripts.lint && packageJson.scripts.lint !== "echo 'Linting not configured yet'") {
      results.lint = runCommand('npm run lint', 'Linting');
    }
  }
  
  // Run unit tests
  results.unit = runCommand('npm run test:unit', 'Unit Tests');
  
  // Run quick integration tests (if database is available)
  try {
    // Check if we can connect to database
    const { testConnection } = require('../database/connection');
    if (await testConnection()) {
      results.integration = runCommand('npm run test:integration', 'Integration Tests');
    } else {
      log('⚠️  Database not available, skipping integration tests', 'yellow');
    }
  } catch (error) {
    log('⚠️  Database connection failed, skipping integration tests', 'yellow');
  }
  
  // Run security audit
  results.security = runCommand('npm run security:audit', 'Security Audit');
  
  // Summary
  logHeader('📊 Pre-commit Summary');
  const total = Object.keys(results).length;
  const passed = Object.values(results).filter(r => r.success).length;
  const failed = total - passed;
  
  log(`Total Checks: ${total}`, 'bright');
  log(`Passed: ${passed}`, 'green');
  log(`Failed: ${failed}`, failed > 0 ? 'red' : 'green');
  
  // Show detailed results
  Object.entries(results).forEach(([check, result]) => {
    const status = result.success ? '✅' : '❌';
    const color = result.success ? 'green' : 'red';
    log(`${status} ${check}: ${result.success ? 'PASSED' : 'FAILED'}`, color);
  });
  
  // Exit with appropriate code
  if (failed > 0) {
    log('\n❌ Pre-commit checks failed! Please fix issues before committing.', 'red');
    log('\n💡 You can run individual checks manually:', 'yellow');
    log('   npm run test:unit', 'blue');
    log('   npm run test:integration', 'blue');
    log('   npm run security:audit', 'blue');
    process.exit(1);
  } else {
    log('\n🎉 All pre-commit checks passed! You can commit safely.', 'green');
    process.exit(0);
  }
};

// Run if this script is executed directly
if (require.main === module) {
  runPreCommitTests().catch(error => {
    log(`\n💥 Pre-commit hook failed: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = {
  runPreCommitTests,
  checkStagedFiles,
  runCommand
};
