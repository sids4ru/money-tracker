const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

/**
 * End-to-end test script for transaction import functionality
 * IMPORTANT: This script should only be run in a test environment!
 */

// Ensure this script is not run in production
if (process.env.NODE_ENV === 'production') {
  console.error('❌ ERROR: This test script should not be run in production environment!');
  process.exit(1);
}

// Import database connection with test database support
const testDb = require('../utils/testDbIntegration');

// Base URL for test API (can be overridden with env variable)
const API_URL = process.env.TEST_API_URL || 'http://localhost:5001/api';

// Function to get all transactions from the API
async function getAllTransactions() {
  try {
    const response = await axios.get(`${API_URL}/transactions`);
    return response.data.data;
  } catch (error) {
    console.error('Error getting transactions:', error.message);
    throw error;
  }
}

// Function to import transactions via the API
async function importTransactionsCSV(filePath) {
  try {
    // Create form data
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));
    
    // Send request
    const response = await axios.post(`${API_URL}/transactions/import`, form, {
      headers: {
        ...form.getHeaders(),
      },
    });
    
    return response.data;
  } catch (error) {
    console.error('Error importing transactions:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

// Main test function
async function testE2EImport() {
  console.log('Starting E2E import test with test API...');
  
  try {
    // Set up test database before running tests
    await testDb.setupTestDb();
    
    // Get count of transactions before import
    console.log('Getting initial transaction count...');
    const initialTransactions = await getAllTransactions();
    console.log(`Initial transaction count: ${initialTransactions.length}`);
    
    // Path to test CSV file with unique transactions
    const csvFilePath = path.join(__dirname, '../fixtures/test-unique-transactions.csv');
    console.log(`Importing CSV file: ${csvFilePath}`);
    
    // Import transactions
    const importResult = await importTransactionsCSV(csvFilePath);
    console.log('Import result:', importResult);
    
    // Get updated transactions
    console.log('Verifying transaction count after import...');
    const updatedTransactions = await getAllTransactions();
    console.log(`Updated transaction count: ${updatedTransactions.length}`);
    
    // Compare counts (considering potential duplicates)
    const expectedAddedCount = importResult.added;
    const actualAddedCount = updatedTransactions.length - initialTransactions.length;
    
    console.log(`Expected added transactions: ${expectedAddedCount}`);
    console.log(`Actual added transactions: ${actualAddedCount}`);
    
    if (actualAddedCount === expectedAddedCount) {
      console.log('✅ E2E Import Test PASSED: Transaction count matches expected');
    } else {
      console.log('❌ E2E Import Test FAILED: Transaction count does not match expected');
    }
    
    // Clean up after test
    await testDb.teardownTestDb();
    
  } catch (error) {
    console.error('E2E test failed with error:', error.message);
    // Ensure we clean up even if the test fails
    await testDb.teardownTestDb();
  }
}

// Only run the test when this script is executed directly
if (require.main === module) {
  testE2EImport().finally(() => {
    console.log('E2E import test complete');
  });
}

module.exports = {
  testE2EImport,
  importTransactionsCSV,
  getAllTransactions
};
