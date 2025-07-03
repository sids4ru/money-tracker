import { Request, Response } from 'express';
import { TransactionModel, Transaction } from '../models/Transaction';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { Multer } from 'multer';
import { query, get, run } from '../database/db'; // Import database functions

// Extend the Express Request type to include the file from multer and other form fields
interface MulterRequest extends Request {
  file?: Express.Multer.File;
  body: {
    autoApplyCategories?: string;
    [key: string]: any;
  }
}

/**
 * Get all transactions
 */
export const getAllTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const transactions = await TransactionModel.getAll();
    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching transactions'
    });
  }
};

/**
 * Get transaction by ID
 */
export const getTransactionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid transaction ID'
      });
      return;
    }

    const transaction = await TransactionModel.getById(id);
    if (!transaction) {
      res.status(404).json({
        success: false,
        error: `Transaction with ID ${id} not found`
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error(`Error fetching transaction with ID ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching transaction'
    });
  }
};

/**
 * Create a new transaction
 */
export const createTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const transactionData = req.body as Omit<Transaction, 'id' | 'created_at'>;
    
    // Validate required fields
    const requiredFields = [
      'account_number', 'transaction_date', 'description1',
      'balance', 'currency', 'transaction_type'
    ];
    
    for (const field of requiredFields) {
      if (!transactionData[field as keyof typeof transactionData]) {
        res.status(400).json({
          success: false,
          error: `Missing required field: ${field}`
        });
        return;
      }
    }

    const id = await TransactionModel.create(transactionData);
    
    res.status(201).json({
      success: true,
      data: { id, ...transactionData }
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while creating transaction'
    });
  }
};

/**
 * Update an existing transaction
 */
export const updateTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid transaction ID'
      });
      return;
    }

    const transactionData = req.body as Partial<Transaction>;
    
    // Check if transaction exists
    const existingTransaction = await TransactionModel.getById(id);
    if (!existingTransaction) {
      res.status(404).json({
        success: false,
        error: `Transaction with ID ${id} not found`
      });
      return;
    }

    // Update transaction
    const success = await TransactionModel.update(id, transactionData);
    if (success) {
      const updatedTransaction = await TransactionModel.getById(id);
      res.status(200).json({
        success: true,
        data: updatedTransaction
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'No fields to update or update failed'
      });
    }
  } catch (error) {
    console.error(`Error updating transaction with ID ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Server error while updating transaction'
    });
  }
};

/**
 * Delete a transaction
 */
