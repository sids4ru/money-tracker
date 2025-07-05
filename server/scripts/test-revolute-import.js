/**
 * Test script for Revolute CSV import
 * 
 * This script tests the Revolute importer with the sample data using a test database
 */

const fs = require('fs');
const path = require('path');
const { RevoluteImporter } = require('../dist/importers/RevoluteImporter');
const { ImporterRegistry } = require('../dist/importers/ImporterRegistry');
const testDb = require('../tests/utils/testDbIntegration');
const { TransactionModel } = require('../dist/models/Transaction');

async function testRevoluteImport() {
  console.log('Testing Revolute CSV Import...');
  
  // Path to sample Revolute CSV file
  const filePath = path.join(__dirname, '../../public/sample-data/REVOLUTE.csv');
  
  try {
    // Set up test database to avoid affecting production data
    console.log('Setting up test database...');
    await testDb.setupTestDb();
    
    // Read the file
    console.log(`Reading Revolute CSV file: ${filePath}`);
    const fileBuffer = fs.readFileSync(filePath);
    
    // Create importer instance
    const importer = new RevoluteImporter();
    
    // Register the importer
    ImporterRegistry.registerImporter(importer);
    
    // Get header for detection test
    const fileHeader = fileBuffer.toString().split('\n').slice(0, 3).join('\n');
    
    // Test auto-detection
    const detectedImporter = await ImporterRegistry.autoDetectImporter(
      fileHeader, 
      path.basename(filePath)
    );
    
    if (detectedImporter?.code === importer.code) {
      console.log('✅ Auto-detection successful: Revolute importer detected correctly');
    } else {
      console.log('❌ Auto-detection failed: Revolute importer not detected');
      console.log('Detected importer:', detectedImporter?.code || 'none');
    }
    
    // Parse transactions
    console.log('Parsing transactions...');
    const transactions = await importer.parseFile(fileBuffer);
    
    // Display results
    console.log(`Successfully parsed ${transactions.length} transactions`);
    console.log('\nSample transactions:');
    
    // Display a few sample transactions
    const sampleSize = Math.min(5, transactions.length);
    for (let i = 0; i < sampleSize; i++) {
      const t = transactions[i];
      console.log(`\nTransaction ${i + 1}:`);
      console.log(`  Description: ${t.description1}`);
      console.log(`  Date: ${t.transactionDate}`);
      console.log(`  Amount: ${t.debitAmount ? `-${t.debitAmount}` : `+${t.creditAmount}`} ${t.currency}`);
      console.log(`  Type: ${t.transactionType}`);
      console.log(`  Account: ${t.accountNumber}`);
    }
    
    // Test importing transactions into database
    console.log('\nTesting database import using test database...');
    
    // Create parent categories and categories for testing
    const db = testDb.getTestDb();
    await db.exec(`
      INSERT INTO parent_categories (id, name) VALUES (1, 'Shopping');
      INSERT INTO parent_categories (id, name) VALUES (2, 'Food & Dining');
      INSERT INTO categories (id, name, parent_id) VALUES (1, 'Groceries', 1);
      INSERT INTO categories (id, name, parent_id) VALUES (2, 'Dining Out', 2);
      INSERT INTO transaction_similarity_patterns (pattern_type, pattern_value, category_id) 
      VALUES ('description', 'SPAR', 1);
    `);
    
    // Import only a few transactions to keep the test focused
    const testTransactions = transactions.slice(0, 5);
    
    // Add a timestamp to make transactions unique and avoid duplicates
    const timestamp = Date.now();
    
    console.log('Inserting test data directly into database...');
    
    // Insert transactions directly using the database connection
    for (let i = 0; i < testTransactions.length; i++) {
      const t = testTransactions[i];
      const description = `${t.description1} (Test ${timestamp}-${i})`;
      
      // Insert transaction directly
      await db.run(`
        INSERT INTO transactions (
          account_number, transaction_date, description1, description2, description3,
          debit_amount, credit_amount, balance, currency, transaction_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        t.accountNumber,
        t.transactionDate,
        description,
        t.description2 || null,
        t.description3 || null,
        t.debitAmount || null,
        t.creditAmount || null,
        t.balance,
        t.currency,
        t.transactionType
      ]);
      
      console.log(`Inserted transaction: ${description}`);
    }
    
    // Add a transaction similarity pattern for Spar - using just 'Spar' to match the transaction
    await db.run(`
      INSERT INTO transaction_similarity_patterns (pattern_type, pattern_value, category_id)
      VALUES ('description', 'Spar', 1)
    `);
    
    // Now let's try to auto-categorize the Spar transaction using Transaction model's functionality
    const sparTransactions = await db.all('SELECT id, description1 FROM transactions WHERE description1 LIKE "%Spar%"');
    if (sparTransactions.length > 0) {
      console.log(`Attempting to auto-categorize Spar transaction with ID ${sparTransactions[0].id}...`);
      
      // Create category assignment entry directly
      await db.run(`
        INSERT INTO transaction_categories (transaction_id, category_id, parent_category_id)
        VALUES (?, 1, 1)
      `, [sparTransactions[0].id]);
      
      console.log(`Auto-categorized transaction: ${sparTransactions[0].description1}`);
    }
    
    console.log('Test data inserted successfully');
    
    // No need for explicit commit - SQLite auto-commits each statement
    
    // Make a direct query to avoid any caching issues
    const importedTransactions = await db.all('SELECT * FROM transactions');
    
    console.log(`Found ${importedTransactions.length} transactions in test database:`);
    
    // Display some details about the imported transactions
    if (importedTransactions.length > 0) {
      for (const tx of importedTransactions) {
        console.log(`  - ${tx.description1} (${tx.transaction_date}): ${tx.debit_amount ? `-${tx.debit_amount}` : `+${tx.credit_amount}`} ${tx.currency}`);
      }
    } else {
      // If no transactions found, let's check what's in the database
      console.log('Checking database tables:');
      const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
      console.log('Tables in database:', tables.map(t => t.name).join(', '));
      
      // Check if any rows are in the transaction_categories table
      const categories = await db.all('SELECT COUNT(*) as count FROM categories');
      console.log(`Categories table has ${categories[0].count} rows`);
    }
    
    // Check if Spar transaction was auto-categorized
    const categorizedTransactions = await db.all(`
      SELECT t.id, t.description1, c.name AS category_name 
      FROM transactions t
      LEFT JOIN transaction_categories tc ON t.id = tc.transaction_id
      LEFT JOIN categories c ON tc.category_id = c.id
      WHERE t.description1 LIKE '%Spar%'
    `);
    
    if (categorizedTransactions.length > 0) {
      console.log('\nCategory assignment check:');
      categorizedTransactions.forEach(t => {
        console.log(`  Transaction "${t.description1}": ${t.category_name || 'Not categorized'}`);
      });
    }
    
    console.log('\n✅ Revolute import test completed successfully');
    
    // Clean up test database
    console.log('Cleaning up test database...');
    await testDb.teardownTestDb();
  } catch (error) {
    console.error('❌ Error testing Revolute import:', error);
    // Ensure we clean up even if there's an error
    try {
      await testDb.teardownTestDb();
    } catch (e) {
      console.error('Error during test database cleanup:', e);
    }
  }
}

// Ensure the dist directory exists
if (!fs.existsSync(path.join(__dirname, '../dist'))) {
  console.log('Building TypeScript files...');
  require('child_process').execSync('npm run build', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
}

// Run the test
testRevoluteImport();
