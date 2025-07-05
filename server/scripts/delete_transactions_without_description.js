#!/usr/bin/env node

/**
 * Script to delete all transactions without a description
 * This is useful for cleaning up data in the finance tracker database
 */

const path = require('path');
const fs = require('fs');
const readline = require('readline');
const sqlite3 = require('sqlite3').verbose();

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

// Promise wrapper for database operations
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({ changes: this.changes, lastID: this.lastID });
    });
  });
}

function getOne(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

// Create readline interface for user interaction
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to count transactions without descriptions
async function countTransactionsWithoutDescription() {
  try {
    // Get all transactions that have null or empty description1
    const result = await getOne(`
      SELECT COUNT(*) as count
      FROM transactions
      WHERE description1 IS NULL OR trim(description1) = ''
    `);
    
    return result ? result.count : 0;
  } catch (error) {
    console.error('Error counting transactions without description:', error);
    throw error;
  }
}

// Function to delete transactions without descriptions
async function deleteTransactionsWithoutDescription() {
  try {
    console.log('Starting deletion of transactions without descriptions...');
    
    // Delete all transactions that don't have a description1 or have an empty description1
    const result = await runQuery(`
      DELETE FROM transactions 
      WHERE description1 IS NULL OR trim(description1) = ''
    `);
    
    console.log(`Successfully deleted ${result.changes} transactions without descriptions`);
    return result.changes;
  } catch (error) {
    console.error('Error deleting transactions without descriptions:', error);
    throw error;
  }
}

// Main function to run the script
async function main() {
  try {
    console.log('===== TRANSACTION DESCRIPTION CLEANUP UTILITY =====');
    console.log('This will permanently delete all transactions that do not have a description.');
    
    // Count transactions without descriptions
    const count = await countTransactionsWithoutDescription();
    
    if (count === 0) {
      console.log('There are no transactions without descriptions to delete.');
      rl.close();
      return;
    }
    
    console.log(`Found ${count} transactions without descriptions that will be deleted.`);
    
    // Confirm with user before proceeding
    rl.question('Are you sure you want to continue? This action cannot be undone. (yes/no): ', async (answer) => {
      if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
        // Proceed with deletion
        const deletedCount = await deleteTransactionsWithoutDescription();
        console.log(`Operation completed. ${deletedCount} transactions deleted.`);
      } else {
        console.log('Operation cancelled. No transactions were deleted.');
      }
      
      rl.close();
    });
  } catch (error) {
    console.error('An error occurred:', error);
    rl.close();
    process.exit(1);
  }
}

// Make sure we're not running in production
if (process.env.NODE_ENV === 'production') {
  console.error('WARNING: This script should not be run in a production environment without careful consideration.');
  rl.question('Are you ABSOLUTELY SURE you want to run this in PRODUCTION? (yes/no): ', (answer) => {
    if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
      main();
    } else {
      console.log('Operation cancelled. No transactions were deleted.');
      rl.close();
    }
  });
} else {
  main();
}

// Handle readline close
rl.on('close', () => {
  // Close the database connection before exiting
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
      process.exit(1);
    }
    console.log('Database connection closed');
    process.exit(0);
  });
});
