// Simple test script to assign a category to a transaction
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Open the database
const db = new sqlite3.Database(path.join(__dirname, 'data/finance_tracker.db'), (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to the SQLite database');
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON;');

// Log current state before changes
async function logState() {
  return new Promise((resolve, reject) => {
    db.all('SELECT COUNT(*) as count FROM transaction_categories', (err, rows) => {
      if (err) reject(err);
      else {
        console.log(`Current transaction_categories count: ${rows[0].count}`);
        resolve();
      }
    });
  });
}

// Assign a category to a transaction
async function assignCategory(transactionId, categoryId) {
  return new Promise((resolve, reject) => {
    console.log(`Assigning transaction ${transactionId} to category ${categoryId}...`);
    
    // First delete any existing assignments
    db.run('DELETE FROM transaction_categories WHERE transaction_id = ?', [transactionId], function(err) {
      if (err) {
        console.error('Error removing existing categories:', err.message);
        reject(err);
        return;
      }
      
      console.log(`Removed any existing categories for transaction ${transactionId}`);
      
      // Then insert the new assignment
      db.run(
        'INSERT INTO transaction_categories (transaction_id, category_id) VALUES (?, ?)',
        [transactionId, categoryId], 
        function(err) {
          if (err) {
            console.error('Error assigning category:', err.message);
            reject(err);
            return;
          }
          
          console.log(`Successfully assigned transaction ${transactionId} to category ${categoryId}`);
          console.log(`Assignment ID: ${this.lastID}`);
          
          // Update the transaction's grouping status
          db.run(
            'UPDATE transactions SET grouping_status = ? WHERE id = ?',
            ['manual', transactionId],
            function(err) {
              if (err) {
                console.error('Error updating grouping status:', err.message);
                reject(err);
                return;
              }
              
              console.log(`Updated grouping status for transaction ${transactionId}`);
              resolve(this.lastID);
            }
          );
        }
      );
    });
  });
}

// Check if we have transactions and categories
db.serialize(async () => {
  try {
    // Get first transaction ID
    const transactions = await new Promise((resolve, reject) => {
      db.all('SELECT id FROM transactions LIMIT 1', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    if (transactions.length === 0) {
      console.error('No transactions found in the database');
      db.close();
      return;
    }
    
    // Get first category ID
    const categories = await new Promise((resolve, reject) => {
      db.all('SELECT id FROM categories LIMIT 1', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    if (categories.length === 0) {
      console.error('No categories found in the database');
      db.close();
      return;
    }
    
    const transactionId = transactions[0].id;
    const categoryId = categories[0].id;
    
    console.log(`Will use transaction ID ${transactionId} and category ID ${categoryId}`);
    
    // Log initial state
    await logState();
    
    // Assign category
    await assignCategory(transactionId, categoryId);
    
    // Log final state
    await logState();
    
    // Verify the assignment
    db.all(
      `SELECT t.id, t.description1, c.name as category_name, tc.id as assignment_id
       FROM transactions t
       JOIN transaction_categories tc ON t.id = tc.transaction_id
       JOIN categories c ON c.id = tc.category_id
       WHERE t.id = ?`,
      [transactionId],
      (err, rows) => {
        if (err) {
          console.error('Error verifying assignment:', err.message);
        } else {
          console.log('Assignment verification:', rows);
        }
        
        // Close the database connection
        db.close();
      }
    );
  } catch (error) {
    console.error('Error:', error);
    db.close();
  }
});
