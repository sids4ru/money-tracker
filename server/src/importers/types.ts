/**
 * Transaction Importer Plugin Architecture
 * 
 * This file defines the interfaces for the transaction importer plugin system.
 */

/**
 * Interface for transaction importers
 * All importers must implement this interface
 */
export interface TransactionImporter {
  name: string;                         // Display name of importer (e.g., "AIB Bank")
  code: string;                         // Unique identifier (e.g., "aib-importer")
  description?: string;                 // Optional description
  supportedFileTypes: string[];         // E.g., ['.csv']
  
  /**
   * Parse file to normalized transaction format
   * @param fileBuffer The file buffer to parse
   * @param options Optional configuration parameters
   * @returns Promise resolving to array of normalized transactions
   */
  parseFile(fileBuffer: Buffer, options?: any): Promise<NormalizedTransaction[]>;
  
  /**
   * Optional: validate if this importer can handle a specific file
   * @param fileHeader First few lines of the file as string
   * @param fileName Name of the file
   * @returns Promise resolving to boolean indicating if the importer can handle this file
   */
  canHandleFile?(fileHeader: string, fileName: string): Promise<boolean>;
}

/**
 * Normalized transaction format
 * This is the common format all importers convert to
 */
export interface NormalizedTransaction {
  accountNumber: string;
  transactionDate: string;
  description1: string;
  description2?: string;
  description3?: string;
  debitAmount?: string;
  creditAmount?: string;
  balance: string;
  currency: string;
  transactionType: string;
  localCurrencyAmount?: string;
  localCurrency?: string;
}
