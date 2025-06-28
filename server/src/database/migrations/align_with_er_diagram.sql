-- Migration to align database schema with ER diagram
PRAGMA foreign_keys=off;

BEGIN TRANSACTION;

-- Step 1: Create parent_categories table
CREATE TABLE IF NOT EXISTS parent_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Transfer existing parent categories to the new table
INSERT OR IGNORE INTO parent_categories (name, description)
SELECT DISTINCT name, description
FROM categories
WHERE parent_id IS NULL;

-- Step 3: Create transaction_similarity_patterns table
CREATE TABLE IF NOT EXISTS transaction_similarity_patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pattern_type TEXT NOT NULL,
    pattern_value TEXT NOT NULL,
    parent_category_id INTEGER,
    category_id INTEGER,
    confidence_score REAL DEFAULT 1.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usage_count INTEGER DEFAULT 0,
    FOREIGN KEY (parent_category_id) REFERENCES parent_categories(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- Step 4: Create a backup of the existing categories table
CREATE TABLE categories_backup AS SELECT * FROM categories;

-- Step 5: Create a new categories table that references parent_categories
CREATE TABLE new_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    parent_id INTEGER,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES parent_categories(id) ON DELETE CASCADE
);

-- Step 6: Copy subcategories to the new table
-- For each subcategory, find its parent category's parent_categories.id
INSERT INTO new_categories (name, parent_id, description, created_at)
SELECT 
    c_sub.name,
    pc.id,
    c_sub.description,
    c_sub.created_at
FROM categories c_sub
JOIN categories c_parent ON c_sub.parent_id = c_parent.id
JOIN parent_categories pc ON c_parent.name = pc.name
WHERE c_sub.parent_id IS NOT NULL;

-- Step 7: Drop old table and rename new table
DROP TABLE categories;
ALTER TABLE new_categories RENAME TO categories;

-- Step 8: Create indexes for better performance
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_transaction_similarity_pattern_type ON transaction_similarity_patterns(pattern_type);
CREATE INDEX idx_transaction_similarity_parent_category ON transaction_similarity_patterns(parent_category_id);
CREATE INDEX idx_transaction_similarity_category ON transaction_similarity_patterns(category_id);

-- Step 9: Update transaction_categories table to maintain relationships
-- This keeps transaction category assignments intact

COMMIT;

PRAGMA foreign_keys=on;
