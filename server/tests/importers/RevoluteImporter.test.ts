import { RevoluteImporter } from '../../src/importers/RevoluteImporter';

describe('RevoluteImporter', () => {
  let importer: RevoluteImporter;

  beforeEach(() => {
    importer = new RevoluteImporter();
  });

  describe('canHandleFile', () => {
    test('should return true for Revolute file headers', async () => {
      const headers = [
        'Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance',
        'Type,Product,Started Date,Completed Date,Description,Amount,Currency,State,Balance'
      ];

      for (const header of headers) {
        const result = await importer.canHandleFile(header, 'transactions.csv');
        expect(result).toBe(true);
      }
    });

    test('should return true for Revolute filenames', async () => {
      const filenames = [
        'revolute_transactions.csv',
        'REVOLUTE.csv',
        'revolute-export-2025.csv'
      ];

      for (const filename of filenames) {
        const result = await importer.canHandleFile('header,does,not,matter', filename);
        expect(result).toBe(true);
      }
    });

    test('should return false for non-Revolute files', async () => {
      const result = await importer.canHandleFile(
        'Date,Description,Amount,Balance',
        'bank_statement.csv'
      );
      expect(result).toBe(false);
    });
  });

  describe('parseFile', () => {
    test('should parse Revolute CSV format correctly', async () => {
      // Create a mock CSV content as a buffer
      const csvContent = `Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance
CARD_PAYMENT,Current,2025-06-01 18:39:41,2025-06-02 11:25:45,SumUp,-10,0,EUR,COMPLETED,219.13
TOPUP,Current,2025-06-13 18:55:38,2025-06-13 18:55:39,Payment from Siddharth Bagai,100,0,EUR,COMPLETED,105.44`;

      const buffer = Buffer.from(csvContent);
      
      const result = await importer.parseFile(buffer);
      
      // Should have 2 transactions
      expect(result).toHaveLength(2);
      
      // Check first transaction (negative amount = debit)
      expect(result[0].accountNumber).toBe('Current');
      expect(result[0].transactionDate).toBe('2025-06-02 11:25:45');
      expect(result[0].description1).toBe('SumUp');
      expect(result[0].description2).toBe('CARD_PAYMENT - COMPLETED');
      expect(result[0].description3).toBe('2025-06-01 18:39:41');
      expect(result[0].debitAmount).toBe('10');
      expect(result[0].creditAmount).toBeUndefined();
      expect(result[0].balance).toBe('219.13');
      expect(result[0].currency).toBe('EUR');
      expect(result[0].transactionType).toBe('CARD_PAYMENT');
      
      // Check second transaction (positive amount = credit)
      expect(result[1].accountNumber).toBe('Current');
      expect(result[1].transactionDate).toBe('2025-06-13 18:55:39');
      expect(result[1].description1).toBe('Payment from Siddharth Bagai');
      expect(result[1].debitAmount).toBeUndefined();
      expect(result[1].creditAmount).toBe('100');
      expect(result[1].transactionType).toBe('TOPUP');
    });

    test('should handle missing values correctly', async () => {
      const csvContent = `Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance
CARD_PAYMENT,Current,2025-06-01 18:39:41,2025-06-02 11:25:45,SumUp,-10,,EUR,COMPLETED,219.13`;

      const buffer = Buffer.from(csvContent);
      
      const result = await importer.parseFile(buffer);
      
      expect(result).toHaveLength(1);
      expect(result[0].description1).toBe('SumUp');
    });

    test('should skip invalid rows', async () => {
      const csvContent = `Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance
,,,,,,,,,
CARD_PAYMENT,Current,2025-06-01 18:39:41,2025-06-02 11:25:45,SumUp,-10,0,EUR,COMPLETED,219.13
,,,,,,,,,`;

      const buffer = Buffer.from(csvContent);
      
      const result = await importer.parseFile(buffer);
      
      expect(result).toHaveLength(1);
      expect(result[0].description1).toBe('SumUp');
    });

    test('should handle empty values correctly', async () => {
      const csvContent = `Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance
CARD_PAYMENT,Current,2025-06-01 18:39:41,,SumUp,-10,0,EUR,COMPLETED,219.13`;

      const buffer = Buffer.from(csvContent);
      
      const result = await importer.parseFile(buffer);
      
      expect(result[0].transactionDate).toBe('');
      expect(result[0].description3).toBe('2025-06-01 18:39:41');
    });
    
    test('should handle refunds correctly', async () => {
      // Create a CSV with a refund transaction (positive amount)
      const csvContent = `Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance
CARD_REFUND,Current,2025-07-03 14:41:29,2025-07-04 10:49:07,LycaMobile,9.98,0,EUR,COMPLETED,317.96`;

      const buffer = Buffer.from(csvContent);
      
      const result = await importer.parseFile(buffer);
      
      expect(result).toHaveLength(1);
      expect(result[0].description1).toBe('LycaMobile');
      expect(result[0].transactionType).toBe('CARD_REFUND');
      expect(result[0].debitAmount).toBeUndefined();
      expect(result[0].creditAmount).toBe('9.98');
    });
  });
});
