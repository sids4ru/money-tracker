/**
 * Revolute Transaction Importer
 * 
 * This file implements a transaction importer for Revolute CSV exports.
 */

import { TransactionImporter, NormalizedTransaction } from './types';
import csvParser from 'csv-parser';
import { Readable } from 'stream';
import { standardizeDate } from '../utils/dateUtils';

/**
 * Revolute transaction importer implementation
 */
export class RevoluteImporter implements TransactionImporter {
  name = 'Revolute';
  code = 'revolute-importer';
  description = 'Imports transactions from Revolute CSV exports';
  supportedFileTypes = ['.csv'];
  
  /**
   * Parse Revolute CSV file to normalized transaction format
   * @param fileBuffer The CSV file buffer to parse
   * @param options Optional configuration options
   * @returns Promise resolving to array of normalized transactions
   */
  async parseFile(fileBuffer: Buffer, options?: any): Promise<NormalizedTransaction[]> {
    const transactions: NormalizedTransaction[] = [];
    
    return new Promise((resolve, reject) => {
      // Create a readable stream from the buffer
      const stream = Readable.from(fileBuffer);
      
      stream
        .pipe(csvParser({
          mapHeaders: ({ header }: { header: string }) => header.trim(),
          mapValues: ({ value }: { value: string }) => value ? value.trim() : value
        }))
        .on('data', (row: any) => {
          // Get column value with fallback options
          const getColumnValue = (columnNames: string[]): string | undefined => {
            for (const name of columnNames) {
              if (row[name] !== undefined) return row[name] || undefined;
            }
            return undefined;
          };
          
          // Map Revolute CSV columns to normalized transaction format
          const description = getColumnValue(['Description']) || '';
          const amount = getColumnValue(['Amount']) || '';
          const transactionType = getColumnValue(['Type']) || '';
          const completedDate = getColumnValue(['Completed Date']) || '';
          
          // Determine debit/credit based on amount value (negative for debit, positive for credit)
          let debitAmount: string | undefined;
          let creditAmount: string | undefined;
          
          const numAmount = parseFloat(amount);
          if (!isNaN(numAmount)) {
            if (numAmount < 0) {
              debitAmount = Math.abs(numAmount).toString();
            } else {
              creditAmount = amount;
            }
          }
          
          // Standardize the dates
          const standardizedCompletedDate = standardizeDate(completedDate);
          const standardizedStartedDate = standardizeDate(getColumnValue(['Started Date']) || '');
          
          const transaction: NormalizedTransaction = {
            accountNumber: getColumnValue(['Product']) || 'Revolute',
            transactionDate: standardizedCompletedDate,
            description1: description,
            description2: `${transactionType} - ${getColumnValue(['State']) || ''}`,
            description3: standardizedStartedDate,
            debitAmount,
            creditAmount,
            balance: getColumnValue(['Balance']) || '',
            currency: getColumnValue(['Currency']) || 'EUR',
            transactionType,
            localCurrencyAmount: amount,
            localCurrency: getColumnValue(['Currency'])
          };
          
          // Only add rows that have at least some valid data
          if (transaction.description1 || transaction.transactionDate) {
            transactions.push(transaction);
          } else {
            console.warn("RevoluteImporter: Skipping invalid transaction row:", row);
          }
        })
        .on('end', () => {
          console.log(`RevoluteImporter: Successfully parsed ${transactions.length} transactions`);
          resolve(transactions);
        })
        .on('error', (error: Error) => {
          console.error('RevoluteImporter: Error parsing CSV file:', error);
          reject(error);
        });
    });
  }
  
  /**
   * Check if file is a Revolute CSV format
   * @param fileHeader First few lines of the file as string
   * @param fileName Name of the file
   * @returns Boolean indicating if this importer can handle the file
   */
  async canHandleFile(fileHeader: string, fileName: string): Promise<boolean> {
    // Check for Revolute-specific column headers or file naming patterns
    const isRevoluteHeader = fileHeader.includes('Type') && 
                            fileHeader.includes('Product') &&
                            fileHeader.includes('Started Date') &&
                            fileHeader.includes('Completed Date');
                            
    const isRevoluteFileName = fileName.toLowerCase().includes('revolute') || 
                             fileName.toUpperCase() === 'REVOLUTE.CSV';
    
    return isRevoluteHeader || isRevoluteFileName;
  }
}
