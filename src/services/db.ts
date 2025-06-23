import Dexie, { Table } from 'dexie';
import { Transaction } from '../types/Transaction';

export class FinanceDatabase extends Dexie {
  transactions!: Table<Transaction>;

  constructor() {
    super('FinanceDatabase');
    this.version(1).stores({
      transactions: '++id, accountNumber, date, description1, debitAmount, creditAmount, balance, currency, transactionType'
    });
  }

  async addTransaction(transaction: Omit<Transaction, 'id'>): Promise<number> {
    try {
      // Check if transaction already exists using multiple fields
      const existingTransaction = await this.transactions
        .where('accountNumber').equals(transaction.accountNumber)
        .and(item => 
          item.date === transaction.date && 
          item.description1 === transaction.description1 && 
          item.debitAmount === transaction.debitAmount &&
          item.creditAmount === transaction.creditAmount
        )
        .first();

      if (existingTransaction) {
        console.log('Duplicate transaction found:', existingTransaction);
        return existingTransaction.id!;
      }

      // If not a duplicate, add the transaction
      return await this.transactions.add(transaction as Transaction);
    } catch (error) {
      console.error('Error adding transaction:', error);
      throw error;
    }
  }

  async addTransactions(transactions: Omit<Transaction, 'id'>[]): Promise<number[]> {
    const addedIds: number[] = [];
    
    // Use transaction for better performance with bulk operations
    await this.transaction('rw', this.transactions, async () => {
      for (const transaction of transactions) {
        const id = await this.addTransaction(transaction);
        addedIds.push(id);
      }
    });
    
    return addedIds;
  }

  async getAllTransactions(): Promise<Transaction[]> {
    return await this.transactions.toArray();
  }
}

export const db = new FinanceDatabase();
