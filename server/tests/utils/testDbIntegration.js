const sqlite3 = require('sqlite3');
const sqlite = require('sqlite');
const path = require('path');
const fs = require('fs');

// Store the database connection
let db = null;
let originalDbModule = null;

/**
 * Initialize a test SQLite database for integration testing
 */
async function initTestDb() {
  if (db) {
    return db;
  }
  
  // Create a temporary test database file
  const testDbPath = path.join(__dirname, '../../data/test_finance_tracker.db');
  
  // Remove existing test database if it exists
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
  
  // Create the database
  db = await sqlite.open({
    filename: testDbPath,
    driver: sqlite3.Database
  });
  
  if (db) {
    // Create tables that match our schema
    await db.exec(`
      CREATE TABLE IF NOT EXISTS transactions (
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
        grouping_status TEXT,
        category_id INTEGER,
        transaction_category_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS parent_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        parent_id INTEGER,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES parent_categories(id)
      );
      
      CREATE TABLE IF NOT EXISTS transaction_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id INTEGER NOT NULL UNIQUE,
        category_id INTEGER NOT NULL,
        parent_category_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id),
        FOREIGN KEY (parent_category_id) REFERENCES parent_categories(id)
      );
      
      CREATE TABLE IF NOT EXISTS transaction_similarity_patterns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pattern_type TEXT NOT NULL,
        pattern_value TEXT NOT NULL,
        parent_category_id INTEGER,
        category_id INTEGER,
        confidence_score REAL NOT NULL DEFAULT 1.0,
        usage_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_category_id) REFERENCES parent_categories(id) ON DELETE SET NULL,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
      );
    `);
  }
  
  return db;
}

/**
 * Reset the database by clearing all tables
 */
async function resetTestDb() {
  if (!db) {
    throw new Error('Database not initialized');
  }
  
  await db.exec(`
    DELETE FROM transaction_similarity_patterns;
    DELETE FROM transaction_categories;
    DELETE FROM transactions;
    DELETE FROM categories;
    DELETE FROM parent_categories;
    DELETE FROM sqlite_sequence;  /* Reset autoincrement counters */
  `);
}

/**
 * Close the database connection
 */
async function closeTestDb() {
  if (db) {
    await db.close();
    db = null;
  }
}

/**
 * Get the test database instance
 */
function getTestDb() {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

/**
 * Set up the test database and modify the database connection module
 * to use our test database
 */
async function setupTestDb() {
  // Initialize the test database
  await initTestDb();
  
  // Create a new database module implementation for tests
  const dbModule = {
    query: async function(sql, params = []) {
      const testDb = getTestDb();
      return testDb.all(sql, params);
    },
    
    get: async function(sql, params = []) {
      const testDb = getTestDb();
      return testDb.get(sql, params);
    },
    
    run: async function(sql, params = []) {
      const testDb = getTestDb();
      const result = await testDb.run(sql, params);
      return {
        lastID: result.lastID || 0,
        changes: result.changes || 0
      };
    }
  };
  
  // Replace the module.exports of Transaction model to use our test database
  const originalTransactionModel = require('../../dist/models/Transaction');
  
  // Override the database functions used by the Transaction model
  if (originalTransactionModel) {
    originalTransactionModel.query = dbModule.query;
    originalTransactionModel.get = dbModule.get;
    originalTransactionModel.run = dbModule.run;
  }
  
  console.log('Test database setup completed');
}

/**
 * Tear down the test database and restore the original database connection
 */
async function teardownTestDb() {
  // Reset and close the test database
  try {
    await resetTestDb();
    await closeTestDb();
    
    // Remove the test database file
    const testDbPath = path.join(__dirname, '../../data/test_finance_tracker.db');
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    
    // No need to restore modules as Node.js will reload them next time
    originalDbModule = null;
    
    console.log('Test database teardown completed');
  } catch (error) {
    console.error('Error during test database teardown:', error);
  }
}

module.exports = {
  initTestDb,
  resetTestDb,
  closeTestDb,
  getTestDb,
  setupTestDb,
  teardownTestDb
};
