import axios from 'axios';
import { Transaction } from '../types/Transaction';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: 'http://localhost:5002/api', // Updated to match the new server port
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interface for transaction search params
interface SearchParams {
  startDate?: string;
  endDate?: string;
  searchText?: string;
  transactionType?: string;
  minAmount?: number;
  maxAmount?: number;
}

// API service for transactions
export const TransactionService = {
  /**
   * Get all transactions
   */
  async getAllTransactions(): Promise<Transaction[]> {
    try {
      const response = await api.get('/transactions');
      
      // Map snake_case backend fields to camelCase frontend fields
      const transactions = response.data.data.map((item: any) => ({
        id: item.id,
        accountNumber: item.account_number || '',
        date: item.transaction_date || '',
        description1: item.description1 || '',
        description2: item.description2 || '',
        description3: item.description3 || '',
        debitAmount: item.debit_amount,
        creditAmount: item.credit_amount,
        balance: item.balance || '',
        currency: item.currency || '',
        transactionType: item.transaction_type || '',
        localCurrencyAmount: item.local_currency_amount || '',
        localCurrency: item.local_currency || '',
        description: item.description1, // Add computed field
        groupingStatus: item.grouping_status || 'none', // Map grouping status
        categoryId: item.category_id
      }));
      
      return transactions;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  },

  /**
   * Get a single transaction by ID
   */
  async getTransaction(id: number): Promise<Transaction> {
    try {
      const response = await api.get(`/transactions/${id}`);
      const item = response.data.data;
      
      // Map snake_case backend fields to camelCase frontend fields
      const transaction = {
        id: item.id,
        accountNumber: item.account_number || '',
        date: item.transaction_date || '',
        description1: item.description1 || '',
        description2: item.description2 || '',
        description3: item.description3 || '',
        debitAmount: item.debit_amount,
        creditAmount: item.credit_amount,
        balance: item.balance || '',
        currency: item.currency || '',
        transactionType: item.transaction_type || '',
        localCurrencyAmount: item.local_currency_amount || '',
        localCurrency: item.local_currency || '',
        description: item.description1, // Add computed field
        groupingStatus: item.grouping_status || 'none', // Map grouping status
        categoryId: item.category_id
      };
      
      return transaction;
    } catch (error) {
      console.error(`Error fetching transaction #${id}:`, error);
      throw error;
    }
  },

  /**
   * Create a new transaction
   */
  async createTransaction(transaction: Omit<Transaction, 'id'>): Promise<Transaction> {
    try {
      const response = await api.post('/transactions', transaction);
      return response.data.data;
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  },

  /**
   * Update an existing transaction
   */
  async updateTransaction(id: number, transaction: Partial<Transaction>): Promise<Transaction> {
    try {
      const response = await api.put(`/transactions/${id}`, transaction);
      return response.data.data;
    } catch (error) {
      console.error(`Error updating transaction #${id}:`, error);
      throw error;
    }
  },

  /**
   * Delete a transaction
   */
  async deleteTransaction(id: number): Promise<void> {
    try {
      await api.delete(`/transactions/${id}`);
    } catch (error) {
      console.error(`Error deleting transaction #${id}:`, error);
      throw error;
    }
  },

  /**
   * Search for transactions with given parameters
   */
  async searchTransactions(params: SearchParams): Promise<Transaction[]> {
    try {
      // Convert parameters to URL query string
      const queryParams = new URLSearchParams();
      
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });

      const response = await api.get(`/transactions/search?${queryParams.toString()}`);
      
      // Map snake_case backend fields to camelCase frontend fields
      const transactions = response.data.data.map((item: any) => ({
        id: item.id,
        accountNumber: item.account_number || '',
        date: item.transaction_date || '',
        description1: item.description1 || '',
        description2: item.description2 || '',
        description3: item.description3 || '',
        debitAmount: item.debit_amount,
        creditAmount: item.credit_amount,
        balance: item.balance || '',
        currency: item.currency || '',
        transactionType: item.transaction_type || '',
        localCurrencyAmount: item.local_currency_amount || '',
        localCurrency: item.local_currency || '',
        description: item.description1, // Add computed field
        groupingStatus: item.grouping_status || 'none', // Map grouping status
        categoryId: item.category_id
      }));
      
      return transactions;
    } catch (error) {
      console.error('Error searching transactions:', error);
      throw error;
    }
  },

  /**
   * Import transactions from a CSV file
   */
  async importFromCSV(file: File): Promise<{ added: number; duplicates: number }> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Use multipart/form-data for file upload
      const response = await api.post('/transactions/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return {
        added: response.data.added,
        duplicates: response.data.duplicates
      };
    } catch (error) {
      console.error('Error importing CSV:', error);
      throw error;
    }
  }
};

export default api;
