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
          grouping_status TEXT CHECK(grouping_status IN ('manual', 'auto', 'none') OR grouping_status IS NULL),
          category_id INTEGER,
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
          
          // Create categories table
          db.run(`
            CREATE TABLE IF NOT EXISTS categories (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL UNIQUE,
              parent_id INTEGER,
              description TEXT,
              created_at TEXT NOT NULL DEFAULT (datetime('now')),
              FOREIGN KEY (parent_id) REFERENCES categories (id)
            )
          `, (err) => {
            if (err) {
              console.error('Error creating categories table:', err.message);
              reject(err);
              return;
            }
            
            // Create transaction_categories junction table
            db.run(`
              CREATE TABLE IF NOT EXISTS transaction_categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                transaction_id INTEGER NOT NULL,
                category_id INTEGER NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                UNIQUE(transaction_id, category_id),
                FOREIGN KEY (transaction_id) REFERENCES transactions (id) ON DELETE CASCADE,
                FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE
              )
            `, (err) => {
              if (err) {
                console.error('Error creating transaction_categories table:', err.message);
                reject(err);
                return;
              }
              
              // Create indexes for performance
              db.run(`
                CREATE INDEX IF NOT EXISTS idx_transaction_categories_transaction_id 
                ON transaction_categories(transaction_id)
              `, (err) => {
                if (err) {
                  console.error('Error creating transaction_categories index:', err.message);
                  reject(err);
                  return;
                }
                
                db.run(`
                  CREATE INDEX IF NOT EXISTS idx_transaction_categories_category_id 
                  ON transaction_categories(category_id)
                `, (err) => {
                  if (err) {
                    console.error('Error creating transaction_categories index:', err.message);
                    reject(err);
                    return;
                  }
                  
                  // Seed initial categories if needed
                  seedInitialCategories().then(() => {
                    console.log('Database schema initialized successfully');
                    resolve();
                  }).catch(err => {
                    console.error('Error seeding initial categories:', err.message);
                    reject(err);
                  });
                });
              });
            });
          });
        });
      });
    });
  });
};

// Seed initial categories
const seedInitialCategories = async (): Promise<void> => {
  // Check if categories already exist
  const categories = await query<{ count: number }>('SELECT COUNT(*) as count FROM categories');
  
  if (categories[0].count > 0) {
    console.log('Categories already seeded, skipping...');
    return;
  }
  
  console.log('Seeding initial categories...');
  
  // Insert main categories first
  const mainCategories = [
    { name: 'Earnings', description: 'Income and revenue sources' },
    { name: 'Expenditures', description: 'All expenses and outgoing payments' },
    { name: 'Savings', description: 'Savings and investments' }
  ];
  
  const mainCategoryIds: Record<string, number> = {};
  
  for (const category of mainCategories) {
    try {
      const result = await run(
        'INSERT INTO categories (name, description) VALUES (?, ?)',
        [category.name, category.description]
      );
      mainCategoryIds[category.name] = result.lastID;
      console.log(`Added category: ${category.name} with ID ${result.lastID}`);
    } catch (error) {
      console.error(`Error adding category ${category.name}:`, error);
      throw error;
    }
  }
  
  // Insert subcategories
  const subCategories = [
    // Earnings subcategories
    // { name: 'Salary', parentName: 'Earnings', description: 'Regular employment income' },
    
    // Expenditures subcategories
    { name: 'Grocery', parentName: 'Expenditures', description: 'Food and household items (Tesco, Aldi, Lidl, etc.)' },
    { name: 'Entertainment', parentName: 'Expenditures', description: 'Restaurants, cinema, bars, etc.' },
    { name: 'Travel', parentName: 'Expenditures', description: 'Flights, hotels, train tickets, etc.' },
    { name: 'Utilities', parentName: 'Expenditures', description: 'Electricity, gas, water, internet, etc.' },
    
    // Savings subcategories
    { name: 'Fixed Deposits', parentName: 'Savings', description: 'FD accounts and term deposits' },
    { name: 'Recurring Deposits', parentName: 'Savings', description: 'RD accounts' },
    { name: 'eToro', parentName: 'Savings', description: 'eToro trading platform' },
    { name: 'Trading 121', parentName: 'Savings', description: 'Trading 121 platform' },
  ];
  
  for (const category of subCategories) {
    try {
      const parentId = mainCategoryIds[category.parentName];
      if (!parentId) {
        throw new Error(`Parent category ${category.parentName} not found`);
      }
      
      await run(
        'INSERT INTO categories (name, parent_id, description) VALUES (?, ?, ?)',
        [category.name, parentId, category.description]
      );
      console.log(`Added subcategory: ${category.name} under ${category.parentName}`);
    } catch (error) {
      console.error(`Error adding subcategory ${category.name}:`, error);
      throw error;
    }
  }
  
  console.log('Initial categories seeded successfully');
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
