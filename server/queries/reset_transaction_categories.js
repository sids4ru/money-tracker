const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('../data/finance_tracker.db');

// Script to reset all category-related fields in transactions table
console.log("Resetting category assignments in transactions table...");

// Run in a transaction for safety
db.serialize(() => {
  db.run('BEGIN TRANSACTION');
  
  // Reset all three category-related fields to NULL
  const query = `
    UPDATE transactions 
    SET 
      grouping_status = NULL, 
      category_id = NULL, 
      transaction_category_id = NULL
  `;
  
  db.run(query, function(err) {
    if (err) {
      console.error('Error updating transactions table:', err);
      db.run('ROLLBACK');
    } else {
      console.log(`Successfully reset ${this.changes} transaction records`);
      
      // Verify the operation
      db.get(`
        SELECT COUNT(*) as count 
        FROM transactions 
        WHERE grouping_status IS NOT NULL 
          OR category_id IS NOT NULL 
          OR transaction_category_id IS NOT NULL
      `, (err, result) => {
        if (err) {
          console.error('Error verifying results:', err);
        } else {
          console.log(`Verification: ${result.count} transactions still have category assignments (should be 0)`);
        }
        
        db.run('COMMIT');
        console.log('Transaction committed');
        db.close();
      });
    }
  });
});
