/**
 * AIB Bank Transaction Importer
 * 
 * This file implements a transaction importer for Allied Irish Bank (AIB) CSV exports.
 */

import { TransactionImporter, NormalizedTransaction } from './types';
import csvParser from 'csv-parser';
import { Readable } from 'stream';
import { Transform } from 'stream';
import { standardizeDate } from '../utils/dateUtils';

/**
 * AIB Bank transaction importer implementation
 */
export class AIBImporter implements TransactionImporter {
  name = 'AIB Bank';
  code = 'aib-importer';
  description = 'Imports transactions from Allied Irish Bank CSV exports';
  supportedFileTypes = ['.csv'];
  
  /**
   * Parse AIB CSV file to normalized transaction format
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
          
          // Get the transaction date and standardize it
          const rawTransactionDate = getColumnValue(['Posted Transactions Date', 'PostedTransactionsDate', 'Date']) || '';
          const standardizedDate = standardizeDate(rawTransactionDate);
          
          // Map AIB CSV columns to normalized transaction format
          const transaction: NormalizedTransaction = {
            accountNumber: getColumnValue(['Posted Account', 'PostedAccount', 'Account']) || '',
            transactionDate: standardizedDate,
            description1: getColumnValue(['Description1', 'Description 1', 'Desc1']) || '',
            description2: getColumnValue(['Description2', 'Description 2', 'Desc2']) || '',
            description3: getColumnValue(['Description3', 'Description 3', 'Desc3']) || '',
            debitAmount: getColumnValue(['Debit Amount', 'DebitAmount']),
            creditAmount: getColumnValue(['Credit Amount', 'CreditAmount']),
            balance: getColumnValue(['Balance']) || '',
            currency: getColumnValue(['Posted Currency', 'PostedCurrency', 'Currency']) || '',
            transactionType: getColumnValue(['Transaction Type', 'TransactionType', 'Type']) || '',
            localCurrencyAmount: getColumnValue(['Local Currency Amount', 'LocalCurrencyAmount']),
            localCurrency: getColumnValue(['Local Currency', 'LocalCurrency'])
          };
          
          // Only add rows that have at least some valid data
          if (transaction.accountNumber || transaction.description1 || transaction.transactionDate) {
            // Only skip obvious dummy/test transactions
            if (transaction.description1 && 
                (transaction.description1.toUpperCase().includes('DUMMY') || 
                 transaction.description1.toUpperCase().includes('TEST TRANSACTION'))) {
              console.warn("AIBImporter: Skipping dummy/test transaction:", transaction.description1);
            } else {
              transactions.push(transaction);
            }
          } else {
            console.warn("AIBImporter: Skipping invalid transaction row:", row);
          }
        })
        .on('end', () => {
          console.log(`AIBImporter: Successfully parsed ${transactions.length} transactions`);
          resolve(transactions);
        })
        .on('error', (error: Error) => {
          console.error('AIBImporter: Error parsing CSV file:', error);
          reject(error);
        });
    });
  }
  
  /**
   * Check if file is an AIB CSV format
   * @param fileHeader First few lines of the file as string
   * @param fileName Name of the file
   * @returns Boolean indicating if this importer can handle the file
   */
  async canHandleFile(fileHeader: string, fileName: string): Promise<boolean> {
    // Check for AIB-specific column headers or file naming patterns
    const isAibHeader = fileHeader.includes('Posted Account') || 
                       fileHeader.includes('Posted Transactions Date') ||
                       fileHeader.includes('Description1');
                        
    const isAibFileName = fileName.toLowerCase().includes('aib') || 
                         fileName.toLowerCase().includes('allied_irish_bank');
    
    return isAibHeader || isAibFileName;
  }
}
