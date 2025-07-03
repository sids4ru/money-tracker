const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('../data/finance_tracker.db');

// Get schema for transactions table
console.log('Schema for transactions table:');
db.all(`PRAGMA table_info(transactions);`, (err, rows) => {
  if (err) {
    console.error('Error getting table schema:', err);
  } else {
    console.log(JSON.stringify(rows, null, 2));
  }
  
  // Get schema for transaction_categories table
  console.log('\nSchema for transaction_categories table:');
  db.all(`PRAGMA table_info(transaction_categories);`, (err, rows) => {
    if (err) {
      console.error('Error getting table schema:', err);
    } else {
      console.log(JSON.stringify(rows, null, 2));
    }
    
    // Get schema for categories table
    console.log('\nSchema for categories table:');
    db.all(`PRAGMA table_info(categories);`, (err, rows) => {
      if (err) {
        console.error('Error getting table schema:', err);
      } else {
        console.log(JSON.stringify(rows, null, 2));
      }
      
      // Get schema for parent_categories table
      console.log('\nSchema for parent_categories table:');
      db.all(`PRAGMA table_info(parent_categories);`, (err, rows) => {
        if (err) {
          console.error('Error getting table schema:', err);
        } else {
          console.log(JSON.stringify(rows, null, 2));
        }
        
        // Get schema for transaction_similarity_patterns table
        console.log('\nSchema for transaction_similarity_patterns table:');
        db.all(`PRAGMA table_info(transaction_similarity_patterns);`, (err, rows) => {
          if (err) {
            console.error('Error getting table schema:', err);
          } else {
            console.log(JSON.stringify(rows, null, 2));
          }
          
          // Get all foreign key constraints
          console.log('\nForeign key constraints:');
          db.all(`PRAGMA foreign_key_list(transactions);`, (err, rows) => {
            if (err) {
              console.error('Error getting foreign key constraints:', err);
            } else {
              console.log('Foreign keys for transactions table:');
              console.log(JSON.stringify(rows, null, 2));
            }
            
            // Close the database connection
            db.close();
          });
        });
      });
    });
  });
});
