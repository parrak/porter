#!/usr/bin/env node

/**
 * Test runner script for Porter Travel API
 * Supports different test modes and environments
 */

const { spawn } = require('child_process');
const path = require('path');

const TEST_MODES = {
  unit: 'tests/unit',
  integration: 'tests/integration',
  all: 'tests',
  watch: '--watch',
  coverage: '--coverage',
  ci: '--ci --coverage --watchAll=false'
};

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function runTests(mode = 'all', options = {}) {
  console.log(`🧪 Running ${mode} tests...\n`);

  try {
    const args = ['test'];
    
    if (mode !== 'all') {
      if (TEST_MODES[mode]) {
        args.push('--testPathPattern', TEST_MODES[mode]);
      } else if (mode === 'watch') {
        args.push('--watch');
      } else if (mode === 'coverage') {
        args.push('--coverage');
      } else if (mode === 'ci') {
        args.push('--ci', '--coverage', '--watchAll=false');
      }
    }

    if (options.coverage) {
      args.push('--coverage');
    }

    if (options.verbose) {
      args.push('--verbose');
    }

    await runCommand('npm', args);
    console.log(`\n✅ ${mode} tests completed successfully!`);
    
  } catch (error) {
    console.error(`\n❌ ${mode} tests failed:`, error.message);
    process.exit(1);
  }
}

async function runLinting() {
  console.log('🔍 Running linting...\n');
  
  try {
    await runCommand('npm', ['run', 'lint']);
    console.log('\n✅ Linting completed successfully!');
  } catch (error) {
    console.error('\n❌ Linting failed:', error.message);
    process.exit(1);
  }
}

async function runSecurityAudit() {
  console.log('🔒 Running security audit...\n');
  
  try {
    await runCommand('npm', ['audit', '--audit-level=moderate']);
    console.log('\n✅ Security audit completed successfully!');
  } catch (error) {
    console.error('\n❌ Security audit failed:', error.message);
    process.exit(1);
  }
}

async function runFullTestSuite() {
  console.log('🚀 Running full test suite...\n');
  
  try {
    // Run linting
    await runLinting();
    
    // Run unit tests
    await runTests('unit');
    
    // Run integration tests
    await runTests('integration');
    
    // Run security audit
    await runSecurityAudit();
    
    console.log('\n🎉 Full test suite completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Full test suite failed:', error.message);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const mode = args[0] || 'all';
const options = {
  coverage: args.includes('--coverage'),
  verbose: args.includes('--verbose'),
  watch: args.includes('--watch')
};

// Main execution
async function main() {
  console.log('🧪 Porter Travel API Test Runner\n');
  
  if (mode === 'full') {
    await runFullTestSuite();
  } else if (mode === 'lint') {
    await runLinting();
  } else if (mode === 'security') {
    await runSecurityAudit();
  } else {
    await runTests(mode, options);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the main function
main().catch((error) => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
