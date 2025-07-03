const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// Base URL for API
const API_URL = 'http://localhost:5001/api';

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
  console.log('Starting E2E import test...');
  
  try {
    // Get count of transactions before import
    console.log('Getting initial transaction count...');
    const initialTransactions = await getAllTransactions();
    console.log(`Initial transaction count: ${initialTransactions.length}`);
    
    // Path to test CSV file with unique transactions
    const csvFilePath = path.join(__dirname, 'test-unique-transactions.csv');
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
    
  } catch (error) {
    console.error('E2E test failed with error:', error.message);
  }
}

// Run the test
testE2EImport();
