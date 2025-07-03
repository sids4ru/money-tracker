import sqlite3 from 'sqlite3';
import * as sqlite from 'sqlite';
import path from 'path';
import fs from 'fs';
import { jest } from '@jest/globals';

let db: sqlite.Database | null = null;

/**
 * Initialize an in-memory SQLite database for testing
 */
export const initTestDb = async (): Promise<sqlite.Database> => {
  if (db) {
    return db;
  }
  
  // Create an in-memory database
  db = await sqlite.open({
    filename: ':memory:',
    driver: sqlite3.Database
  });
  
  // Run schema initialization scripts
  const schemaPath = path.join(__dirname, '../../src/database');
  
  if (db) {
    // Create tables that match our schema
    // These are the main tables needed for transaction import tests
    await db.exec(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_number TEXT NOT NULL,
        transaction_date TEXT NOT NULL,
        description1 TEXT,
        description2 TEXT,
        description3 TEXT,
        debit_amount TEXT,
        credit_amount TEXT,
        balance TEXT NOT NULL,
        currency TEXT NOT NULL,
        transaction_type TEXT NOT NULL,
        local_currency_amount TEXT,
        local_currency TEXT,
        grouping_status TEXT,
        category_id INTEGER,
        transaction_category_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS parent_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        parent_id INTEGER,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES parent_categories(id)
      );
      
      CREATE TABLE IF NOT EXISTS transaction_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id INTEGER NOT NULL UNIQUE,
        category_id INTEGER NOT NULL,
        parent_category_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id),
        FOREIGN KEY (parent_category_id) REFERENCES parent_categories(id)
      );
      
      CREATE TABLE IF NOT EXISTS transaction_similarity_patterns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pattern_type TEXT NOT NULL,
        pattern_value TEXT NOT NULL,
        parent_category_id INTEGER,
        category_id INTEGER,
        confidence_score REAL NOT NULL DEFAULT 1.0,
        usage_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_category_id) REFERENCES parent_categories(id) ON DELETE SET NULL,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
      );
    `);
  }
  
  return db as sqlite.Database;
};

/**
 * Reset the database by clearing all tables
 */
export const resetTestDb = async (): Promise<void> => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  
  await db.exec(`
    DELETE FROM transaction_similarity_patterns;
    DELETE FROM transaction_categories;
    DELETE FROM transactions;
    DELETE FROM categories;
    DELETE FROM parent_categories;
    DELETE FROM sqlite_sequence;  /* Reset autoincrement counters */
  `);
};

/**
 * Close the database connection
 */
export const closeTestDb = async (): Promise<void> => {
  if (db) {
    await db.close();
    db = null;
  }
};

/**
 * Get the test database instance
 */
export const getTestDb = (): sqlite.Database => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
};

/**
 * Mock the db.ts functions to use our test database
 */
export const mockDbModule = (): void => {
  // Mock the database functions
  jest.doMock('../../src/database/db', () => ({
    query: async <T>(sql: string, params: any[] = []): Promise<T[]> => {
      const db = getTestDb();
      
      // Special handling for transaction queries to ensure transaction_category_id is included
      if (sql.includes('transactions t') && sql.includes('LEFT JOIN')) {
        return db.all(sql, params);
      }
      
      return db.all(sql, params);
    },
    get: async <T>(sql: string, params: any[] = []): Promise<T | undefined> => {
      const db = getTestDb();
      
      // Special handling for transaction queries to ensure transaction_category_id is included
      // In the test environment, we need to make sure transaction_category_id is coming directly from the transactions table
      if (sql.includes('transactions t') && sql.includes('LEFT JOIN') && sql.includes('WHERE t.id = ?')) {
        const idParam = params[0];
        // Get the transaction directly including its transaction_category_id field
        const result = await db.get<any>('SELECT * FROM transactions WHERE id = ?', [idParam]);
        if (result) {
          return result as T;
        }
      }
      
      return db.get(sql, params);
    },
    run: async (sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> => {
      const db = getTestDb();
      const result = await db.run(sql, params);
      return {
        lastID: result.lastID || 0,
        changes: result.changes || 0
      };
    }
  }));
};
