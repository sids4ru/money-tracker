import Papa from 'papaparse';
import { Transaction } from '../types/Transaction';

// Interface to represent the raw CSV structure from AIB
interface AIBCsvRow {
  'Posted Account': string;
  'Posted Transactions Date': string;
  'Description1': string;
  'Description2': string;
  'Description3': string;
  'Debit Amount': string;
  'Credit Amount': string;
  'Balance': string;
  'Posted Currency': string;
  'Transaction Type': string;
  'Local Currency Amount': string;
  'Local Currency': string;
}

/**
 * Parse AIB CSV file and return array of transactions
 * @param csvContent The raw CSV content as string
 * @returns Array of Transaction objects
 */
export const parseAIBCsv = (csvContent: string): Transaction[] => {
  const parseResult = Papa.parse<AIBCsvRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => {
      // Just trim the header, we'll use the original header names
      return header.trim();
    },
  });

  if (parseResult.errors.length > 0) {
    console.error('CSV parsing errors:', parseResult.errors);
    throw new Error('Failed to parse CSV file correctly');
  }

  return parseResult.data.map((row) => {
    // Create a composite description field for easier display
    const description = [row.Description1, row.Description2, row.Description3]
      .filter(desc => desc.trim().length > 0)
      .join(' - ');

    return {
      accountNumber: row['Posted Account'],
      date: row['Posted Transactions Date'],
      description1: row.Description1,
      description2: row.Description2,
      description3: row.Description3,
      debitAmount: row['Debit Amount'] || null,
      creditAmount: row['Credit Amount'] || null,
      balance: row.Balance,
      currency: row['Posted Currency'],
      transactionType: row['Transaction Type'],
      localCurrencyAmount: row['Local Currency Amount'],
      localCurrency: row['Local Currency'],
      description: description,
    };
  });
};

/**
 * Read a CSV file and parse it
 * @param file The File object to read
 * @returns Promise resolving to array of transactions
 */
export const readAndParseCSV = (file: File): Promise<Transaction[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const csvContent = event.target?.result as string;
        const transactions = parseAIBCsv(csvContent);
        resolve(transactions);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read the CSV file'));
    };
    
    reader.readAsText(file);
  });
};
