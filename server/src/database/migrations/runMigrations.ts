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
      { name: 'add_grouping_status', file: 'add_grouping_status.sql' }
      // We've removed the update_transaction_category_relation migration as we're handling this in application logic
    ];

    for (const migration of migrations) {
      console.log(`Running migration: ${migration.name}...`);
      
      const migrationContent = fs.readFileSync(
        path.join(__dirname, migration.file), 
        'utf8'
      );
      
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
