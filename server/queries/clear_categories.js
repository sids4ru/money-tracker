const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('../data/finance_tracker.db');

// Run the queries in a transaction to ensure consistency
db.serialize(() => {
  // Start a transaction
  db.run('BEGIN TRANSACTION');
  
  console.log("Step 1: Deleting all entries from transaction_categories table...");
  db.run('DELETE FROM transaction_categories', function(err) {
    if (err) {
      console.error('Delete operation failed for transaction_categories:', err);
      db.run('ROLLBACK');
      db.close();
      return;
    }
    
    console.log(`Deleted ${this.changes} rows from transaction_categories table`);
    
    console.log("Step 2: Resetting category fields in transactions table...");
    db.run('UPDATE transactions SET grouping_status = NULL, category_id = NULL, transaction_category_id = NULL', function(err) {
      if (err) {
        console.error('Update operation failed for transactions:', err);
        db.run('ROLLBACK');
        db.close();
        return;
      }
      
      console.log(`Updated ${this.changes} rows in transactions table`);
      
      // Commit the transaction
      db.run('COMMIT', function(err) {
        if (err) {
          console.error('Commit failed:', err);
          db.run('ROLLBACK');
        } else {
          console.log('Transaction committed successfully');
        }
        
        // Verify the changes
        db.get('SELECT COUNT(*) as count FROM transaction_categories', (err, result) => {
          if (err) {
            console.error('Verification query error:', err);
          } else {
            console.log(`Verified: ${result.count} records in transaction_categories table`);
          }
          
          db.get('SELECT COUNT(*) as count FROM transactions WHERE grouping_status IS NOT NULL OR category_id IS NOT NULL OR transaction_category_id IS NOT NULL', (err, result) => {
            if (err) {
              console.error('Verification query error:', err);
            } else {
              console.log(`Verified: ${result.count} transactions still have category assignments`);
            }
            
            db.close();
          });
        });
      });
    });
  });
});
