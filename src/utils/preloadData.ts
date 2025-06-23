import { TransactionService } from '../services/api';

// Utility function to preload sample data for testing
export const preloadSampleData = async (): Promise<void> => {
  try {
    // First check if there are already transactions in the database
    const existingTransactions = await TransactionService.getAllTransactions();
    
    if (existingTransactions.length > 0) {
      console.log(`Database already contains ${existingTransactions.length} transactions. Skipping preload.`);
      return;
    }
    
    console.log('No transactions found. Loading sample data...');
    
    // Get the sample CSV file from public directory
    const response = await fetch('/sample-data/Transaction_Export_01.05.2025_15.13.csv');
    const blob = await response.blob();
    
    // Create a file object from the blob
    const file = new File([blob], 'sample-transactions.csv', { type: 'text/csv' });
    
    // Import the sample data
    const result = await TransactionService.importFromCSV(file);
    
    console.log(`Preloaded ${result.added} transactions successfully.`);
    
  } catch (error) {
    console.error('Error preloading sample data:', error);
  }
};

export default preloadSampleData;
