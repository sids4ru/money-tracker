/**
 * Transaction Importer Plugin System - Entry Point
 * 
 * This file exports all components of the importer plugin system and provides
 * the registration function to initialize all importers.
 */

// Export all types and interfaces
export * from './types';
export * from './ImporterRegistry';

// Import all available importers
import { AIBImporter } from './AIBImporter';

/**
 * Register all available importers with the registry
 * This function should be called when the application starts
 */
export function registerImporters(): void {
  const { ImporterRegistry } = require('./ImporterRegistry');
  
  // Register the AIB importer
  ImporterRegistry.registerImporter(new AIBImporter());
  
  // Additional importers can be registered here in the future
}
