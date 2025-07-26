#!/usr/bin/env node

/**
 * Database Date Format Standardization Script
 * 
 * This script updates all transaction dates in the database to use the
 * standardized YYYY-MM-DD format. It will remove any time components
 * and ensure consistent date representation across the database.
 */

const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

// Define standardizeDate function directly in this script to avoid module dependencies
function standardizeDate(dateString) {
  if (!dateString) return '';

  // Remove any time component
  const dateOnly = dateString.split(' ')[0];
  
  // Try to determine the format and parse accordingly
  let date;
  
  if (dateOnly.includes('/')) {
    // Handle DD/MM/YYYY or MM/DD/YYYY
    const parts = dateOnly.split('/');
    if (parts.length !== 3) return dateOnly; // Return as is if not in expected format
    
    // Determine if day or month comes first based on values
    const first = parseInt(parts[0], 10);
    const second = parseInt(parts[1], 10);
    
    if (first > 12) {
      // First part is day (European format DD/MM/YYYY)
      date = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
    } else {
      // Assume first part is month (US format MM/DD/YYYY) or European (DD/MM/YYYY) if both < 12
      // Since our app appears to use European format by default, we'll assume DD/MM/YYYY
      date = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
    }
  } else if (dateOnly.includes('-')) {
    // Handle YYYY-MM-DD or DD-MM-YYYY
    const parts = dateOnly.split('-');
    if (parts.length !== 3) return dateOnly; // Return as is if not in expected format
    
    // If first part is 4 digits, assume YYYY-MM-DD
    if (parts[0].length === 4) {
      date = new Date(dateOnly);
    } else {
      // Otherwise assume DD-MM-YYYY
      date = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
    }
  } else {
    // If format cannot be determined, try standard Date parsing
    date = new Date(dateOnly);
  }
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    return dateOnly; // Return as is if date is invalid
  }
  
  // Format date as YYYY-MM-DD
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}

// Define database path
const DATA_DIR = path.resolve(__dirname, '../data');
const DB_PATH = path.join(DATA_DIR, 'finance_tracker.db');

// Check if database exists
if (!fs.existsSync(DB_PATH)) {
  console.error(`Error: Database file not found at ${DB_PATH}`);
  process.exit(1);
}

// Connect to the database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
    process.exit(1);
  }
  console.log(`Connected to SQLite database at ${DB_PATH}`);
});

// Promise wrapper for database query operations
function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

// Run a SQL statement
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

// Main function to standardize dates
async function standardizeDatesInDatabase() {
  try {
    console.log('Starting date standardization process...');
    
    // Get all transactions with their current date format
    const transactions = await query('SELECT id, transaction_date FROM transactions');
    console.log(`Found ${transactions.length} transactions to process`);
    
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    
    // Start a transaction for better performance and atomicity
    await run('BEGIN TRANSACTION');
    
    // Process each transaction
    for (const transaction of transactions) {
      try {
        // Skip if already in standard format (YYYY-MM-DD)
        const originalDate = transaction.transaction_date;
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/; // Match YYYY-MM-DD
        
        if (dateRegex.test(originalDate)) {
          skipped++;
          continue;
        }
        
        // Standardize the date
        const standardizedDate = standardizeDate(originalDate);
        
        // Update the database record
        await run(
          'UPDATE transactions SET transaction_date = ? WHERE id = ?',
          [standardizedDate, transaction.id]
        );
        
        updated++;
        
        // Log progress every 100 records
        if ((updated + skipped) % 100 === 0) {
          console.log(`Processed ${updated + skipped} transactions (${updated} updated, ${skipped} already standard)`);
        }
      } catch (error) {
        console.error(`Error processing transaction ID ${transaction.id}:`, error);
        errors++;
      }
    }
    
    // Commit the transaction
    await run('COMMIT');
    
    console.log('\nDate standardization completed:');
    console.log(`- ${transactions.length} total transactions`);
    console.log(`- ${updated} transactions updated to standard format`);
    console.log(`- ${skipped} transactions already in standard format`);
    console.log(`- ${errors} errors encountered`);
    
  } catch (error) {
    // Rollback in case of errors
    try {
      await run('ROLLBACK');
    } catch (rollbackError) {
      console.error('Error rolling back transaction:', rollbackError);
    }
    
    console.error('Error standardizing dates:', error);
    process.exit(1);
  } finally {
    // Close the database connection
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      }
      console.log('Database connection closed');
    });
  }
}

// Execute the function
standardizeDatesInDatabase();
