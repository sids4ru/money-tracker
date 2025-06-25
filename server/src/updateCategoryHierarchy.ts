import { CategoryModel } from './models/Category';
import { initializeDatabase } from './database/db';

// Define parent-child relationships for categories
const categoryRelationships = [
  { name: 'Grocery', parentName: 'Expenditures' },
  { name: 'Entertainment', parentName: 'Expenditures' },
  { name: 'Utilities', parentName: 'Expenditures' },
  { name: 'Travel', parentName: 'Expenditures' },
  { name: 'Rent', parentName: 'Expenditures' },
  { name: 'School', parentName: 'Expenditures' },
  { name: 'Holiday', parentName: 'Expenditures' },
  { name: 'Revolute', parentName: 'Savings' },
  { name: 'Recurring Deposits', parentName: 'Savings' },
  { name: 'Fixed Deposits', parentName: 'Savings' },
  { name: 'eToro', parentName: 'Savings' },
  { name: 'Trading 121', parentName: 'Savings' },
  { name: 'Salary', parentName: 'Earnings' },
  { name: 'Others', parentName: 'Earnings' },
  { name: 'Dividents', parentName: 'Earnings' }
];

async function updateCategoryHierarchy() {
  try {
    // Initialize database connection
    await initializeDatabase();
    console.log('Database connection established');
    
    // Get all categories to find their IDs
    const allCategories = await CategoryModel.getAll();
    const categoryMap = new Map<string, number>();
    
    allCategories.forEach(category => {
      if (category.name && category.id) {
        categoryMap.set(category.name, category.id);
      }
    });
    
    console.log('Found categories:', categoryMap.size);
    
    // Update each category with its parent ID
    let updateCount = 0;
    for (const relationship of categoryRelationships) {
      const childId = categoryMap.get(relationship.name);
      const parentId = categoryMap.get(relationship.parentName);
      
      if (childId && parentId) {
        console.log(`Setting ${relationship.name} (ID: ${childId}) as child of ${relationship.parentName} (ID: ${parentId})`);
        
        // Update the parent_id of the child category
        const success = await CategoryModel.update(childId, { parent_id: parentId });
        if (success) {
          updateCount++;
          console.log(`Successfully updated ${relationship.name}`);
        } else {
          console.error(`Failed to update ${relationship.name}`);
        }
      } else {
        console.warn(
          `Couldn't find IDs for ${relationship.name} (${childId}) or ${relationship.parentName} (${parentId})`
        );
      }
    }
    
    console.log(`Updated ${updateCount} categories successfully`);
    console.log('Category hierarchy update complete');
  } catch (error) {
    console.error('Error updating category hierarchy:', error);
  }
}

// Execute the update
updateCategoryHierarchy().then(() => {
  console.log('Category update script completed');
  process.exit(0);
}).catch(err => {
  console.error('Error running update script:', err);
  process.exit(1);
});
