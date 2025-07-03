const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

/**
 * Test script for CSV import functionality
 * IMPORTANT: This script should only be run in a test environment!
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
    `);
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
const TransactionModel = {
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
    
    return result.lastID;
  },
  
  async createBatch(transactions) {
    let added = 0;
    let duplicates = 0;
    
    for (const transaction of transactions) {
      try {
        const existingTransaction = await this.checkDuplicate(transaction);
        
        if (existingTransaction) {
          duplicates++;
          continue;
        }
        
        const newId = await this.create(transaction);
        if (newId) {
          added++;
        }
      } catch (error) {
        console.error('Error adding transaction:', error);
      }
    }
    
    return { added, duplicates };
  }
};

// Function to parse a CSV file and convert it to transactions
function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const transactions = [];
    
    fs.createReadStream(filePath)
      .pipe(csv({
        mapHeaders: ({ header }) => header.trim(),
        mapValues: ({ value }) => value ? value.trim() : value
      }))
      .on('data', (row) => {
        console.log('CSV Row:', row);
        
        // Map CSV columns to transaction fields
        const transaction = {
          account_number: row['Posted Account'] || '',
          transaction_date: row['Posted Transactions Date'] || '',
          description1: row.Description1 || '',
          description2: row.Description2 || '',
          description3: row.Description3 || '',
          debit_amount: row['Debit Amount'] || null,
          credit_amount: row['Credit Amount'] || null,
          balance: row.Balance || '',
          currency: row['Posted Currency'] || '',
          transaction_type: row['Transaction Type'] || '',
          local_currency_amount: row['Local Currency Amount'] || null,
          local_currency: row['Local Currency'] || ''
        };
        
        transactions.push(transaction);
      })
      .on('end', () => {
        console.log(`Parsed ${transactions.length} transactions from CSV`);
        resolve(transactions);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

// Main function to test CSV import
async function testCSVImport() {
  try {
    console.log('Starting CSV import test with test database...');
    
    // Setup test database
    await setupTestDb();
    
    // Path to the test CSV file
    const csvFile = path.join(__dirname, '../../tests/fixtures/test-dummy-transactions.csv');
    console.log(`Reading CSV file: ${csvFile}`);
    
    // Parse the CSV file
    const transactions = await parseCSV(csvFile);
    console.log(`Successfully parsed ${transactions.length} transactions`);
    
    // Add a timestamp to avoid duplicate detection from previous test runs
    const timestamp = new Date().getTime();
    transactions.forEach(t => {
      t.description1 = `${t.description1} ${timestamp}`;
    });
    
    // Import transactions to database
    console.log('Importing transactions to test database...');
    const result = await TransactionModel.createBatch(transactions);
    
    console.log('Import results:');
    console.log(`- Added: ${result.added}`);
    console.log(`- Duplicates: ${result.duplicates}`);
    
    // Verify the import by retrieving the transactions
    console.log('Verifying imported transactions...');
    const allTransactions = await TransactionModel.getAll();
    
    // Filter transactions based on our timestamp
    const ourTransactions = allTransactions.filter(t => 
      t.description1 && t.description1.includes(timestamp)
    );
    
    console.log(`Found ${ourTransactions.length} imported transactions`);
    
    if (ourTransactions.length === transactions.length) {
      console.log('✅ CSV Import Test PASSED: All transactions were imported successfully');
    } else {
      console.log('❌ CSV Import Test FAILED: Not all transactions were imported');
    }
    
    // Clean up test database
    await teardownTestDb();
    
  } catch (error) {
    console.error('Error during CSV import test:', error);
    // Ensure test database is cleaned up even on failure
    await teardownTestDb();
  }
}

// Only run the test when this script is executed directly
if (require.main === module) {
  testCSVImport().finally(() => {
    console.log('CSV import test complete');
  });
}

module.exports = {
  testCSVImport,
  parseCSV
};
