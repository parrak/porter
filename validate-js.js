#!/usr/bin/env node

// JavaScript validation script - run this before pushing to catch syntax errors
const fs = require('fs');
const path = require('path');

// Files to validate
const filesToValidate = [
  'api/chatgpt.js',
  'api/book-flight.js',
  'api/search-flights.js',
  'api/get-flight-offers.js',
  'flight-search.js',
  'utils/telemetry.js',
  'utils/currency-converter.js',
  'utils/common.js'
];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function validateFile(filePath) {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      log(`❌ File not found: ${filePath}`, 'red');
      return false;
    }
    
    // Try to require the file to check syntax
    require(path.resolve(filePath));
    log(`✅ ${filePath}`, 'green');
    return true;
    
  } catch (error) {
    log(`❌ ${filePath}: ${error.message}`, 'red');
    return false;
  }
}

function validateImports() {
  log('\n🔍 Testing module imports...', 'blue');
  
  try {
    // Test importing key modules
    require('./api/get-flight-offers');
    require('./api/chatgpt');
    require('./api/book-flight');
    require('./api/search-flights');
    require('./flight-search');
    require('./utils/telemetry');
    
    log('✅ All module imports successful', 'green');
    return true;
    
  } catch (error) {
    log(`❌ Module import error: ${error.message}`, 'red');
    return false;
  }
}

function main() {
  log('🧪 JavaScript Validation Script', 'blue');
  log('================================\n');
  
  let allValid = true;
  let validCount = 0;
  let totalCount = filesToValidate.length;
  
  // Validate individual files
  log('📁 Validating individual files...', 'blue');
  for (const file of filesToValidate) {
    if (validateFile(file)) {
      validCount++;
    } else {
      allValid = false;
    }
  }
  
  // Test module imports
  const importsValid = validateImports();
  if (!importsValid) {
    allValid = false;
  }
  
  // Summary
  log('\n📋 Validation Summary', 'blue');
  log('===================');
  log(`Files validated: ${validCount}/${totalCount}`, validCount === totalCount ? 'green' : 'red');
  log(`Module imports: ${importsValid ? 'PASS' : 'FAIL'}`, importsValid ? 'green' : 'red');
  
  if (allValid) {
    log('\n🎉 All JavaScript files are valid! Safe to push.', 'green');
    process.exit(0);
  } else {
    log('\n⚠️  Some validation issues found. Please fix before pushing.', 'red');
    process.exit(1);
  }
}

// Run validation
main();
