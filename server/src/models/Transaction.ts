import { query, get, run } from '../database/db';

export interface Transaction {
  id?: number;
  account_number: string;
  transaction_date: string;
  description1: string;
  description2?: string;
  description3?: string;
  debit_amount?: string;
  credit_amount?: string;
  balance: string;
  currency: string;
  transaction_type: string;
  local_currency_amount?: string;
  local_currency?: string;
  created_at?: string;
  grouping_status?: 'manual' | 'auto' | 'none';
  category_id?: number;
  transaction_category_id?: number; // Reference to the transaction_categories table
}

export class TransactionModel {
  /**
   * Get all transactions from the database
   */
  static async getAll(): Promise<Transaction[]> {
    return query<Transaction>(
      `SELECT t.*, tc.id as transaction_category_id, tc.category_id 
       FROM transactions t
       LEFT JOIN transaction_categories tc ON t.id = tc.transaction_id
       ORDER BY t.transaction_date DESC`
    );
  }

  /**
   * Get a transaction by ID
   */
  static async getById(id: number): Promise<Transaction | undefined> {
    return get<Transaction>(
      `SELECT t.*, tc.id as transaction_category_id, tc.category_id 
       FROM transactions t
       LEFT JOIN transaction_categories tc ON t.id = tc.transaction_id
       WHERE t.id = ?`, 
      [id]
    );
  }

  /**
   * Find transactions by account number
   */
  static async findByAccount(accountNumber: string): Promise<Transaction[]> {
    return query<Transaction>(
      'SELECT * FROM transactions WHERE account_number = ? ORDER BY transaction_date DESC', 
      [accountNumber]
    );
  }

  /**
   * Check if a transaction already exists to avoid duplicates
   */
  static async checkDuplicate(transaction: Omit<Transaction, 'id' | 'created_at'>): Promise<Transaction | undefined> {
    return get<Transaction>(
      `SELECT * FROM transactions 
       WHERE account_number = ? 
       AND transaction_date = ? 
       AND description1 = ? 
       AND (
         (debit_amount = ? OR (debit_amount IS NULL AND ? IS NULL)) 
         AND 
         (credit_amount = ? OR (credit_amount IS NULL AND ? IS NULL))
       )`,
      [
        transaction.account_number,
        transaction.transaction_date,
        transaction.description1,
        transaction.debit_amount, transaction.debit_amount,
        transaction.credit_amount, transaction.credit_amount
      ]
    );
  }

