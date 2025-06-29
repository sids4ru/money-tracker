-- Add parent_category_id column to transaction_categories table
ALTER TABLE transaction_categories ADD COLUMN parent_category_id INTEGER REFERENCES parent_categories(id);

-- Update the parent_category_id values based on category relationships
UPDATE transaction_categories 
SET parent_category_id = (
    SELECT c.parent_id 
    FROM categories c 
    WHERE c.id = transaction_categories.category_id
);

-- Create an index on parent_category_id for better query performance
CREATE INDEX idx_transaction_categories_parent_category_id ON transaction_categories(parent_category_id);