export const deleteTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid transaction ID'
      });
      return;
    }

    // Check if transaction exists
    const existingTransaction = await TransactionModel.getById(id);
    if (!existingTransaction) {
      res.status(404).json({
        success: false,
        error: `Transaction with ID ${id} not found`
      });
      return;
    }

    // Delete transaction
    const success = await TransactionModel.delete(id);
    if (success) {
      res.status(200).json({
        success: true,
        message: `Transaction with ID ${id} deleted successfully`
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to delete transaction'
      });
    }
  } catch (error) {
    console.error(`Error deleting transaction with ID ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Server error while deleting transaction'
    });
  }
};

/**
 * Search transactions
 */
export const searchTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      startDate,
      endDate,
      searchText,
      transactionType,
      minAmount,
      maxAmount
    } = req.query;

    const searchOptions = {
      startDate: typeof startDate === 'string' ? startDate : undefined,
      endDate: typeof endDate === 'string' ? endDate : undefined,
      searchText: typeof searchText === 'string' ? searchText : undefined,
      transactionType: typeof transactionType === 'string' ? transactionType : undefined,
      minAmount: typeof minAmount === 'string' ? parseFloat(minAmount) : undefined,
      maxAmount: typeof maxAmount === 'string' ? parseFloat(maxAmount) : undefined
    };

    const transactions = await TransactionModel.search(searchOptions);

    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions
    });
  } catch (error) {
    console.error('Error searching transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while searching transactions'
    });
  }
};

/**
 * Parse and import multiple transactions from a CSV file
 */
/**
 * Auto-categorize uncategorized transactions
 */
export const autoCategorizeTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    // We'll use direct SQL queries for better reliability
    
    // Start a transaction
    await run('BEGIN TRANSACTION');
    
    // 1. Find all transactions without categories
    console.log('Starting auto-categorization process...');
    console.log('Step 1: Finding uncategorized transactions');
    
    // Find uncategorized transactions
    const uncategorizedTransactions = await query(`
      SELECT t.id, t.description1
      FROM transactions t
      LEFT JOIN transaction_categories tc ON t.id = tc.transaction_id
      WHERE tc.id IS NULL
      ORDER BY t.transaction_date DESC
    `);
    
    console.log(`Found ${uncategorizedTransactions.length} uncategorized transactions`);
    
    if (uncategorizedTransactions.length === 0) {
      await run('COMMIT');
      res.status(200).json({
        success: true,
        message: 'No uncategorized transactions found',
        categorized: 0
      });
      return;
    }
    
    // 2. Get all patterns from the database
    console.log('Step 2: Fetching similarity patterns');
    const patterns = await query(`
      SELECT * FROM transaction_similarity_patterns
      WHERE category_id IS NOT NULL
    `);
    
    console.log(`Found ${patterns.length} patterns with category IDs`);
    
    if (patterns.length === 0) {
      await run('ROLLBACK');
      res.status(400).json({
        success: false,
        error: 'No patterns with category IDs found. Please define patterns first.',
        categorized: 0
      });
      return;
    }
    
    // 3. Process each transaction
    console.log('Step 3: Processing transactions');
    let categorizedCount = 0;
    
    for (let i = 0; i < uncategorizedTransactions.length; i++) {
      const transaction = uncategorizedTransactions[i];
      const transactionId = transaction.id;
      const description = transaction.description1;
      
      if (!description) continue;
      
      console.log(`[${i+1}/${uncategorizedTransactions.length}] Processing transaction ${transactionId}: "${description}"`);
      
      // Find best matching pattern
      let bestMatch = null;
      let bestConfidence = 0;
      
      for (const pattern of patterns) {
        let isMatch = false;
        
        try {
          switch (pattern.pattern_type) {
            case 'exact':
              isMatch = description.toLowerCase() === pattern.pattern_value.toLowerCase();
              break;
            case 'contains':
              isMatch = description.toLowerCase().includes(pattern.pattern_value.toLowerCase());
              break;
            case 'starts_with':
              isMatch = description.toLowerCase().startsWith(pattern.pattern_value.toLowerCase());
              break;
            case 'regex':
              try {
                const regex = new RegExp(pattern.pattern_value, 'i');
                isMatch = regex.test(description);
              } catch (e) {
                console.error('Invalid regex pattern:', pattern.pattern_value);
              }
              break;
            case 'merchant': // Add support for merchant pattern type
              isMatch = description.toLowerCase().includes(pattern.pattern_value.toLowerCase());
              break;
            case 'description': // Add support for description pattern type
              isMatch = description.toLowerCase().includes(pattern.pattern_value.toLowerCase());
              break;
            default:
              // For any other pattern type, default to contains match
              isMatch = description.toLowerCase().includes(pattern.pattern_value.toLowerCase());
              break;
          }
          
          if (isMatch && (pattern.confidence_score || 1) > bestConfidence) {
            bestMatch = pattern;
            bestConfidence = pattern.confidence_score || 1;
            console.log(`  Matched pattern: "${pattern.pattern_value}" (${pattern.pattern_type}) with confidence ${bestConfidence}`);
          }
        } catch (error) {
          const patternError = error as Error;
          console.error(`  Error matching pattern ${pattern.id}:`, patternError.message);
        }
      }
      
      // Apply the best match if one was found
      if (bestMatch && bestMatch.category_id) {
        try {
          console.log(`  Assigning category ${bestMatch.category_id} to transaction ${transactionId}`);
          
          // Insert into transaction_categories
          await run(
            'INSERT INTO transaction_categories (transaction_id, category_id) VALUES (?, ?)',
            [transactionId, bestMatch.category_id]
          );
          
          // Update transaction status
          await run(
            'UPDATE transactions SET grouping_status = ? WHERE id = ?',
            ['auto', transactionId]
          );
          
          // Update pattern usage
          await run(
            'UPDATE transaction_similarity_patterns SET usage_count = usage_count + 1 WHERE id = ?',
            [bestMatch.id]
          );
          
          categorizedCount++;
        } catch (error) {
          const insertError = error as Error;
          console.error(`  Error inserting category for transaction ${transactionId}:`, insertError.message);
          // Continue with next transaction
        }
      } else {
        console.log(`  No matching pattern found for transaction ${transactionId}`);
      }
    }
    
    // Commit all changes
    await run('COMMIT');
    console.log(`Successfully categorized ${categorizedCount} transactions`);
    
    res.status(200).json({
      success: true,
      message: `Successfully categorized ${categorizedCount} out of ${uncategorizedTransactions.length} transactions`,
      categorized: categorizedCount,
      total: uncategorizedTransactions.length
    });
  } catch (error) {
    console.error('Error auto-categorizing transactions:', error);
    
    // Attempt to rollback in case a transaction is active
    try {
      await run('ROLLBACK');
      console.log('Transaction rolled back due to error');
    } catch (rollbackError) {
      console.error('Error rolling back transaction:', rollbackError);
    }
    
    res.status(500).json({
      success: false,
      error: 'Server error while auto-categorizing transactions'
    });
  }
};

export const importTransactionsFromCSV = async (req: MulterRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'No CSV file uploaded'
      });
      return;
    }

    // Get the autoApplyCategories flag from request body (default to true if not provided)
    console.log("Request body:", req.body); // Debug the whole request body
    const autoApplyCategories = req.body.autoApplyCategories !== 'false';
    console.log(`Import with auto-apply categories: ${autoApplyCategories} (Type: ${typeof req.body.autoApplyCategories})`);

    const transactions: Omit<Transaction, 'id' | 'created_at'>[] = [];
    
    fs.createReadStream(req.file.path)
      .pipe(csv({
        mapHeaders: ({ header }) => header.trim(),
        mapValues: ({ value }) => value ? value.trim() : value
      }))
      .on('data', (row: any) => {
        console.log("CSV Row:", row); // Debug log to see the actual CSV data
        
        // Try different column naming patterns (with or without spaces)
        // First try precise column names, then fallback to trimmed/normalized versions
        const getColumnValue = (columnNames: string[]): string | undefined => {
          for (const name of columnNames) {
            if (row[name] !== undefined) return row[name] || undefined;
          }
          return undefined;
        };

        // Map CSV columns to transaction fields with various possible column names
        const transaction: Omit<Transaction, 'id' | 'created_at'> = {
          account_number: getColumnValue(['Posted Account', 'PostedAccount', 'Account']) || '',
          transaction_date: getColumnValue(['Posted Transactions Date', 'PostedTransactionsDate', 'Date']) || '',
          description1: getColumnValue(['Description1', 'Description 1', 'Desc1']) || '',
          description2: getColumnValue(['Description2', 'Description 2', 'Desc2']) || '',
          description3: getColumnValue(['Description3', 'Description 3', 'Desc3']) || '',
          debit_amount: getColumnValue(['Debit Amount', 'DebitAmount']),
          credit_amount: getColumnValue(['Credit Amount', 'CreditAmount']),
          balance: getColumnValue(['Balance']) || '',
          currency: getColumnValue(['Posted Currency', 'PostedCurrency', 'Currency']) || '',
          transaction_type: getColumnValue(['Transaction Type', 'TransactionType', 'Type']) || '',
          local_currency_amount: getColumnValue(['Local Currency Amount', 'LocalCurrencyAmount']),
          local_currency: getColumnValue(['Local Currency', 'LocalCurrency'])
        };
        
        // Extra debug information
        console.log("Processed transaction:", transaction);
        
        // Only add rows that have at least some valid data
        if (transaction.account_number || transaction.description1 || transaction.transaction_date) {
          // Skip test/dummy transactions
          if (transaction.description1 && 
              (transaction.description1.toUpperCase().includes('DUMMY') || 
               transaction.description1.toUpperCase().includes('TEST TRANSACTION'))) {
            console.warn("Skipping dummy/test transaction:", transaction.description1);
          } else {
            console.log("Adding transaction:", transaction);
            transactions.push(transaction);
          }
        } else {
          console.warn("Skipping invalid transaction row:", row);
        }
      })
      .on('end', async () => {
        // Delete the temporary file
        fs.unlinkSync(req.file!.path);
        
        if (transactions.length === 0) {
          res.status(400).json({
            success: false,
            error: 'No transactions found in the CSV file'
          });
          return;
        }
        
        // Insert transactions into the database with the auto-categorization flag
        console.log(`Starting batch import with autoApplyCategories=${autoApplyCategories}`);
        const result = await TransactionModel.createBatch(transactions, autoApplyCategories);
        
        res.status(201).json({
          success: true,
          message: `Successfully imported ${result.added} transactions. ${result.duplicates} duplicates were skipped.`,
          added: result.added,
          duplicates: result.duplicates
        });
      })
      .on('error', (error: Error) => {
        // Delete the temporary file on error
        if (req.file?.path && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        
        console.error('Error parsing CSV file:', error);
        res.status(500).json({
          success: false,
          error: 'Error parsing CSV file'
        });
      });
  } catch (error) {
    // Delete the temporary file if it exists
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    console.error('Error importing transactions from CSV:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while importing transactions'
    });
  }
};
