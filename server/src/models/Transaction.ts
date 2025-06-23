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
}

export class TransactionModel {
  /**
   * Get all transactions from the database
   */
  static async getAll(): Promise<Transaction[]> {
    return query<Transaction>('SELECT * FROM transactions ORDER BY transaction_date DESC');
  }

  /**
   * Get a transaction by its ID
   */
  static async getById(id: number): Promise<Transaction | undefined> {
    return get<Transaction>('SELECT * FROM transactions WHERE id = ?', [id]);
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
        local_currency_amount, local_currency
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        transaction.local_currency || null
      ]
    );

    return result.lastID;
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

        await this.create(transaction);
        added++;
      } catch (error) {
        console.error('Error adding transaction:', error);
      }
    }

    return { added, duplicates };
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
   */
  static async delete(id: number): Promise<boolean> {
    const result = await run('DELETE FROM transactions WHERE id = ?', [id]);
    return result.changes > 0;
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
      whereClauses.push('transaction_date >= ?');
      params.push(searchOptions.startDate);
    }

    if (searchOptions.endDate) {
      whereClauses.push('transaction_date <= ?');
      params.push(searchOptions.endDate);
    }

    if (searchOptions.transactionType) {
      whereClauses.push('transaction_type = ?');
      params.push(searchOptions.transactionType);
    }

    if (searchOptions.searchText) {
      whereClauses.push(
        '(description1 LIKE ? OR description2 LIKE ? OR description3 LIKE ?)'
      );
      const searchPattern = `%${searchOptions.searchText}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (typeof searchOptions.minAmount === 'number') {
      whereClauses.push(
        '((debit_amount IS NOT NULL AND CAST(REPLACE(debit_amount, ",", "") AS REAL) >= ?) OR (credit_amount IS NOT NULL AND CAST(REPLACE(credit_amount, ",", "") AS REAL) >= ?))'
      );
      params.push(searchOptions.minAmount, searchOptions.minAmount);
    }

    if (typeof searchOptions.maxAmount === 'number') {
      whereClauses.push(
        '((debit_amount IS NOT NULL AND CAST(REPLACE(debit_amount, ",", "") AS REAL) <= ?) OR (credit_amount IS NOT NULL AND CAST(REPLACE(credit_amount, ",", "") AS REAL) <= ?))'
      );
      params.push(searchOptions.maxAmount, searchOptions.maxAmount);
    }

    // Create the SQL query with or without WHERE clause
    let sql = 'SELECT * FROM transactions';
    if (whereClauses.length > 0) {
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }
    sql += ' ORDER BY transaction_date DESC';

    return query<Transaction>(sql, params);
  }
}
