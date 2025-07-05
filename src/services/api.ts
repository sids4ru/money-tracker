import axios from 'axios';
import { Transaction } from '../types/Transaction';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001/api', // Use environment variable with fallback
  headers: {
    'Content-Type': 'application/json'
  }
});

// Log API configuration for debugging
console.log('API is configured with baseURL:', process.env.REACT_APP_API_URL || 'http://localhost:5001/api');

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
        categoryId: item.category_id,
        transactionCategoryId: item.transaction_category_id // Add field from ER diagram
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
        categoryId: item.category_id,
        transactionCategoryId: item.transaction_category_id // Add field from ER diagram
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
   * Auto-categorize all uncategorized transactions
   * @returns Object with count of categorized transactions
   */
  async autoCategorizeTransactions(): Promise<{ categorized: number }> {
    try {
      const response = await api.post('/transactions/auto-categorize');
      return {
        categorized: response.data.categorized
      };
    } catch (error) {
      console.error('Error auto-categorizing transactions:', error);
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
        categoryId: item.category_id,
        transactionCategoryId: item.transaction_category_id // Add field from ER diagram
      }));
      
      return transactions;
    } catch (error) {
      console.error('Error searching transactions:', error);
      throw error;
    }
  },

    /**
   * Get all available transaction importers
   * @returns Array of available importers with their details
   */
  async getAvailableImporters(): Promise<{ 
    name: string; 
    code: string; 
    description: string; 
    supportedFileTypes: string[];
  }[]> {
    try {
      const response = await api.get('/transactions/importers');
      return response.data.data;
    } catch (error) {
      console.error('Error fetching importers:', error);
      throw error;
    }
  },

  /**
   * Import transactions from a file using a specific importer
   * @param file The file to import
   * @param importerCode The code of the importer to use
   * @param autoApplyCategories Whether to auto-apply categories to imported transactions
   */
  async importFromFile(
    file: File, 
    importerCode: string, 
    autoApplyCategories: boolean = true
  ): Promise<{ added: number; duplicates: number }> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('importerCode', importerCode);
      formData.append('autoApplyCategories', autoApplyCategories.toString());
      
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
      console.error('Error importing file:', error);
      throw error;
    }
  },

  /**
   * Import transactions from a CSV file
   * @param file The CSV file to import
   * @param autoApplyCategories Whether to auto-apply categories to imported transactions
   */
  async importFromCSV(file: File, autoApplyCategories: boolean = true): Promise<{ added: number; duplicates: number }> {
    // Use the AIB importer by default for backward compatibility
    return this.importFromFile(file, 'aib-importer', autoApplyCategories);
  }
};

export default api;
