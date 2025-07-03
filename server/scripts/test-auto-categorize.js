#!/usr/bin/env node

/**
 * Test script to debug auto-categorization issues
 * This will directly query the database to diagnose and fix any problems
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const readline = require('readline');

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

function getAll(sql, params = []) {
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

// Create readline interface for user interaction
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Check pattern matching function
async function testPatternMatching() {
  try {
    console.log('\n=== Testing Pattern Matching Logic ===');
    
    // Get all patterns
    const patterns = await getAll(`SELECT * FROM transaction_similarity_patterns`);
    console.log(`Found ${patterns.length} patterns:`);
    patterns.forEach(p => console.log(`  - ${p.id}: ${p.pattern_type} "${p.pattern_value}" -> categoryId: ${p.category_id}`));
    
    if (patterns.length === 0) {
      console.log('No patterns found! Please create some patterns first.');
      return;
    }
    
    // Get sample transaction descriptions to test with
    const transactions = await getAll(`
      SELECT id, description1 
      FROM transactions 
      ORDER BY RANDOM() 
      LIMIT 10
    `);
    
    console.log('\nTesting pattern matching with sample transactions:');
    
    for (const transaction of transactions) {
      console.log(`\nTransaction ${transaction.id}: "${transaction.description1}"`);
      
      // Test each pattern
      const matches = patterns.filter(pattern => {
        let isMatch = false;
        const description = transaction.description1;
        
        switch (pattern.pattern_type) {
          case 'exact':
            isMatch = description.toLowerCase() === pattern.pattern_value.toLowerCase();
            break;
          case 'contains':
            isMatch = description.toLowerCase().includes(pattern.pattern_value.toLowerCase());
            break;
          case 'starts_with':
            isMatch = description.toLowerCase().startsWith(pattern.pattern_value.toLowerCase());
            break;
          case 'regex':
            try {
              const regex = new RegExp(pattern.pattern_value, 'i');
              isMatch = regex.test(description);
            } catch (e) {
              console.error('Invalid regex pattern:', pattern.pattern_value);
            }
            break;
        }
        
        if (isMatch) {
          console.log(`  ✓ Matched pattern ${pattern.id}: ${pattern.pattern_type} "${pattern.pattern_value}" -> categoryId: ${pattern.category_id}`);
        }
        
        return isMatch;
      });
      
      if (matches.length === 0) {
        console.log('  ✘ No matching patterns found');
      }
    }
  } catch (error) {
    console.error('Error testing pattern matching:', error);
  }
}

// Check transactions with categories
async function checkCategorizedTransactions() {
  try {
    console.log('\n=== Checking Categorized Transactions ===');
    
    // Count transactions with categories
    const categorizedCount = await getAll(`
      SELECT COUNT(*) as count FROM transactions t
      INNER JOIN transaction_categories tc ON t.id = tc.transaction_id
    `);
    
    // Count total transactions
    const totalCount = await getAll('SELECT COUNT(*) as count FROM transactions');
    
    console.log(`Categorized transactions: ${categorizedCount[0].count} / ${totalCount[0].count}`);
    
    // Sample of categorized transactions
    const categorizedTransactions = await getAll(`
      SELECT t.id, t.description1, t.grouping_status, tc.category_id, c.name as category_name
      FROM transactions t
      INNER JOIN transaction_categories tc ON t.id = tc.transaction_id
      INNER JOIN categories c ON tc.category_id = c.id
      ORDER BY t.id DESC
      LIMIT 5
    `);
    
    console.log('\nRecent categorized transactions:');
    categorizedTransactions.forEach(t => {
      console.log(`  - Transaction ${t.id}: "${t.description1}" => Category: ${t.category_name} (ID: ${t.category_id}), Status: ${t.grouping_status || 'none'}`);
    });
  } catch (error) {
    console.error('Error checking categorized transactions:', error);
  }
}

// Run auto-categorization directly
async function runAutoCategorization() {
  try {
    console.log('\n=== Running Direct Auto-Categorization ===');
    
    // Get uncategorized transactions
    const uncategorizedTransactions = await getAll(`
      SELECT t.* 
      FROM transactions t
      LEFT JOIN transaction_categories tc ON t.id = tc.transaction_id
      WHERE tc.id IS NULL
      LIMIT 100
    `);
    
    console.log(`Found ${uncategorizedTransactions.length} uncategorized transactions`);
    
    if (uncategorizedTransactions.length === 0) {
      console.log('No uncategorized transactions to process!');
      return;
    }
    
    // Get all patterns
    const patterns = await getAll(`SELECT * FROM transaction_similarity_patterns`);
    console.log(`Loaded ${patterns.length} patterns for matching`);
    
    if (patterns.length === 0) {
      console.log('No patterns found! Please create some patterns first.');
      return;
    }
    
    // Track categorization results
    let categorizedCount = 0;
    const categorizedTransactions = [];
    
    // Begin transaction for better performance and consistency
    await runQuery('BEGIN TRANSACTION');
    
    // Process each transaction
    for (const transaction of uncategorizedTransactions) {
      const description = transaction.description1;
      let bestMatch = null;
      let bestConfidence = 0;
      
      // Find matching patterns
      for (const pattern of patterns) {
        let isMatch = false;
        
        switch (pattern.pattern_type) {
          case 'exact':
            isMatch = description.toLowerCase() === pattern.pattern_value.toLowerCase();
            break;
          case 'contains':
            isMatch = description.toLowerCase().includes(pattern.pattern_value.toLowerCase());
            break;
          case 'starts_with':
            isMatch = description.toLowerCase().startsWith(pattern.pattern_value.toLowerCase());
            break;
          case 'regex':
            try {
              const regex = new RegExp(pattern.pattern_value, 'i');
              isMatch = regex.test(description);
            } catch (e) {
              console.error('Invalid regex pattern:', pattern.pattern_value);
              isMatch = false;
            }
            break;
        }
        
        if (isMatch && pattern.confidence_score >= bestConfidence) {
          bestConfidence = pattern.confidence_score || 1;
          bestMatch = pattern;
        }
      }
      
      if (bestMatch && bestMatch.category_id) {
        try {
          // Insert category assignment
          const result = await runQuery(
            'INSERT INTO transaction_categories (transaction_id, category_id) VALUES (?, ?)',
            [transaction.id, bestMatch.category_id]
          );
          
          if (result.lastID) {
            // Update transaction status
            await runQuery(
              'UPDATE transactions SET grouping_status = ? WHERE id = ?',
              ['auto', transaction.id]
            );
            
            // Update pattern usage count
            await runQuery(
              'UPDATE transaction_similarity_patterns SET usage_count = usage_count + 1 WHERE id = ?',
              [bestMatch.id]
            );
            
            categorizedCount++;
            categorizedTransactions.push({
              id: transaction.id,
              description: description,
              patternId: bestMatch.id,
              patternValue: bestMatch.pattern_value,
              categoryId: bestMatch.category_id
            });
          }
        } catch (error) {
          // Log error but continue with next transaction
          console.error(`Error categorizing transaction ${transaction.id}:`, error.message);
        }
      }
    }
    
    // Commit all changes
    await runQuery('COMMIT');
    
    console.log(`\nSuccessfully categorized ${categorizedCount} transactions`);
    
    if (categorizedCount > 0) {
      console.log('\nRecently categorized transactions:');
      categorizedTransactions.slice(0, 5).forEach(t => {
        console.log(`  - Transaction ${t.id}: "${t.description}" => Pattern: "${t.patternValue}" (ID: ${t.patternId}), Category: ${t.categoryId}`);
      });
    }
    
    console.log('\nVerifying results...');
    await checkCategorizedTransactions();
    
  } catch (error) {
    // Rollback in case of error
    try {
      await runQuery('ROLLBACK');
    } catch (rollbackError) {
      console.error('Error during rollback:', rollbackError);
    }
    
    console.error('Error during auto-categorization:', error);
  }
}

// Main function to run tests
async function main() {
  try {
    // 1. Check if we have patterns and they match properly
    await testPatternMatching();
    
    // 2. Check existing categorized transactions
    await checkCategorizedTransactions();
    
    // 3. Ask user if they want to run auto-categorization
    rl.question('\nDo you want to run the auto-categorization process? (yes/no): ', async (answer) => {
      if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
        await runAutoCategorization();
      } else {
        console.log('Auto-categorization skipped.');
      }
      
      // Close database and exit
      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err.message);
        } else {
          console.log('Database connection closed');
        }
        rl.close();
      });
    });
  } catch (error) {
    console.error('An error occurred:', error);
    db.close();
    rl.close();
    process.exit(1);
  }
}

// Run the main function
main();
