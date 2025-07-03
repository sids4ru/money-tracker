import { TransactionModel } from './models/Transaction';

/**
 * Script to clean up dummy/test transactions that were accidentally imported
 */
async function cleanupDummyTransactions() {
  try {
    console.log('Searching for dummy transactions...');
    
    // Search for transactions containing "DUMMY" in their descriptions
    const dummyTransactions = await TransactionModel.search({
      searchText: 'DUMMY'
    });
    
    if (dummyTransactions.length === 0) {
      console.log('No dummy transactions found.');
      return;
    }
    
    console.log(`Found ${dummyTransactions.length} dummy transactions:`);
    
    // Display the transactions to be deleted
    dummyTransactions.forEach(transaction => {
      console.log(`ID: ${transaction.id}, Date: ${transaction.transaction_date}, Description: ${transaction.description1}, Amount: ${transaction.debit_amount || transaction.credit_amount}`);
    });
    
    console.log('\nDeleting dummy transactions...');
    
    // Delete each transaction
    let deletedCount = 0;
    for (const transaction of dummyTransactions) {
      if (transaction.id) {
        const deleted = await TransactionModel.delete(transaction.id);
        if (deleted) {
          deletedCount++;
          console.log(`Deleted transaction ID: ${transaction.id}`);
        }
      }
    }
    
    console.log(`\nCleanup complete. Deleted ${deletedCount} dummy transactions.`);
  } catch (error) {
    console.error('Error cleaning up dummy transactions:', error);
  }
}

// Execute the function
cleanupDummyTransactions()
  .then(() => {
    console.log('Process finished.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Process failed with error:', error);
    process.exit(1);
  });
