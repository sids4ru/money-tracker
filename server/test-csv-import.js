const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { TransactionModel } = require('./dist/models/Transaction');

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
    console.log('Starting CSV import test...');
    
    // Path to the test CSV file
    const csvFile = path.join(__dirname, 'test-dummy-transactions.csv');
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
    console.log('Importing transactions to database...');
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
    
  } catch (error) {
    console.error('Error during CSV import test:', error);
  }
}

// Run the test
testCSVImport();
