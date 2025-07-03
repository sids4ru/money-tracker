#!/usr/bin/env node

/**
 * Test runner script for the finance tracker application.
 * This script sets up the appropriate environment and runs tests safely.
 */

const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// Parse command line arguments
const args = process.argv.slice(2);
const testType = args[0] || 'unit';
const specificTest = args[1] || null;

// Set environment variables for testing
process.env.NODE_ENV = 'test';

// Display a warning banner
console.log('='.repeat(80));
console.log('WARNING: Running tests in TEST mode. This will use an isolated test database.');
console.log('='.repeat(80));

// Define test types and their paths
const testTypes = {
  unit: {
    command: 'jest',
    args: ['--config', 'jest.config.js'],
    description: 'Run unit tests using Jest'
  },
  integration: {
    command: 'node',
    baseDir: path.join(__dirname, 'tests', 'integration'),
    description: 'Run integration tests'
  }
};

// Validate the test type
if (!testTypes[testType]) {
  console.error(`Error: Invalid test type '${testType}'`);
  console.log('\nAvailable test types:');
  Object.keys(testTypes).forEach(type => {
    console.log(`  ${type} - ${testTypes[type].description}`);
  });
  process.exit(1);
}

// Function to run a command
function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    console.log(`Running command: ${command} ${args.join(' ')}`);
    
    const proc = spawn(command, args, { 
      stdio: 'inherit',
      shell: process.platform === 'win32' // Use shell on Windows
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
    
    proc.on('error', (err) => {
      reject(err);
    });
  });
}

// Run the tests based on the type
async function runTests() {
  try {
    if (testType === 'unit') {
      // For unit tests, use Jest
      let jestArgs = [...testTypes.unit.args];
      if (specificTest) {
        // Add specific test file pattern if provided
        jestArgs.push(specificTest);
      }
      
      await runCommand(testTypes.unit.command, jestArgs);
    } 
    else if (testType === 'integration') {
      // For integration tests
      const baseDir = testTypes.integration.baseDir;
      
      // If a specific test is specified, run just that test
      if (specificTest) {
        const testPath = path.join(baseDir, `${specificTest}.test.js`);
        if (!fs.existsSync(testPath)) {
          console.error(`Error: Integration test file '${testPath}' not found`);
          process.exit(1);
        }
        
        await runCommand('node', [testPath]);
      } 
      // Otherwise, run all integration tests
      else {
        const testFiles = fs.readdirSync(baseDir)
          .filter(file => file.endsWith('.test.js'))
          .map(file => path.join(baseDir, file));
        
        for (const testFile of testFiles) {
          console.log(`\nRunning integration test: ${path.basename(testFile)}`);
          await runCommand('node', [testFile]);
        }
      }
    }
    
    console.log('\n✅ All tests completed successfully!');
  } catch (error) {
    console.error('\n❌ Test execution failed:', error.message);
    process.exit(1);
  }
}

// Run the tests
runTests();
