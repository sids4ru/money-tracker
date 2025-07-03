#!/usr/bin/env node

/**
 * Script to delete all transactions without a category ID
 * This is useful for cleaning up data after implementing auto-categorization
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

// Function to count uncategorized transactions
async function countUncategorizedTransactions() {
  try {
    // Get all transactions that don't have an entry in the transaction_categories table
    const result = await getOne(`
      SELECT COUNT(*) as count
      FROM transactions t
      WHERE NOT EXISTS (
        SELECT 1
        FROM transaction_categories tc
        WHERE tc.transaction_id = t.id
      )
    `);
    
    return result ? result.count : 0;
  } catch (error) {
    console.error('Error counting uncategorized transactions:', error);
    throw error;
  }
}

// Function to delete uncategorized transactions
async function deleteUncategorizedTransactions() {
  try {
    console.log('Starting deletion of uncategorized transactions...');
    
    // Delete all transactions that don't have an entry in the transaction_categories table
    // Using EXISTS is generally more efficient than NOT IN for large datasets
    const result = await runQuery(`
      DELETE FROM transactions 
      WHERE NOT EXISTS (
        SELECT 1
        FROM transaction_categories
        WHERE transaction_categories.transaction_id = transactions.id
      )
    `);
    
    console.log(`Successfully deleted ${result.changes} uncategorized transactions`);
    return result.changes;
  } catch (error) {
    console.error('Error deleting uncategorized transactions:', error);
    throw error;
  }
}

// Main function to run the script
async function main() {
  try {
    console.log('===== TRANSACTION CLEANUP UTILITY =====');
    console.log('This will permanently delete all transactions that do not have a category assigned.');
    
    // Count uncategorized transactions
    const count = await countUncategorizedTransactions();
    
    if (count === 0) {
      console.log('There are no uncategorized transactions to delete.');
      rl.close();
      return;
    }
    
    console.log(`Found ${count} uncategorized transactions that will be deleted.`);
    
    // Confirm with user before proceeding
    rl.question('Are you sure you want to continue? This action cannot be undone. (yes/no): ', async (answer) => {
      if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
        // Proceed with deletion
        const deletedCount = await deleteUncategorizedTransactions();
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
