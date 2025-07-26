#!/usr/bin/env node

/**
 * Script to query all travel expenditures in July 2025
 * 
 * This script connects to the database and retrieves all transactions
 * categorized as "Travel" under "Expenditures" for July 2025.
 */

const path = require('path');
const fs = require('fs');
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

async function getJulyTravelExpenditures() {
  try {
    console.log('Querying July 2025 travel expenditures...');
    
    // Execute the query to find all travel expenditures in July 2025
    const sql = `
      SELECT 
        t.id,
        t.transaction_date,
        t.description1,
        t.description2,
        t.description3,
        t.debit_amount,
        t.credit_amount,
        t.balance,
        t.currency,
        t.transaction_type,
        c.name as category_name,
        pc.name as parent_category_name
      FROM 
        transactions t
      JOIN 
        transaction_categories tc ON t.id = tc.transaction_id
      JOIN 
        categories c ON tc.category_id = c.id
      JOIN 
        parent_categories pc ON c.parent_id = pc.id
      WHERE 
        c.name = 'Travel'
        AND pc.name = 'Expenditures'
        AND substr(t.transaction_date, 1, 7) = '2025-07'
      ORDER BY 
        t.transaction_date DESC
    `;
    
    const results = await query(sql);
    
    // Format and display results
    console.log(`Found ${results.length} travel expenditures in July 2025:`);
    console.log('\n------------------------------------------------------------');
    
    let totalAmount = 0;
    
    results.forEach(transaction => {
      // Use debit_amount if available, otherwise use negative of credit_amount
      const amount = transaction.debit_amount 
        ? parseFloat(transaction.debit_amount.replace(',', '')) 
        : (transaction.credit_amount ? -parseFloat(transaction.credit_amount.replace(',', '')) : 0);
      
      totalAmount += amount;
      
      console.log(`Date: ${transaction.transaction_date}`);
      console.log(`Description: ${transaction.description1}`);
      if (transaction.description2) console.log(`Additional Info: ${transaction.description2}`);
      if (transaction.description3) console.log(`More Info: ${transaction.description3}`);
      console.log(`Amount: ${amount.toFixed(2)} ${transaction.currency}`);
      console.log(`Type: ${transaction.transaction_type}`);
      console.log('------------------------------------------------------------');
    });
    
    console.log(`\nTotal Travel Expenditures in July 2025: ${totalAmount.toFixed(2)}`);
    
    return results;
  } catch (error) {
    console.error('Error retrieving July travel expenditures:', error);
    throw error;
  }
}

// Execute the function if this script is run directly
getJulyTravelExpenditures()
  .then(() => {
    // Close the database connection
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
        process.exit(1);
      }
      console.log('Database connection closed');
      process.exit(0);
    });
  })
  .catch(err => {
    console.error(err);
    // Make sure to close database even on error
    db.close();
    process.exit(1);
  });

module.exports = { getJulyTravelExpenditures };
