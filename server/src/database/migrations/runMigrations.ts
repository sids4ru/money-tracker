import { db } from '../db';
import fs from 'fs';
import path from 'path';

/**
 * Run all migration scripts in the migrations directory
 */
const runMigrations = async (): Promise<void> => {
  console.log('Running database migrations...');
  
  try {
    // Read and execute migrations
    const migrations = [
      { name: 'align_with_er_diagram', file: 'align_with_er_diagram.sql' },
      { name: 'add_transaction_unique_constraint', file: 'add_transaction_unique_constraint.sql' },
      { name: 'add_common_categories', file: 'add_common_categories.sql' }
    ];

    for (const migration of migrations) {
      console.log(`Running migration: ${migration.name}...`);
      
      // Fix path to find SQL files in the src directory 
      let filePath = path.join(__dirname, migration.file);
      
      // If running from dist/, look for files in src instead
      if (filePath.includes('/dist/')) {
        filePath = filePath.replace('/dist/', '/src/');
      }
      
      const migrationContent = fs.readFileSync(filePath, 'utf8');
      
      // Execute the migration
      await executeMigration(migrationContent);
      
      console.log(`Migration ${migration.name} completed`);
    }
    
    console.log('Database migrations completed successfully');
  } catch (err) {
    console.error('Error running migrations:', err);
    throw err;
  }
};

/**
 * Execute a single migration script
 */
const executeMigration = async (migrationContent: string): Promise<void> => {
  // Split by semicolons to get individual statements
  const statements = migrationContent.split(';').filter(stmt => stmt.trim());
  
  for (const statement of statements) {
    if (statement.trim()) {
      try {
        await new Promise<void>((resolve, reject) => {
          db.run(statement, (err) => {
            if (err) {
              // Ignore errors about columns already existing
              if (err.message.includes('duplicate column name') || 
                  err.message.includes('already exists')) {
                console.log(`Note: ${err.message}`);
                resolve();
              } else {
                reject(err);
              }
            } else {
              resolve();
            }
          });
        });
      } catch (err) {
        console.error(`Error executing migration statement: ${statement}`, err);
      }
    }
  }
};

// Run migrations if this script is executed directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('Migrations completed');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

export { runMigrations };
