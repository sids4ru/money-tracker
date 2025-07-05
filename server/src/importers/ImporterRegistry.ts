/**
 * Transaction Importer Registry
 * 
 * This file defines a registry for managing available transaction importers.
 * It provides methods for registering, retrieving, and listing importers.
 */

import { TransactionImporter } from './types';

/**
 * Registry for managing transaction importers
 * Uses a singleton pattern to ensure only one registry exists
 */
export class ImporterRegistry {
  /**
   * Map of registered importers, keyed by their code
   */
  private static importers: Map<string, TransactionImporter> = new Map();
  
  /**
   * Register a new importer with the registry
   * @param importer The importer to register
   */
  static registerImporter(importer: TransactionImporter): void {
    if (!importer.code) {
      throw new Error('Importer must have a code');
    }
    
    if (this.importers.has(importer.code)) {
      console.warn(`Importer with code '${importer.code}' already exists, overwriting`);
    }
    
    this.importers.set(importer.code, importer);
    console.log(`Registered importer: ${importer.name} (${importer.code})`);
  }
  
  /**
   * Get an importer by its code
   * @param code The unique identifier of the importer
   * @returns The importer or undefined if not found
   */
  static getImporter(code: string): TransactionImporter | undefined {
    return this.importers.get(code);
  }
  
  /**
   * Get all registered importers
   * @returns Array of all registered importers
   */
  static getAllImporters(): TransactionImporter[] {
    return Array.from(this.importers.values());
  }
  
  /**
   * Attempt to auto-detect which importer can handle a given file
   * @param fileHeader First few lines of the file as string
   * @param fileName Name of the file 
   * @returns The first importer that can handle the file, or undefined
   */
  static async autoDetectImporter(
    fileHeader: string, 
    fileName: string
  ): Promise<TransactionImporter | undefined> {
    for (const importer of this.getAllImporters()) {
      if (importer.canHandleFile && await importer.canHandleFile(fileHeader, fileName)) {
        return importer;
      }
    }
    
    return undefined;
  }
  
  /**
   * Get the default importer (first registered importer)
   * @returns The default importer or undefined if none registered
   */
  static getDefaultImporter(): TransactionImporter | undefined {
    const importers = this.getAllImporters();
    return importers.length > 0 ? importers[0] : undefined;
  }
}
