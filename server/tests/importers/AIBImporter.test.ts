import { AIBImporter } from '../../src/importers/AIBImporter';

describe('AIBImporter', () => {
  let importer: AIBImporter;

  beforeEach(() => {
    importer = new AIBImporter();
  });

  describe('canHandleFile', () => {
    test('should return true for AIB file headers', async () => {
      const headers = [
        'Posted Account,Posted Transactions Date,Description1,Debit Amount,Credit Amount,Balance',
        'Account,Date,Description1,Description2,Debit Amount,Credit Amount,Balance,Currency',
        'PostedAccount,PostedTransactionsDate,Description1,Description2,DebitAmount,CreditAmount,Balance'
      ];

      for (const header of headers) {
        const result = await importer.canHandleFile(header, 'transactions.csv');
        expect(result).toBe(true);
      }
    });

    test('should return true for AIB filenames', async () => {
      const filenames = [
        'aib_transactions.csv',
        'AIB_export_2025.csv',
        'allied_irish_bank_statement.csv'
      ];

      for (const filename of filenames) {
        const result = await importer.canHandleFile('header,does,not,matter', filename);
        expect(result).toBe(true);
      }
    });

    test('should return false for non-AIB files', async () => {
      const result = await importer.canHandleFile(
        'Date,Description,Amount,Balance',
        'bank_statement.csv'
      );
      expect(result).toBe(false);
    });
  });

  describe('parseFile', () => {
    test('should parse AIB CSV format correctly', async () => {
      // Create a mock CSV content as a buffer
      const csvContent = `Posted Account,Posted Transactions Date,Description1,Description2,Debit Amount,Credit Amount,Balance,Currency
12345678,2025-07-01,GROCERY SHOP,MAIN ST,10.50,,1000.00,EUR
12345678,2025-07-02,SALARY PAYMENT,,,,1500.00,EUR
12345678,2025-07-03,TEST TRANSACTION,IGNORE,,,1500.00,EUR`;

      const buffer = Buffer.from(csvContent);
      
      const result = await importer.parseFile(buffer);
      
      // Should have 2 transactions (ignoring test transaction)
      expect(result).toHaveLength(2);
      
      // Check first transaction
      expect(result[0].accountNumber).toBe('12345678');
      expect(result[0].transactionDate).toBe('2025-07-01');
      expect(result[0].description1).toBe('GROCERY SHOP');
      expect(result[0].description2).toBe('MAIN ST');
      expect(result[0].debitAmount).toBe('10.50');
      expect(result[0].creditAmount).toBeUndefined();
      expect(result[0].balance).toBe('1000.00');
      expect(result[0].currency).toBe('EUR');
      
      // Check second transaction
      expect(result[1].accountNumber).toBe('12345678');
      expect(result[1].transactionDate).toBe('2025-07-02');
      expect(result[1].description1).toBe('SALARY PAYMENT');
    });

    test('should handle alternative column names', async () => {
      // Create a mock CSV with alternative column names
      const csvContent = `Account,Date,Desc1,Desc2,DebitAmount,CreditAmount,Balance,Currency
12345678,2025-07-01,GROCERY SHOP,MAIN ST,10.50,,1000.00,EUR`;

      const buffer = Buffer.from(csvContent);
      
      const result = await importer.parseFile(buffer);
      
      expect(result).toHaveLength(1);
      expect(result[0].accountNumber).toBe('12345678');
      expect(result[0].transactionDate).toBe('2025-07-01');
      expect(result[0].description1).toBe('GROCERY SHOP');
    });

    test('should skip invalid rows', async () => {
      const csvContent = `Posted Account,Posted Transactions Date,Description1,Description2,Debit Amount,Credit Amount,Balance,Currency
,,,,,,,
12345678,2025-07-01,GROCERY SHOP,MAIN ST,10.50,,1000.00,EUR
,,,,,,,`;

      const buffer = Buffer.from(csvContent);
      
      const result = await importer.parseFile(buffer);
      
      expect(result).toHaveLength(1);
      expect(result[0].description1).toBe('GROCERY SHOP');
    });

    test('should handle empty values correctly', async () => {
      const csvContent = `Posted Account,Posted Transactions Date,Description1,Description2,Debit Amount,Credit Amount,Balance,Currency
12345678,2025-07-01,GROCERY SHOP,,10.50,,1000.00,EUR`;

      const buffer = Buffer.from(csvContent);
      
      const result = await importer.parseFile(buffer);
      
      expect(result[0].description2).toBe('');
      expect(result[0].creditAmount).toBeUndefined();
    });
    
    test('should only filter obviously dummy transactions', async () => {
      // Create a CSV with various transaction patterns
      const csvContent = `Posted Account,Posted Transactions Date,Description1,Description2,Debit Amount,Credit Amount,Balance,Currency
12345678,2025-07-01,REGULAR TRANSACTION,SHOULD BE INCLUDED,10.50,,1000.00,EUR
12345678,2025-07-02,DUMMY TRANSACTION,SHOULD BE FILTERED,20.00,,980.00,EUR
12345678,2025-07-03,AUTO_CATEGORIZE_TEST,SHOULD BE INCLUDED NOW,30.00,,950.00,EUR
12345678,2025-07-04,TIMESTAMP 1234567890,SHOULD BE INCLUDED,40.00,,910.00,EUR
12345678,2025-07-05,TEST TRANSACTION,SHOULD BE FILTERED,50.00,,860.00,EUR`;

      const buffer = Buffer.from(csvContent);
      
      const result = await importer.parseFile(buffer);
      
      // Should include all but the obvious dummy transactions
      expect(result.length).toBe(3);
      
      // Verify the regular transaction is included
      const regularTransaction = result.find(t => t.description1 === 'REGULAR TRANSACTION');
      expect(regularTransaction).toBeDefined();
      
      // Verify the timestamp transaction is included
      const timestampTransaction = result.find(t => t.description1.includes('TIMESTAMP'));
      expect(timestampTransaction).toBeDefined();
      
      // Verify the AUTO_CATEGORIZE_TEST is included now that we're not filtering it
      const autoCategorizeTransaction = result.find(t => t.description1.includes('AUTO_CATEGORIZE_TEST'));
      expect(autoCategorizeTransaction).toBeDefined();
      
      // Verify dummy transactions are still filtered
      expect(result.find(t => t.description1.includes('DUMMY'))).toBeUndefined();
      expect(result.find(t => t.description1.includes('TEST TRANSACTION'))).toBeUndefined();
    });
  });
});
