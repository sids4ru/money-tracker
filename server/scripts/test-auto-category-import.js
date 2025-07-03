#!/usr/bin/env node

/**
 * Test script to debug the auto-apply categories feature during CSV import
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

const API_URL = 'http://localhost:5001/api';

// Path to a test CSV file
const TEST_CSV_PATH = path.join(__dirname, '../tests/fixtures/test-dummy-transactions.csv');

// Function to check if the CSV file exists
function checkCsvFile() {
  if (!fs.existsSync(TEST_CSV_PATH)) {
    console.error(`Error: Test CSV file not found at ${TEST_CSV_PATH}`);
    process.exit(1);
  }
  console.log(`Found test CSV file at: ${TEST_CSV_PATH}`);
  return fs.readFileSync(TEST_CSV_PATH);
}

// Function to import CSV with auto-apply categories set to true
async function testImportWithAutoCategories() {
  try {
    console.log('\n=== Testing import with auto-apply categories ENABLED ===');
    
    const formData = new FormData();
    formData.append('file', fs.createReadStream(TEST_CSV_PATH));
    formData.append('autoApplyCategories', 'true');
    
    console.log('Sending request with autoApplyCategories=true');
    
    const response = await axios.post(`${API_URL}/transactions/import`, formData, {
      headers: {
        ...formData.getHeaders()
      }
    });
    
    console.log('Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error during import with auto-categories:', error.response?.data || error.message);
    return null;
  }
}

// Function to import CSV with auto-apply categories set to false
async function testImportWithoutAutoCategories() {
  try {
    console.log('\n=== Testing import with auto-apply categories DISABLED ===');
    
    const formData = new FormData();
    formData.append('file', fs.createReadStream(TEST_CSV_PATH));
    formData.append('autoApplyCategories', 'false');
    
    console.log('Sending request with autoApplyCategories=false');
    
    const response = await axios.post(`${API_URL}/transactions/import`, formData, {
      headers: {
        ...formData.getHeaders()
      }
    });
    
    console.log('Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error during import without auto-categories:', error.response?.data || error.message);
    return null;
  }
}

// Main function to run the tests
async function main() {
  try {
    // Check if the CSV file exists
    checkCsvFile();
    
    // Test with auto-categories enabled
    await testImportWithAutoCategories();
    
    // Test with auto-categories disabled
    await testImportWithoutAutoCategories();
    
  } catch (error) {
    console.error('An error occurred:', error);
    process.exit(1);
  }
}

// Run the tests
main().catch(console.error);
