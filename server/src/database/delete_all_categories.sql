-- Clear all category assignments 
DELETE FROM transaction_categories;

-- Reset auto-increment id for transaction_categories table
DELETE FROM sqlite_sequence WHERE name='transaction_categories';

-- Set all transactions grouping status to null/none
UPDATE transactions SET grouping_status = 'none' WHERE grouping_status IS NOT NULL;
