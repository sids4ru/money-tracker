-- Migration to make transaction_id unique in transaction_categories table
PRAGMA foreign_keys=off;

BEGIN TRANSACTION;

-- Drop existing indexes
DROP INDEX IF EXISTS idx_transaction_categories_transaction_id;
DROP INDEX IF EXISTS idx_transaction_categories_category_id;

-- Create a new table with the unique constraint on transaction_id
CREATE TABLE transaction_categories_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id INTEGER NOT NULL UNIQUE,
  category_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (transaction_id) REFERENCES transactions (id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE
);

-- Insert unique transaction_id entries (keep only the latest category assignment)
INSERT INTO transaction_categories_new (transaction_id, category_id, created_at)
SELECT transaction_id, category_id, MAX(created_at) 
FROM transaction_categories
GROUP BY transaction_id;

-- Drop old table and rename new one
DROP TABLE transaction_categories;
ALTER TABLE transaction_categories_new RENAME TO transaction_categories;

-- Recreate indexes
CREATE INDEX idx_transaction_categories_transaction_id ON transaction_categories(transaction_id);
CREATE INDEX idx_transaction_categories_category_id ON transaction_categories(category_id);

COMMIT;

PRAGMA foreign_keys=on;
