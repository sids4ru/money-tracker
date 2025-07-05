const fs = require('fs');
const path = require('path');

/**
 * Integration test for transaction importer plugin architecture
 * IMPORTANT: This script should only be run in a test environment!
 */

// Ensure this script is not run in production
if (process.env.NODE_ENV === 'production') {
  console.error('❌ ERROR: This test script should not be run in production environment!');
  process.exit(1);
}

// Set up dependencies
const sqlite3 = require('sqlite3').verbose();
const sqlite = require('sqlite');
const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');

// Store the database connection
let db = null;

// Create database for testing
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
        grouping_status TEXT,
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
        category_id INTEGER,
        parent_category_id INTEGER,
        confidence_score REAL DEFAULT 1.0,
        usage_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
        local_currency_amount, local_currency, grouping_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        transaction.local_currency || null,
        transaction.grouping_status || null
      ]
    );
    
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

// Create test app with importer plugin system
function createTestApp() {
  // Import and register importers
  const { ImporterRegistry } = require('../../dist/importers/ImporterRegistry');
  const { AIBImporter } = require('../../dist/importers/AIBImporter');
  
  // Register the AIB importer
  ImporterRegistry.registerImporter(new AIBImporter());
  console.log('Registered importers for testing');
  
  // Configure temporary uploads directory and multer middleware
  const uploadsDir = path.join(__dirname, '../../uploads/test');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const extension = path.extname(file.originalname);
      cb(null, `test-import-${uniqueSuffix}${extension}`);
    }
  });
  
  const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
  });
  
  // Create Express app
  const app = express();
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  
  // Controller for handling requests
  const transactionController = {
    getAvailableImporters(req, res) {
      try {
        const importers = ImporterRegistry.getAllImporters().map(importer => ({
          name: importer.name,
          code: importer.code,
          description: importer.description || '',
          supportedFileTypes: importer.supportedFileTypes
        }));
        
        res.status(200).json({
          success: true,
          count: importers.length,
          data: importers
        });
      } catch (error) {
        console.error('Error getting available importers:', error);
        res.status(500).json({
          success: false,
          error: 'Server error while fetching available importers'
        });
      }
    },
    
    async importTransactionsFromFile(req, res) {
      try {
        if (!req.file) {
          res.status(400).json({
            success: false,
            error: 'No file uploaded'
          });
          return;
        }
    
        // Get parameters from request
        const importerCode = req.body.importerCode || 'aib-importer'; // Default to AIB importer
        const autoApplyCategories = req.body.autoApplyCategories !== 'false';
        
        console.log(`Import with importer: ${importerCode}, auto-apply categories: ${autoApplyCategories}`);
        
        // Get the file buffer
        const fileBuffer = fs.readFileSync(req.file.path);
        
        // Get the appropriate importer from registry
        const importer = ImporterRegistry.getImporter(importerCode);
        if (!importer) {
          fs.unlinkSync(req.file.path); // Clean up the file
          res.status(400).json({
            success: false,
            error: `Importer with code ${importerCode} not found`
          });
          return;
        }
        
        try {
          // Parse the file using the importer
          const normalizedTransactions = await importer.parseFile(fileBuffer);
          
          if (normalizedTransactions.length === 0) {
            fs.unlinkSync(req.file.path);
            res.status(400).json({
              success: false,
              error: 'No transactions found in the file'
            });
            return;
          }
          
          // Convert normalized transactions to database format
          const dbTransactions = normalizedTransactions.map(t => ({
            account_number: t.accountNumber,
            transaction_date: t.transactionDate,
            description1: t.description1,
            description2: t.description2,
            description3: t.description3,
            debit_amount: t.debitAmount,
            credit_amount: t.creditAmount,
            balance: t.balance,
            currency: t.currency,
            transaction_type: t.transactionType,
            local_currency_amount: t.localCurrencyAmount,
            local_currency: t.localCurrency
          }));
          
          // Insert transactions into the database
          console.log(`Starting batch import with ${dbTransactions.length} transactions, autoApplyCategories=${autoApplyCategories}`);
          const result = await TransactionModel.createBatch(dbTransactions, autoApplyCategories);
          
          // Delete the temporary file
          fs.unlinkSync(req.file.path);
          
          res.status(201).json({
            success: true,
            message: `Successfully imported ${result.added} transactions. ${result.duplicates} duplicates were skipped.`,
            added: result.added,
            duplicates: result.duplicates,
            importer: importerCode
          });
        } catch (error) {
          // Clean up file on error
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
          
          console.error(`Error using importer ${importerCode}:`, error);
          res.status(500).json({
            success: false,
            error: `Error processing file with importer ${importerCode}: ${error.message || 'Unknown error'}`
          });
        }
      } catch (error) {
        // Clean up file if it exists
        if (req.file?.path && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        
        console.error('Error importing transactions from file:', error);
        res.status(500).json({
          success: false,
          error: 'Server error while importing transactions'
        });
      }
    }
  };
  
  // Define routes
  app.get('/api/importers', transactionController.getAvailableImporters);
  app.post('/api/import', upload.single('file'), transactionController.importTransactionsFromFile);
  
  return { app, upload, ImporterRegistry };
}

