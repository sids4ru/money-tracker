#!/usr/bin/env node

/**
 * Calculate travel expenditures by month/year
 * 
 * Usage: node calculate_june_travel_expenses.js [year] [month]
 * Example: node calculate_june_travel_expenses.js 2025 06
 * 
 * If month is set to "all", it will show all travel transactions regardless of month
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

// Get command line arguments for year and month
const args = process.argv.slice(2);
const year = args[0] || new Date().getFullYear();
const month = args[1] || '06'; // Default to June
const showAll = month === 'all';

if (showAll) {
  console.log(`Calculating all travel expenses for ${year}`);
} else {
  console.log(`Calculating travel expenses for ${month}/${year}`);
}

async function checkDatabaseContents() {
  console.log('\n=== Database Content Check ===');
  
  // Check parent categories
  console.log('\n1. Available parent categories:');
  const parentCategories = await query('SELECT * FROM parent_categories');
  console.table(parentCategories);
  
  // Check categories
  console.log('\n2. Available categories (sample of 10):');
  const categories = await query('SELECT * FROM categories LIMIT 10');
  console.table(categories);
  
  // Check if "travel" category exists in any form
  console.log('\n3. Travel-related categories:');
  const travelCategories = await query(`
    SELECT c.*, pc.name as parent_name 
    FROM categories c
    LEFT JOIN parent_categories pc ON c.parent_id = pc.id
    WHERE LOWER(c.name) LIKE '%travel%' OR LOWER(pc.name) LIKE '%travel%'
  `);
  console.table(travelCategories);
  
  // Count all transactions
  console.log('\n4. Transaction counts by year-month:');
  const transactionCounts = await query(`
    SELECT 
      substr(transaction_date, 1, 7) as year_month,
      COUNT(*) as transaction_count
    FROM transactions
    GROUP BY year_month
    ORDER BY year_month DESC
  `);
  console.table(transactionCounts);
  
  // Find travel category ID
  const travelCategory = await query(`
    SELECT id FROM categories WHERE LOWER(name) = 'travel'
  `);
  const travelCategoryId = travelCategory.length > 0 ? travelCategory[0].id : null;
  
  // Check if there are any transactions assigned to the travel category
  console.log('\n5. Transactions assigned to travel category:');
  if (travelCategoryId) {
    const assignedTransactions = await query(`
      SELECT COUNT(*) as count
      FROM transaction_categories
      WHERE category_id = ?
    `, [travelCategoryId]);
    console.log(`Travel category ID: ${travelCategoryId}`);
    console.log(`Number of transactions assigned: ${assignedTransactions[0].count}`);
  } else {
    console.log('No travel category found');
  }
  
  // Check for transactions with travel-related descriptions
  console.log(`\n6. Transactions with travel-related keywords${showAll ? '' : ' in specified month'}:`);
  const keywordTransactions = await query(`
    SELECT 
      id, transaction_date, description1, description2, debit_amount
    FROM transactions
    WHERE 
      (
        LOWER(description1) LIKE '%travel%' OR 
        LOWER(description1) LIKE '%flight%' OR
        LOWER(description1) LIKE '%hotel%' OR
        LOWER(description1) LIKE '%airline%' OR
        LOWER(description1) LIKE '%holiday%' OR
        LOWER(description1) LIKE '%vacation%' OR
        LOWER(description2) LIKE '%travel%'
      )
      ${showAll ? 
      'AND substr(transaction_date, 1, 4) = ?' : 
      'AND substr(transaction_date, 6, 2) = ? AND substr(transaction_date, 1, 4) = ?'}
    ORDER BY transaction_date DESC
  `, showAll ? [year] : [month, year]);
  console.table(keywordTransactions);
}

async function calculateTravelExpenses() {
  try {
    // Query to find all transactions in June that are categorized as travel
    const results = await query(`
      SELECT 
        t.id, 
        t.transaction_date, 
        t.description1, 
        t.debit_amount,
        c.name as category_name,
        pc.name as parent_category_name
      FROM 
        transactions t
      JOIN 
        transaction_categories tc ON t.id = tc.transaction_id
      JOIN 
        categories c ON tc.category_id = c.id
      LEFT JOIN 
        parent_categories pc ON c.parent_id = pc.id
      WHERE 
        (LOWER(c.name) LIKE '%travel%' OR LOWER(pc.name) LIKE '%travel%')
        ${showAll ? 
        'AND substr(t.transaction_date, 1, 4) = ?' : 
        'AND substr(t.transaction_date, 6, 2) = ? AND substr(t.transaction_date, 1, 4) = ?'}
        AND t.debit_amount IS NOT NULL
      ORDER BY 
        t.transaction_date DESC
    `, showAll ? [year] : [month, year]);

    console.log(`\nTravel transactions for ${month}/${year} (by category):`);
    console.table(results);

    // Calculate total
    let total = 0;
    for (const transaction of results) {
      // Remove any commas from the amount and convert to float
      const amount = parseFloat(transaction.debit_amount.replace(',', ''));
      total += amount;
    }

    console.log(`\nTotal travel expenditure for ${month}/${year} (by category): ${total.toFixed(2)}`);

    // Alternative approach - direct SQL calculation
    const [totalResult] = await query(`
      SELECT 
        SUM(CAST(REPLACE(t.debit_amount, ',', '') AS REAL)) as total
      FROM 
        transactions t
      JOIN 
        transaction_categories tc ON t.id = tc.transaction_id
      JOIN 
        categories c ON tc.category_id = c.id
      LEFT JOIN 
        parent_categories pc ON c.parent_id = pc.id
      WHERE 
        (LOWER(c.name) LIKE '%travel%' OR LOWER(pc.name) LIKE '%travel%')
        ${showAll ? 
        'AND substr(t.transaction_date, 1, 4) = ?' : 
        'AND substr(t.transaction_date, 6, 2) = ? AND substr(t.transaction_date, 1, 4) = ?'}
        AND t.debit_amount IS NOT NULL
    `, showAll ? [year] : [month, year]);

    console.log(`SQL calculated total: ${totalResult.total || 0}\n`);
    
    // Run a query for transactions with travel-related keywords
    const keywordResults = await query(`
      SELECT 
        t.id, 
        t.transaction_date, 
        t.description1, 
        t.debit_amount,
        tc.category_id,
        c.name as category_name
      FROM 
        transactions t
      LEFT JOIN 
        transaction_categories tc ON t.id = tc.transaction_id
      LEFT JOIN 
        categories c ON tc.category_id = c.id
      WHERE 
        (
          LOWER(t.description1) LIKE '%travel%' OR 
          LOWER(t.description1) LIKE '%flight%' OR
          LOWER(t.description1) LIKE '%hotel%' OR
          LOWER(t.description1) LIKE '%airline%' OR
          LOWER(t.description1) LIKE '%holiday%' OR
          LOWER(t.description1) LIKE '%vacation%' OR
          LOWER(t.description2) LIKE '%travel%'
        )
        ${showAll ? 
        'AND substr(t.transaction_date, 1, 4) = ?' : 
        'AND substr(t.transaction_date, 6, 2) = ? AND substr(t.transaction_date, 1, 4) = ?'}
        AND t.debit_amount IS NOT NULL
      ORDER BY 
        t.transaction_date DESC
    `, showAll ? [year] : [month, year]);
    
    console.log(`Travel transactions for ${month}/${year} (by keywords):`);
    console.table(keywordResults);
    
    // Calculate total
    let keywordTotal = 0;
    for (const transaction of keywordResults) {
      // Remove any commas from the amount and convert to float
      const amount = parseFloat(transaction.debit_amount.replace(',', ''));
      keywordTotal += amount;
    }
    
    console.log(`Total travel expenditure for ${month}/${year} (by keywords): ${keywordTotal.toFixed(2)}`);

  } catch (error) {
    console.error('Error calculating travel expenses:', error);
  }
}

// Execute the functions
Promise.all([
  checkDatabaseContents(),
  calculateTravelExpenses()
]).then(() => {
  console.log('Done!');
  // Close the database connection
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
      process.exit(1);
    }
    console.log('Database connection closed');
    process.exit(0);
  });
}).catch(err => {
  console.error('Failed:', err);
  // Make sure to close database even on error
  db.close();
  process.exit(1);
});
