-- Add grouping_status and category_id columns to transactions table if they don't exist
PRAGMA foreign_keys=off;

BEGIN TRANSACTION;

-- Add the grouping_status column if it doesn't exist
ALTER TABLE transactions ADD COLUMN grouping_status TEXT CHECK(grouping_status IN ('manual', 'auto', 'none') OR grouping_status IS NULL);

-- Add the category_id column if it doesn't exist
ALTER TABLE transactions ADD COLUMN category_id INTEGER;

-- Set all existing transactions to 'none' grouping status by default
UPDATE transactions SET grouping_status = 'none' WHERE grouping_status IS NULL;

-- Create an index on grouping_status for faster filtering
CREATE INDEX IF NOT EXISTS idx_transaction_grouping ON transactions(grouping_status);

COMMIT;

PRAGMA foreign_keys=on;
