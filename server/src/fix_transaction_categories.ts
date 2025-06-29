import { db } from './database/db';
import { get, query, run } from './database/db';

interface TransactionCategory {
  id: number;
  transaction_id: number;
  category_id: number;
  parent_category_id: number | null;
}

interface Category {
  id: number;
  name: string;
  parent_id: number | null;
}

/**
 * This script fixes transaction categories by updating parent_category_id
 * for all transaction_categories records based on their category_id relation
 */
async function fixTransactionCategories(): Promise<void> {
  console.log('Starting to fix transaction categories...');

  try {
    // Check if parent_category_id column exists, if not, add it
    try {
      await run(`SELECT parent_category_id FROM transaction_categories LIMIT 1`);
      console.log('parent_category_id column already exists');
    } catch (err) {
      console.log('Adding parent_category_id column to transaction_categories table');
      await run(`ALTER TABLE transaction_categories ADD COLUMN parent_category_id INTEGER REFERENCES parent_categories(id)`);
      console.log('Column added successfully');
    }

    // Get all transaction categories (without parent_category_id since it might be null)
    const transactionCategories = await query<TransactionCategory>(`
      SELECT 
        tc.id, tc.transaction_id, tc.category_id
      FROM 
        transaction_categories tc
    `);

    console.log(`Found ${transactionCategories.length} transaction categories total`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const tc of transactionCategories) {
      // Get the category for this transaction_category to find its parent_id
      const category = await get<Category>('SELECT * FROM categories WHERE id = ?', [tc.category_id]);
      
      if (category) {
        // Update all records since we've just created the column
        await run(
          'UPDATE transaction_categories SET parent_category_id = ? WHERE id = ?',
          [category.parent_id, tc.id]
        );
        updatedCount++;
        console.log(`Updated transaction category ${tc.id} with parent_category_id ${category.parent_id}`);
      } else {
        console.warn(`Category ${tc.category_id} not found for transaction category ${tc.id}`);
      }
    }

    console.log(`Fixed transaction categories: ${updatedCount} updated, ${skippedCount} already correct`);
    console.log('Finished fixing transaction categories');
  } catch (error) {
    console.error('Error fixing transaction categories:', error);
  }
}

// Run the script if executed directly
if (require.main === module) {
  fixTransactionCategories()
    .then(() => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Script failed:', err);
      process.exit(1);
    });
}

export { fixTransactionCategories };
