// Test script to verify category creation persistence
const { CategoryModel } = require('./models/Category');
const { ParentCategoryModel } = require('./models/ParentCategory');
const { initializeDatabase, closeDatabase } = require('./database/db');

async function testCategoryCreation() {
  try {
    console.log("Initializing database...");
    await initializeDatabase();
    
    // Test creating a parent category
    const parentCategoryName = `Test Parent ${Date.now()}`;
    console.log(`Creating parent category: ${parentCategoryName}`);
    
    const parentId = await ParentCategoryModel.create({
      name: parentCategoryName,
      description: "Test parent category for persistence testing"
    });
    
    console.log(`Created parent category with ID: ${parentId}`);
    
    // Test creating a regular category under this parent
    const categoryName = `Test Category ${Date.now()}`;
    console.log(`Creating category: ${categoryName} under parent ${parentId}`);
    
    const categoryId = await CategoryModel.create({
      name: categoryName,
      parent_id: parentId,
      description: "Test category for persistence testing"
    });
    
    console.log(`Created category with ID: ${categoryId}`);
    
    // Verify both were created
    console.log("Verifying created categories...");
    
    const parentCategory = await ParentCategoryModel.getById(parentId);
    console.log("Parent category:", parentCategory);
    
    const category = await CategoryModel.getById(categoryId);
    console.log("Category:", category);
    
    // Verify by name too
    const parentByName = await ParentCategoryModel.findByName(parentCategoryName);
    console.log("Parent by name:", parentByName);
    
    const categoryByParent = await CategoryModel.getCategoriesByParentId(parentId);
    console.log("Categories by parent:", categoryByParent);
    
    // Force a checkpoint on the WAL
    console.log("Forcing database checkpoint...");
    const { db } = require('./database/db');
    await new Promise((resolve, reject) => {
      db.exec('PRAGMA wal_checkpoint(FULL);', (err) => {
        if (err) {
          console.error("Error during checkpoint:", err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
    
    console.log("Properly closing database connection...");
    await closeDatabase();
    console.log("Test completed successfully!");
    process.exit(0);
    
  } catch (error) {
    console.error("Test failed:", error);
    process.exit(1);
  }
}

// Run the test
testCategoryCreation();
