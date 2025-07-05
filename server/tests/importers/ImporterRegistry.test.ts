import { ImporterRegistry } from '../../src/importers/ImporterRegistry';
import { TransactionImporter, NormalizedTransaction } from '../../src/importers/types';

// Mock importer for testing
class MockImporter implements TransactionImporter {
  name = 'Mock Importer';
  code = 'mock-importer';
  description = 'Test importer for unit tests';
  supportedFileTypes = ['.csv'];

  async parseFile(fileBuffer: Buffer): Promise<NormalizedTransaction[]> {
    return [
      {
        accountNumber: '12345',
        transactionDate: '2025-07-01',
        description1: 'Test Transaction',
        balance: '1000.00',
        currency: 'EUR',
        transactionType: 'CREDIT'
      }
    ];
  }

  async canHandleFile(fileHeader: string, fileName: string): Promise<boolean> {
    return fileName.includes('mock') || fileHeader.includes('mock');
  }
}

describe('ImporterRegistry', () => {
  // Clear registry before each test
  beforeEach(() => {
    // Access and clear the private importers map
    const privateRegistry = (ImporterRegistry as any).importers;
    if (privateRegistry) {
      privateRegistry.clear();
    }
  });

  test('should register and retrieve an importer', () => {
    const mockImporter = new MockImporter();
    ImporterRegistry.registerImporter(mockImporter);

    const retrievedImporter = ImporterRegistry.getImporter('mock-importer');
    
    expect(retrievedImporter).toBeDefined();
    expect(retrievedImporter?.code).toBe('mock-importer');
    expect(retrievedImporter?.name).toBe('Mock Importer');
  });

  test('should return all registered importers', () => {
    const mockImporter1 = new MockImporter();
    const mockImporter2 = { ...new MockImporter(), code: 'mock-importer-2', name: 'Mock Importer 2' };
    
    ImporterRegistry.registerImporter(mockImporter1);
    ImporterRegistry.registerImporter(mockImporter2 as TransactionImporter);
    
    const allImporters = ImporterRegistry.getAllImporters();
    
    expect(allImporters).toHaveLength(2);
    expect(allImporters.map(imp => imp.code)).toContain('mock-importer');
    expect(allImporters.map(imp => imp.code)).toContain('mock-importer-2');
  });

  test('should throw error when registering importer without code', () => {
    const invalidImporter = { ...new MockImporter(), code: '' };
    
    expect(() => {
      ImporterRegistry.registerImporter(invalidImporter as TransactionImporter);
    }).toThrow('Importer must have a code');
  });

  test('should overwrite importer with same code', () => {
    const mockImporter1 = new MockImporter();
    const mockImporter2 = { ...new MockImporter(), name: 'Updated Mock Importer' };
    
    ImporterRegistry.registerImporter(mockImporter1);
    ImporterRegistry.registerImporter(mockImporter2 as TransactionImporter);
    
    const retrievedImporter = ImporterRegistry.getImporter('mock-importer');
    
    expect(retrievedImporter?.name).toBe('Updated Mock Importer');
  });

  test('should return undefined for non-existent importer', () => {
    const importer = ImporterRegistry.getImporter('non-existent-importer');
    expect(importer).toBeUndefined();
  });

  test('should auto-detect importer for file', async () => {
    const mockImporter = new MockImporter();
    ImporterRegistry.registerImporter(mockImporter);
    
    const fileHeader = 'This is a mock file header';
    const fileName = 'mock_transactions.csv';
    
    const detectedImporter = await ImporterRegistry.autoDetectImporter(fileHeader, fileName);
    
    expect(detectedImporter).toBeDefined();
    expect(detectedImporter?.code).toBe('mock-importer');
  });

  test('should return undefined when no importer can handle the file', async () => {
    // Create a more restricted mock importer for this test
    const mockImporter = new MockImporter();
    // Override the canHandleFile method to be more restrictive
    mockImporter.canHandleFile = async (header: string, name: string): Promise<boolean> => {
      return header.includes('mock') && name.includes('mock'); // Require both to match
    };
    
    ImporterRegistry.registerImporter(mockImporter);
    
    const fileHeader = 'This is not a mock file header';
    const fileName = 'unknown_format.csv';
    
    const detectedImporter = await ImporterRegistry.autoDetectImporter(fileHeader, fileName);
    
    expect(detectedImporter).toBeUndefined();
  });

  test('should return default importer when available', () => {
    const mockImporter = new MockImporter();
    ImporterRegistry.registerImporter(mockImporter);
    
    const defaultImporter = ImporterRegistry.getDefaultImporter();
    
    expect(defaultImporter).toBeDefined();
    expect(defaultImporter?.code).toBe('mock-importer');
  });

  test('should return undefined when no importers registered', () => {
    const defaultImporter = ImporterRegistry.getDefaultImporter();
    expect(defaultImporter).toBeUndefined();
  });
});
