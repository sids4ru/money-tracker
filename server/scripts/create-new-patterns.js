#!/usr/bin/env node

/**
 * Script to create new transaction patterns for automatic categorization
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// Define database path
const DATA_DIR = path.resolve(__dirname, '../data');
const DB_PATH = path.join(DATA_DIR, 'finance_tracker.db');

// Check if database exists
if (!fs.existsSync(DB_PATH)) {
  console.error(`Error: Database file not found at ${DB_PATH}`);
  process.exit(1);
}

// Connect to the database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
    process.exit(1);
  }
  console.log(`Connected to SQLite database at ${DB_PATH}`);
});

// Promise wrapper for database operations
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({ changes: this.changes, lastID: this.lastID });
    });
  });
}

function getAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

// Create readline interface for user interaction
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to create new patterns based on common transaction prefixes
async function createCommonPatterns() {
  try {
    console.log('\n=== Creating Common Transaction Patterns ===');
    
    // First, get all categories
    const categories = await getAll('SELECT * FROM categories');
    console.log(`Found ${categories.length} categories.`);
    
    if (categories.length === 0) {
      console.error('No categories found. Please create categories first.');
      return;
    }
    
    // Find common category IDs
    const grocery = categories.find(c => c.name.toLowerCase() === 'grocery');
    const groceryId = grocery ? grocery.id : null;
    
    const entertainment = categories.find(c => c.name.toLowerCase() === 'entertainment');
    const entertainmentId = entertainment ? entertainment.id : null;
    
    const utilities = categories.find(c => c.name.toLowerCase() === 'utilities');
    const utilitiesId = utilities ? utilities.id : null;
    
    const travel = categories.find(c => c.name.toLowerCase() === 'travel');
    const travelId = travel ? travel.id : null;
    
    // Create new more specific patterns based on the VDP- and VDC- prefixes
    const newPatterns = [];
    
    // Add grocery patterns if category exists
    if (groceryId) {
      console.log(`Using Grocery category ID: ${groceryId}`);
      newPatterns.push(
        { pattern_type: 'contains', pattern_value: 'VDP-TESCO', category_id: groceryId, confidence_score: 1.0 },
        { pattern_type: 'contains', pattern_value: 'VDC-TESCO', category_id: groceryId, confidence_score: 1.0 },
        { pattern_type: 'contains', pattern_value: 'VDP-ALDI', category_id: groceryId, confidence_score: 1.0 },
        { pattern_type: 'contains', pattern_value: 'VDC-ALDI', category_id: groceryId, confidence_score: 1.0 },
        { pattern_type: 'contains', pattern_value: 'VDP-LIDL', category_id: groceryId, confidence_score: 1.0 },
        { pattern_type: 'contains', pattern_value: 'VDC-LIDL', category_id: groceryId, confidence_score: 1.0 },
        { pattern_type: 'contains', pattern_value: 'VDC-SPAR', category_id: groceryId, confidence_score: 1.0 },
        { pattern_type: 'contains', pattern_value: 'VDP-SPAR', category_id: groceryId, confidence_score: 1.0 },
        { pattern_type: 'contains', pattern_value: 'VDC-DUNNES', category_id: groceryId, confidence_score: 1.0 },
        { pattern_type: 'contains', pattern_value: 'VDP-DUNNES', category_id: groceryId, confidence_score: 1.0 },
        { pattern_type: 'contains', pattern_value: 'VDC-SUPERVALU', category_id: groceryId, confidence_score: 1.0 },
        { pattern_type: 'contains', pattern_value: 'VDP-SUPERVALU', category_id: groceryId, confidence_score: 1.0 },
        { pattern_type: 'contains', pattern_value: 'VDC-CENTRA', category_id: groceryId, confidence_score: 1.0 },
        { pattern_type: 'contains', pattern_value: 'VDP-CENTRA', category_id: groceryId, confidence_score: 1.0 },
        { pattern_type: 'contains', pattern_value: 'INGREDIENTS', category_id: groceryId, confidence_score: 1.0 }
      );
    }
    
    // Add utilities patterns if category exists
    if (utilitiesId) {
      console.log(`Using Utilities category ID: ${utilitiesId}`);
      newPatterns.push(
        { pattern_type: 'contains', pattern_value: 'VDP-PINERGY', category_id: utilitiesId, confidence_score: 1.0 },
        { pattern_type: 'contains', pattern_value: 'VDC-PINERGY', category_id: utilitiesId, confidence_score: 1.0 },
        { pattern_type: 'contains', pattern_value: 'VDP-ELECTRIC', category_id: utilitiesId, confidence_score: 1.0 },
        { pattern_type: 'contains', pattern_value: 'VDC-ELECTRIC', category_id: utilitiesId, confidence_score: 1.0 },
        { pattern_type: 'contains', pattern_value: 'PINERGY', category_id: utilitiesId, confidence_score: 1.0 }
      );
    }
    
    // Add entertainment patterns if category exists
    if (entertainmentId) {
      console.log(`Using Entertainment category ID: ${entertainmentId}`);
      newPatterns.push(
        { pattern_type: 'contains', pattern_value: 'VDP-NETFLIX', category_id: entertainmentId, confidence_score: 1.0 },
        { pattern_type: 'contains', pattern_value: 'VDC-NETFLIX', category_id: entertainmentId, confidence_score: 1.0 },
        { pattern_type: 'contains', pattern_value: 'VDP-SPOTIFY', category_id: entertainmentId, confidence_score: 1.0 },
        { pattern_type: 'contains', pattern_value: 'VDC-SPOTIFY', category_id: entertainmentId, confidence_score: 1.0 },
        { pattern_type: 'contains', pattern_value: 'VDP-CINEMA', category_id: entertainmentId, confidence_score: 1.0 },
        { pattern_type: 'contains', pattern_value: 'VDC-CINEMA', category_id: entertainmentId, confidence_score: 1.0 },
        { pattern_type: 'contains', pattern_value: 'NETFLIX', category_id: entertainmentId, confidence_score: 1.0 },
        { pattern_type: 'contains', pattern_value: 'SPOTIFY', category_id: entertainmentId, confidence_score: 1.0 }
      );
    }

    // Add travel patterns if category exists
    if (travelId) {
      console.log(`Using Travel category ID: ${travelId}`);
      newPatterns.push(
        { pattern_type: 'contains', pattern_value: 'VDP-LEAP', category_id: travelId, confidence_score: 1.0 },
        { pattern_type: 'contains', pattern_value: 'VDC-LEAP', category_id: travelId, confidence_score: 1.0 },
        { pattern_type: 'contains', pattern_value: 'LEAP CARD', category_id: travelId, confidence_score: 1.0 }
      );
    }

    if (newPatterns.length === 0) {
      console.log("No patterns to add. Make sure you have categories with the right names (e.g., 'Grocery', 'Utilities', etc.)");
      return;
    }
    
    // Ask for confirmation
    rl.question(`Do you want to add ${newPatterns.length} new transaction patterns? (yes/no): `, async (answer) => {
      if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
        try {
          // Begin transaction
          await runQuery('BEGIN TRANSACTION');
          
          // Insert the new patterns
          let addedCount = 0;
          
          for (const pattern of newPatterns) {
            try {
              // Check if a similar pattern already exists
              const existing = await getAll(
                `SELECT * FROM transaction_similarity_patterns 
                 WHERE pattern_type = ? AND pattern_value = ? AND category_id = ?`,
                [pattern.pattern_type, pattern.pattern_value, pattern.category_id]
              );
              
              if (existing.length > 0) {
                console.log(`Pattern already exists: ${pattern.pattern_type} "${pattern.pattern_value}" -> categoryId: ${pattern.category_id}`);
                continue;
              }
              
              // Insert the new pattern
              const result = await runQuery(
                `INSERT INTO transaction_similarity_patterns 
                 (pattern_type, pattern_value, category_id, confidence_score) 
                 VALUES (?, ?, ?, ?)`,
                [pattern.pattern_type, pattern.pattern_value, pattern.category_id, pattern.confidence_score]
              );
              
              if (result.lastID) {
                console.log(`Added pattern: ${pattern.pattern_type} "${pattern.pattern_value}" -> categoryId: ${pattern.category_id}`);
                addedCount++;
              }
            } catch (error) {
              console.error(`Error adding pattern "${pattern.pattern_value}":`, error.message);
            }
          }
          
          // Commit transaction
          await runQuery('COMMIT');
          console.log(`Successfully added ${addedCount} new transaction patterns.`);
          
        } catch (error) {
          // Rollback on error
          await runQuery('ROLLBACK');
          console.error('Error adding patterns:', error.message);
        }
      } else {
        console.log('Operation cancelled. No patterns were added.');
      }
      
      // Close the database
      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err.message);
        } else {
          console.log('Database connection closed');
        }
        rl.close();
      });
    });
  } catch (error) {
    console.error('Error creating patterns:', error);
    db.close();
    rl.close();
  }
}

// Main function
async function main() {
  await createCommonPatterns();
}

// Run the main function
main();