  /**
   * Create a new transaction
   */
  static async create(transaction: Omit<Transaction, 'id' | 'created_at'>): Promise<number> {
    // Check if the transaction already exists
    const existingTransaction = await this.checkDuplicate(transaction);
    
    if (existingTransaction) {
      console.log(`Transaction already exists with ID: ${existingTransaction.id}`);
      return existingTransaction.id!;
    }

    // If not a duplicate, add the transaction
    const result = await run(
      `INSERT INTO transactions (
        account_number, transaction_date, description1, description2, description3,
        debit_amount, credit_amount, balance, currency, transaction_type,
        local_currency_amount, local_currency, transaction_category_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transaction.account_number,
        transaction.transaction_date,
        transaction.description1,
        transaction.description2 || null,
        transaction.description3 || null,
        transaction.debit_amount || null,
        transaction.credit_amount || null,
        transaction.balance,
        transaction.currency,
        transaction.transaction_type,
        transaction.local_currency_amount || null,
        transaction.local_currency || null,
        transaction.transaction_category_id || null
      ]
    );

    const newTransactionId = result.lastID;
    
    // Try to assign a category based on pattern matching if not already categorized
    try {
      const transactionDescription = transaction.description1 || '';
      if (transactionDescription && !transaction.category_id && !transaction.transaction_category_id) {
        console.log(`Attempting to auto-categorize new transaction: "${transactionDescription}"`);
        await this.attemptAutoCategorization(newTransactionId, transactionDescription);
      }
    } catch (error) {
      console.error(`Error during auto-categorization for transaction ${newTransactionId}:`, error);
      // Don't throw - just log the error and continue
    }

    return newTransactionId;
  }

  /**
   * Create multiple transactions in a batch
   */
  static async createBatch(transactions: Omit<Transaction, 'id' | 'created_at'>[]): Promise<{ added: number; duplicates: number }> {
    let added = 0;
    let duplicates = 0;

    for (const transaction of transactions) {
      try {
        const existingTransaction = await this.checkDuplicate(transaction);
        
        if (existingTransaction) {
          duplicates++;
          continue;
        }

        const newId = await this.create(transaction);
        if (newId) {
          added++;
          console.log(`Successfully added transaction ${newId}: ${transaction.description1}`);
        }
      } catch (error) {
        console.error('Error adding transaction:', error);
      }
    }

    return { added, duplicates };
  }
  
  /**
   * Attempt to automatically categorize a transaction based on its description
   * by checking against transaction similarity patterns
   */
  static async attemptAutoCategorization(transactionId: number, description: string): Promise<boolean> {
    try {
      // Import TransactionSimilarityPatternModel here to avoid circular dependency
      const { TransactionSimilarityPatternModel } = require('./TransactionSimilarityPattern');
      const { TransactionCategoryModel } = require('./Category');
      
      // Find matching patterns
      const matchingPatterns = await TransactionSimilarityPatternModel.findMatchingPatterns(description);
      console.log(`Found ${matchingPatterns.length} matching patterns for "${description}"`);
      
      if (matchingPatterns.length > 0) {
        // Sort by confidence score (highest first)
        matchingPatterns.sort((a: any, b: any) => (b.confidence_score || 1) - (a.confidence_score || 1));
        const bestMatch = matchingPatterns[0];
        
        // Either use category_id directly or get a category from the parent_category_id
        let categoryId = bestMatch.category_id;
        
        if (!categoryId && bestMatch.parent_category_id) {
          // Get a default/first category from the parent category
          const { CategoryModel } = require('./Category');
          const categories = await CategoryModel.getCategoriesByParentId(bestMatch.parent_category_id);
          if (categories.length > 0) {
            categoryId = categories[0].id;
            console.log(`Using category ${categoryId} from parent category ${bestMatch.parent_category_id}`);
          }
        }
        
        if (categoryId) {
          console.log(`Auto-assigning category ${categoryId} to transaction ${transactionId}`);
          
          // Create entry in transaction_categories
          const assignmentId = await TransactionCategoryModel.assignCategory(transactionId, categoryId);
          
          // Update the transaction record with the category assignment info
          await this.update(transactionId, {
            transaction_category_id: assignmentId,
            grouping_status: 'auto'
          });
          
          // Increment the pattern usage count
          await TransactionSimilarityPatternModel.incrementUsageCount(bestMatch.id!);
          
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error(`Error in attemptAutoCategorization for transaction ${transactionId}:`, error);
      return false;
    }
  }

  /**
   * Update an existing transaction
   */
  static async update(id: number, transaction: Partial<Transaction>): Promise<boolean> {
    // Build the update query dynamically based on which fields are provided
    const fields: string[] = [];
    const values: any[] = [];

    // Add each field that exists in the transaction object
    Object.entries(transaction).forEach(([key, value]) => {
      // Skip id and created_at fields
      // Note: Allow transaction_category_id to be set directly for compatibility with the updated ER diagram
      if (key !== 'id' && key !== 'created_at') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    // If no fields to update, return false
    if (fields.length === 0) {
      return false;
    }

    // Add the id for the WHERE clause
    values.push(id);

    const result = await run(
      `UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return result.changes > 0;
  }

  /**
   * Delete a transaction by ID
   * Also removes related records from transaction_categories table
   */
  static async delete(id: number): Promise<boolean> {
    try {
      // Start a transaction to ensure atomicity
      await run('BEGIN TRANSACTION');
      
      // First delete related records from transaction_categories
      await run('DELETE FROM transaction_categories WHERE transaction_id = ?', [id]);
      
      // Then delete the transaction itself
      const result = await run('DELETE FROM transactions WHERE id = ?', [id]);
      
      // Commit the transaction
      await run('COMMIT');
      
      return result.changes > 0;
    } catch (error) {
      // Rollback in case of error
      await run('ROLLBACK');
      console.error(`Error deleting transaction ${id}:`, error);
      throw error;
    }
  }

  /**
   * Search transactions by various criteria
   */
  static async search(searchOptions: {
    startDate?: string;
    endDate?: string;
    searchText?: string;
    transactionType?: string;
    minAmount?: number;
    maxAmount?: number;
  }): Promise<Transaction[]> {
    // Build the WHERE clause dynamically based on search options
    const whereClauses: string[] = [];
    const params: any[] = [];

    if (searchOptions.startDate) {
      whereClauses.push('t.transaction_date >= ?');
      params.push(searchOptions.startDate);
    }

    if (searchOptions.endDate) {
      whereClauses.push('t.transaction_date <= ?');
      params.push(searchOptions.endDate);
    }

    if (searchOptions.transactionType) {
      whereClauses.push('t.transaction_type = ?');
      params.push(searchOptions.transactionType);
    }

    if (searchOptions.searchText) {
      whereClauses.push(
        '(t.description1 LIKE ? OR t.description2 LIKE ? OR t.description3 LIKE ?)'
      );
      const searchPattern = `%${searchOptions.searchText}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (typeof searchOptions.minAmount === 'number') {
      whereClauses.push(
        '((t.debit_amount IS NOT NULL AND CAST(REPLACE(t.debit_amount, ",", "") AS REAL) >= ?) OR (t.credit_amount IS NOT NULL AND CAST(REPLACE(t.credit_amount, ",", "") AS REAL) >= ?))'
      );
      params.push(searchOptions.minAmount, searchOptions.minAmount);
    }

    if (typeof searchOptions.maxAmount === 'number') {
      whereClauses.push(
        '((t.debit_amount IS NOT NULL AND CAST(REPLACE(t.debit_amount, ",", "") AS REAL) <= ?) OR (t.credit_amount IS NOT NULL AND CAST(REPLACE(t.credit_amount, ",", "") AS REAL) <= ?))'
      );
      params.push(searchOptions.maxAmount, searchOptions.maxAmount);
    }

    // Create the SQL query with or without WHERE clause
    let sql = `
      SELECT t.*, tc.id as transaction_category_id, tc.category_id 
      FROM transactions t
      LEFT JOIN transaction_categories tc ON t.id = tc.transaction_id`;
      
    if (whereClauses.length > 0) {
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }
    sql += ' ORDER BY t.transaction_date DESC';

    return query<Transaction>(sql, params);
  }
}
