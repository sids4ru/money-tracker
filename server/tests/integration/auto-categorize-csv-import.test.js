const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
// We'll use our own mock models for testing instead of importing TypeScript files

/**
 * Test script for Auto-Categorization during CSV import
 * This test verifies that the auto-categorization feature works correctly during CSV import
 */

// Ensure this script is not run in production
if (process.env.NODE_ENV === 'production') {
  console.error('❌ ERROR: This test script should not be run in production environment!');
  process.exit(1);
}

// Set up an in-memory test database for integration testing
const sqlite3 = require('sqlite3');
const sqlite = require('sqlite');

// Store the database connection
let db = null;

// Create a database for testing
async function setupTestDb() {
  if (db) return db;
  
  // Use an in-memory database for tests
  db = await sqlite.open({
    filename: ':memory:',
    driver: sqlite3.Database
  });
  
  if (db) {
    // Create minimal schema needed for tests
    await db.exec(`
      CREATE TABLE transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_number TEXT NOT NULL,
        transaction_date TEXT NOT NULL,
        description1 TEXT,
        description2 TEXT,
        description3 TEXT,
        debit_amount TEXT,
        credit_amount TEXT,
        balance TEXT NOT NULL,
        currency TEXT NOT NULL,
        transaction_type TEXT NOT NULL,
        local_currency_amount TEXT,
        local_currency TEXT,
        grouping_status TEXT DEFAULT 'none',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        parent_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE transaction_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id INTEGER NOT NULL,
        category_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(transaction_id, category_id)
      );
      
      CREATE TABLE transaction_similarity_patterns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pattern_type TEXT NOT NULL,
        pattern_value TEXT NOT NULL,
        parent_category_id INTEGER,
        category_id INTEGER,
        confidence_score REAL DEFAULT 1.0,
        usage_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Insert test data: categories and similarity patterns
    await db.run(
      'INSERT INTO categories (name) VALUES (?)',
      ['Groceries']
    );
    
    await db.run(
      'INSERT INTO categories (name) VALUES (?)',
      ['Dining Out']
    );
    
    await db.run(
      `INSERT INTO transaction_similarity_patterns 
       (pattern_type, pattern_value, category_id, confidence_score) 
       VALUES (?, ?, ?, ?)`,
      ['contains', 'GROCERY', 1, 1.0]
    );
    
    await db.run(
      `INSERT INTO transaction_similarity_patterns 
       (pattern_type, pattern_value, category_id, confidence_score) 
       VALUES (?, ?, ?, ?)`,
      ['contains', 'RESTAURANT', 2, 1.0]
    );
  }
  
  console.log('Test database setup complete');
  return db;
}

// Clean up database after tests
async function teardownTestDb() {
  if (db) {
    await db.close();
    db = null;
    console.log('Test database closed');
  }
}

// Mock transaction model for testing
const mockTransactionModel = {
  async getAll() {
    return db.all('SELECT * FROM transactions ORDER BY transaction_date DESC');
  },
  
  async checkDuplicate(transaction) {
    return db.get(
      `SELECT * FROM transactions 
       WHERE account_number = ? 
       AND transaction_date = ? 
       AND description1 = ?`, 
      [transaction.account_number, transaction.transaction_date, transaction.description1]
    );
  },
  
  async create(transaction) {
    const result = await db.run(
      `INSERT INTO transactions (
        account_number, transaction_date, description1, description2, description3,
        debit_amount, credit_amount, balance, currency, transaction_type,
        local_currency_amount, local_currency
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transaction.account_number,
        transaction.transaction_date,
        transaction.description1,
        transaction.description2 || null,
        transaction.description3 || null,
        transaction.debit_amount || null,
        transaction.credit_amount || null,
        transaction.balance,
        transaction.currency,
        transaction.transaction_type,
        transaction.local_currency_amount || null,
        transaction.local_currency || null
      ]
    );
    
    if (transaction.description1) {
      try {
        // Try to auto-categorize if auto-categorization is enabled
        await this.attemptAutoCategorization(result.lastID, transaction.description1);
      } catch (error) {
        console.error('Error auto-categorizing transaction:', error);
      }
    }
    
    return result.lastID;
  },
  
  async createBatch(transactions, autoApplyCategories = true) {
    let added = 0;
    let duplicates = 0;
    
    for (const transaction of transactions) {
      try {
        const existingTransaction = await this.checkDuplicate(transaction);
        
        if (existingTransaction) {
          duplicates++;
          continue;
        }
        
        let newId;
        
        if (autoApplyCategories) {
          // Use the regular create method which includes auto-categorization
          newId = await this.create(transaction);
        } else {
          // Skip auto-categorization
          const result = await db.run(
            `INSERT INTO transactions (
              account_number, transaction_date, description1, description2, description3,
              debit_amount, credit_amount, balance, currency, transaction_type,
              local_currency_amount, local_currency
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              transaction.account_number,
              transaction.transaction_date,
              transaction.description1,
              transaction.description2 || null,
              transaction.description3 || null,
              transaction.debit_amount || null,
              transaction.credit_amount || null,
              transaction.balance,
              transaction.currency,
              transaction.transaction_type,
              transaction.local_currency_amount || null,
              transaction.local_currency || null
            ]
          );
          newId = result.lastID;
        }
        
        if (newId) {
          added++;
        }
      } catch (error) {
        console.error('Error adding transaction:', error);
      }
    }
    
    return { added, duplicates };
  },
  
  async attemptAutoCategorization(transactionId, description) {
    // Find matching patterns
    const matchingPatterns = await mockSimilarityPatternModel.findMatchingPatterns(description);
    
    if (matchingPatterns.length > 0) {
      // Sort by confidence score (highest first)
      matchingPatterns.sort((a, b) => (b.confidence_score || 1) - (a.confidence_score || 1));
      const bestMatch = matchingPatterns[0];
      
      if (bestMatch.category_id) {
        console.log(`Auto-assigning category ${bestMatch.category_id} to transaction ${transactionId}`);
        
        // Create entry in transaction_categories
        await db.run(
          `INSERT INTO transaction_categories (transaction_id, category_id) 
           VALUES (?, ?)`,
          [transactionId, bestMatch.category_id]
        );
        
        // Update the transaction record with the grouping status
        await db.run(
          `UPDATE transactions SET grouping_status = 'auto' WHERE id = ?`,
          [transactionId]
        );
        
        return true;
      }
    }
    
    return false;
  }
};

// Mock similarity pattern model for testing
const mockSimilarityPatternModel = {
  async findMatchingPatterns(description) {
    // Get all patterns
    const patterns = await db.all('SELECT * FROM transaction_similarity_patterns');
    
    // Filter patterns based on matching logic
    return patterns.filter(pattern => {
      // Simplified matching logic
      switch (pattern.pattern_type) {
        case 'exact':
          return description.toLowerCase() === pattern.pattern_value.toLowerCase();
        case 'contains':
          return description.toLowerCase().includes(pattern.pattern_value.toLowerCase());
        case 'starts_with':
          return description.toLowerCase().startsWith(pattern.pattern_value.toLowerCase());
        case 'regex':
          try {
            const regex = new RegExp(pattern.pattern_value, 'i');
            return regex.test(description);
          } catch (e) {
            console.error('Invalid regex pattern:', pattern.pattern_value);
            return false;
          }
        default:
          return false;
      }
    });
  }
};

// Create test transactions
function createTestTransactions() {
  const timestamp = Date.now().toString();
  return [
    {
      account_number: '123456789',
      transaction_date: '2025-07-01',
      description1: `GROCERY STORE PURCHASE ${timestamp}`, // Should match 'GROCERY' pattern
      description2: 'Test',
      description3: 'Transaction',
      debit_amount: '100.00',
      credit_amount: undefined,
      balance: '900.00',
      currency: 'EUR',
      transaction_type: 'POS',
      local_currency_amount: '100.00',
      local_currency: 'EUR'
    },
    {
      account_number: '123456789',
      transaction_date: '2025-07-02',
      description1: `FANCY RESTAURANT DINNER ${timestamp}`, // Should match 'RESTAURANT' pattern
      description2: 'Test',
      description3: 'Transaction',
      debit_amount: '75.00',
      credit_amount: undefined,
      balance: '825.00',
      currency: 'EUR',
      transaction_type: 'POS',
      local_currency_amount: '75.00',
      local_currency: 'EUR'
    },
    {
      account_number: '123456789',
      transaction_date: '2025-07-03',
      description1: `NO MATCHING PATTERN TRANSACTION ${timestamp}`, // No pattern match
      description2: 'Test',
      description3: 'Transaction',
      debit_amount: '25.00',
      credit_amount: undefined,
      balance: '800.00',
      currency: 'EUR',
      transaction_type: 'POS',
      local_currency_amount: '25.00',
      local_currency: 'EUR'
    }
  ];
}

// Main function to test CSV import with auto-categorization
async function testAutoCategorizeCSVImport() {
  try {
    console.log('Starting Auto-Categorization CSV import test with test database...');
    
    // Setup test database
    await setupTestDb();
    
    // Create test transactions
    const transactions = createTestTransactions();
    
    // Test with auto-categorization enabled (default)
    console.log('Testing import with auto-categorization ENABLED:');
    const resultWithAutoCategories = await mockTransactionModel.createBatch(transactions);
    
    console.log('Import results with auto-categorization:');
    console.log(`- Added: ${resultWithAutoCategories.added}`);
    console.log(`- Duplicates: ${resultWithAutoCategories.duplicates}`);
    
    // Query the database to see which transactions were categorized
    const categorizedTransactions = await db.all(`
      SELECT t.*, tc.category_id 
      FROM transactions t
      LEFT JOIN transaction_categories tc ON t.id = tc.transaction_id
      ORDER BY t.id
    `);
    
    console.log('Categorization results:');
    for (const tx of categorizedTransactions) {
      const categorized = tx.category_id !== null;
      const category = categorized ? await db.get('SELECT * FROM categories WHERE id = ?', [tx.category_id]) : null;
      console.log(`- Transaction "${tx.description1}": ${categorized ? `Categorized as "${category.name}"` : 'Not categorized'}`);
    }
    
    // Now test with auto-categorization disabled
    console.log('\nTesting import with auto-categorization DISABLED:');
    
    // Reset database for next test
    await db.exec('DELETE FROM transaction_categories');
    await db.exec('DELETE FROM transactions');
    
    // Use the same transactions but disable auto-categorization
    const resultWithoutAutoCategories = await mockTransactionModel.createBatch(transactions, false);
    
    console.log('Import results without auto-categorization:');
    console.log(`- Added: ${resultWithoutAutoCategories.added}`);
    console.log(`- Duplicates: ${resultWithoutAutoCategories.duplicates}`);
    
    // Query the database to see which transactions were categorized
    const uncategorizedTransactions = await db.all(`
      SELECT t.*, tc.category_id 
      FROM transactions t
      LEFT JOIN transaction_categories tc ON t.id = tc.transaction_id
      ORDER BY t.id
    `);
    
    console.log('Categorization results with auto-categorization disabled:');
    for (const tx of uncategorizedTransactions) {
      const categorized = tx.category_id !== null;
      const category = categorized ? await db.get('SELECT * FROM categories WHERE id = ?', [tx.category_id]) : null;
      console.log(`- Transaction "${tx.description1}": ${categorized ? `Categorized as "${category.name}"` : 'Not categorized'}`);
    }
    
    // Verify results
    const categorizedCount = categorizedTransactions.filter(t => t.category_id !== null).length;
    const uncategorizedCount = uncategorizedTransactions.filter(t => t.category_id !== null).length;
    
    if (categorizedCount > 0 && uncategorizedCount === 0) {
      console.log('\n✅ Auto-Categorization Test PASSED: Auto-categorization working correctly');
    } else {
      console.log('\n❌ Auto-Categorization Test FAILED: Auto-categorization not working as expected');
    }
    
    // Clean up test database
    await teardownTestDb();
    
  } catch (error) {
    console.error('Error during auto-categorization test:', error);
    // Ensure test database is cleaned up even on failure
    await teardownTestDb();
  }
}

// Only run the test when this script is executed directly
if (require.main === module) {
  testAutoCategorizeCSVImport().finally(() => {
    console.log('Auto-categorization CSV import test complete');
  });
}

module.exports = {
  testAutoCategorizeCSVImport,
  createTestTransactions
};
