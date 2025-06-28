-- Migration to add common categories
PRAGMA foreign_keys=on;

BEGIN TRANSACTION;

-- Add common expenditure categories
INSERT OR IGNORE INTO categories (name, parent_id, description) VALUES 
('Grocery', 2, 'Food and household items from supermarkets'),
('Entertainment', 2, 'Movies, games, streaming services, etc.'),
('Dining Out', 2, 'Restaurant and cafe expenses'),
('Transport', 2, 'Public transport, fuel, ride-sharing services'),
('Utilities', 2, 'Electricity, water, gas, internet bills'),
('Rent', 2, 'Housing rent payments'),
('Shopping', 2, 'Clothing, electronics, and other retail purchases'),
('Healthcare', 2, 'Medical expenses, medication, insurance'),
('Education', 2, 'Tuition, books, courses'),
('Travel', 2, 'Vacations, hotels, flights');

-- Add common earnings categories
INSERT OR IGNORE INTO categories (name, parent_id, description) VALUES 
('Bonus', 1, 'Performance or seasonal bonuses'),
('Freelance', 1, 'Income from freelance work'),
('Investment Income', 1, 'Dividends, interest, capital gains'),
('Gifts', 1, 'Money received as gifts'),
('Refunds', 1, 'Money returned from purchases or services');

-- Add common savings categories
INSERT OR IGNORE INTO categories (name, parent_id, description) VALUES 
('Emergency Fund', 3, 'Savings for unexpected expenses'),
('Retirement', 3, 'Retirement savings and pension contributions'),
('Fixed Deposits', 3, 'Fixed term deposits at banks'),
('Investments', 3, 'Stocks, bonds, mutual funds, etc.'),
('Goals', 3, 'Saving for specific goals like vacation, car, etc.');

-- Add some common transaction pattern rules
INSERT OR IGNORE INTO transaction_similarity_patterns (pattern_type, pattern_value, category_id, confidence_score) VALUES
('merchant', 'TESCO', (SELECT id FROM categories WHERE name = 'Grocery'), 0.9),
('merchant', 'ALDI', (SELECT id FROM categories WHERE name = 'Grocery'), 0.9),
('merchant', 'LIDL', (SELECT id FROM categories WHERE name = 'Grocery'), 0.9),
('merchant', 'NETFLIX', (SELECT id FROM categories WHERE name = 'Entertainment'), 0.95),
('merchant', 'SPOTIFY', (SELECT id FROM categories WHERE name = 'Entertainment'), 0.95),
('merchant', 'UBER', (SELECT id FROM categories WHERE name = 'Transport'), 0.8),
('merchant', 'AMAZON', (SELECT id FROM categories WHERE name = 'Shopping'), 0.75),
('merchant', 'PAYPAL', (SELECT id FROM categories WHERE name = 'Shopping'), 0.6),
('description', 'SALARY', (SELECT id FROM categories WHERE name = 'Salary'), 0.95),
('description', 'RENT', (SELECT id FROM categories WHERE name = 'Rent'), 0.9);

COMMIT;
