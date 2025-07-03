const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('../data/finance_tracker.db');

// Simple query to get all entries from transaction_categories table
const query = `SELECT * FROM transaction_categories;`;

db.all(query, [], (err, rows) => {
  if (err) {
    console.error('Query error:', err);
  } else {
    console.log('Results from transaction_categories table:', JSON.stringify(rows, null, 2));
  }
  db.close();
});