// Main test function for importer plugin architecture
async function testImporterPlugin() {
  try {
    console.log('Starting importer plugin test with test database...');
    
    // Setup test database
    await setupTestDb();
    
    // Test 1: Get available importers from registry
    console.log('Test 1: Testing ImporterRegistry...');
    const { ImporterRegistry } = require('../../dist/importers/ImporterRegistry');
    const { AIBImporter } = require('../../dist/importers/AIBImporter');
    
    // Register the AIB importer
    ImporterRegistry.registerImporter(new AIBImporter());
    
    // Get all importers
    const importers = ImporterRegistry.getAllImporters();
    console.log(`Got ${importers.length} importers`);
    
    // Check if AIB importer is available
    const aibImporter = importers.find(imp => imp.code === 'aib-importer');
    if (!aibImporter) {
      throw new Error('AIB importer not found in ImporterRegistry');
    }
    
    console.log('✅ Test 1 PASSED: AIB importer found in ImporterRegistry');
    
    // Test 2: Import transactions using AIB importer
    console.log('Test 2: Importing transactions with AIB importer...');
    
    // Create test CSV content
    const csvContent = `Posted Account,Posted Transactions Date,Description1,Description2,Debit Amount,Credit Amount,Balance,Currency
12345678,2025-07-01,GROCERY SHOP,MAIN ST,10.50,,1000.00,EUR
12345678,2025-07-02,SALARY PAYMENT,,,,1500.00,EUR`;
    
    const tempFilePath = path.join(__dirname, '../fixtures/temp-test-import.csv');
    fs.writeFileSync(tempFilePath, csvContent);
    
    try {
      // Mock file upload and import request
      const fileBuffer = fs.readFileSync(tempFilePath);
      
      // Use AIB importer to parse the file
      const { ImporterRegistry } = require('../../dist/importers/ImporterRegistry');
      const aibImporter = ImporterRegistry.getImporter('aib-importer');
      
      if (!aibImporter) {
        throw new Error('AIB importer not found');
      }
      
      const normalizedTransactions = await aibImporter.parseFile(fileBuffer);
      console.log(`Parsed ${normalizedTransactions.length} transactions`);
      
      if (normalizedTransactions.length !== 2) {
        throw new Error(`Expected 2 transactions, got ${normalizedTransactions.length}`);
      }
      
      // Convert normalized transactions to database format
      const dbTransactions = normalizedTransactions.map(t => ({
        account_number: t.accountNumber,
        transaction_date: t.transactionDate,
        description1: t.description1,
        description2: t.description2,
        description3: t.description3,
        debit_amount: t.debitAmount,
        credit_amount: t.creditAmount,
        balance: t.balance,
        currency: t.currency,
        transaction_type: t.transactionType,
        local_currency_amount: t.localCurrencyAmount,
        local_currency: t.localCurrency
      }));
      
      // Save to database
      const result = await TransactionModel.createBatch(dbTransactions, true);
      
      console.log(`Import result: ${result.added} added, ${result.duplicates} duplicates`);
      
      if (result.added !== 2) {
        throw new Error(`Expected to add 2 transactions, but added ${result.added}`);
      }
      
      // Verify database contents
      const transactions = await db.all('SELECT * FROM transactions');
      console.log(`Found ${transactions.length} transactions in database`);
      
      if (transactions.length !== 2) {
        throw new Error(`Expected 2 transactions in database, got ${transactions.length}`);
      }
      
      // Check transaction data
      const groceryTransaction = transactions.find(t => t.description1 === 'GROCERY SHOP');
      if (!groceryTransaction) {
        throw new Error('Grocery transaction not found in database');
      }
      
      if (groceryTransaction.debit_amount !== '10.50') {
        throw new Error(`Expected debit amount of 10.50, got ${groceryTransaction.debit_amount}`);
      }
      
      console.log('✅ Test 2 PASSED: Transactions imported successfully using AIB importer');
    } finally {
      // Clean up test file
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
    
    // Clean up test database
    await teardownTestDb();
    console.log('✅ All tests PASSED');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    // Ensure test database is cleaned up even on failure
    await teardownTestDb();
    throw error;
  }
}

// Only run the test when this script is executed directly
if (require.main === module) {
  testImporterPlugin().then(() => {
    console.log('Importer plugin test complete');
    process.exit(0);
  }).catch(error => {
    console.error('Importer plugin test failed:', error);
    process.exit(1);
  });
}

module.exports = {
  testImporterPlugin,
  createTestApp
};
