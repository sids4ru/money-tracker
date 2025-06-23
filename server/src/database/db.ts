import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

// Ensure the data directory exists
const DATA_DIR = path.resolve(__dirname, '../../data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Define the database file path
const DB_PATH = path.join(DATA_DIR, 'finance_tracker.db');

// Create a new database connection
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log(`Connected to SQLite database at ${DB_PATH}`);
});

// Enable foreign keys support
db.exec('PRAGMA foreign_keys = ON;');

// Initialize the database schema
const initializeDatabase = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    console.log('Initializing database schema...');

    db.serialize(() => {
      // Create transactions table if it doesn't exist
      db.run(`
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
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `, (err) => {
        if (err) {
          console.error('Error creating transactions table:', err.message);
          reject(err);
          return;
        }

        // Create index for faster lookups and duplicate detection
        db.run(`
          CREATE INDEX IF NOT EXISTS idx_transaction_lookup 
          ON transactions(account_number, transaction_date, description1, debit_amount, credit_amount)
        `, (err) => {
          if (err) {
            console.error('Error creating index:', err.message);
            reject(err);
            return;
          }

          console.log('Database schema initialized successfully');
          resolve();
        });
      });
    });
  });
};

// Execute database queries with promise wrapper
const query = <T = any>(sql: string, params: any = []): Promise<T[]> => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        console.error('Database query error:', err.message);
        reject(err);
        return;
      }
      resolve(rows as T[]);
    });
  });
};

// Execute a single operation and get the first result
const get = <T = any>(sql: string, params: any = []): Promise<T | undefined> => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        console.error('Database get error:', err.message);
        reject(err);
        return;
      }
      resolve(row as T);
    });
  });
};

// Execute a query that doesn't return data
const run = (sql: string, params: any = []): Promise<{ lastID: number; changes: number }> => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(this: any, err) {
      if (err) {
        console.error('Database run error:', err.message);
        reject(err);
        return;
      }
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

// Close the database connection
const closeDatabase = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
        reject(err);
        return;
      }
      console.log('Database connection closed');
      resolve();
    });
  });
};

export {
  db,
  initializeDatabase,
  query,
  get,
  run,
  closeDatabase,
  DB_PATH
};
