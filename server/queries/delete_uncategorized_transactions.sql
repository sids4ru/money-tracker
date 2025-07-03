-- SQL Query to delete all transactions without a category ID
-- WARNING: This is a destructive operation that permanently deletes data
-- Make sure to backup your database before running this query

-- Using EXISTS is generally more efficient than NOT IN for large datasets
DELETE FROM transactions 
WHERE NOT EXISTS (
    SELECT 1
    FROM transaction_categories
    WHERE transaction_categories.transaction_id = transactions.id
);
