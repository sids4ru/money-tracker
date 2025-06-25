import { Request, Response } from 'express';
import { CategoryModel, TransactionCategoryModel, Category } from '../models/Category';
import { TransactionModel } from '../models/Transaction';
import * as stringSimilarity from 'string-similarity';

export const CategoryController = {
  /**
   * Get all categories
   */
  async getAllCategories(req: Request, res: Response): Promise<void> {
    try {
      const categories = await CategoryModel.getAll();
      
      // Organize categories into hierarchy
      const rootCategories = categories.filter(c => !c.parent_id);
      const childMap = new Map<number, Category[]>();
      
      categories
        .filter(c => c.parent_id)
        .forEach(child => {
          const parentId = child.parent_id!;
          if (!childMap.has(parentId)) {
            childMap.set(parentId, []);
          }
          childMap.get(parentId)!.push(child);
        });
      
      const result = rootCategories.map(root => ({
        ...root,
        children: childMap.get(root.id!) || []
      }));
      
      res.status(200).json({
        success: true,
        message: 'Categories retrieved successfully',
        data: result
      });
    } catch (error) {
      console.error('Error retrieving categories:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to retrieve categories' 
      });
    }
  },

  /**
   * Create a new category
   */
  async createCategory(req: Request, res: Response): Promise<void> {
    try {
      const { name, parent_id, description } = req.body;
      
      if (!name) {
        res.status(400).json({ 
          success: false, 
          message: 'Category name is required'
        });
        return;
      }

      // Check if category with same name already exists
      const existing = await CategoryModel.findByName(name);
      if (existing) {
        res.status(409).json({
          success: false,
          message: 'Category with this name already exists',
          data: existing
        });
        return;
      }

      const categoryId = await CategoryModel.create({
        name,
        parent_id: parent_id || null,
        description
      });

      const newCategory = await CategoryModel.getById(categoryId);

      res.status(201).json({
        success: true,
        message: 'Category created successfully',
        data: newCategory
      });
    } catch (error) {
      console.error('Error creating category:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to create category' 
      });
    }
  },

  /**
   * Get a specific category by ID
   */
  async getCategory(req: Request, res: Response): Promise<void> {
    try {
      const categoryId = parseInt(req.params.id);
      
      if (isNaN(categoryId)) {
        res.status(400).json({ 
          success: false, 
          message: 'Invalid category ID' 
        });
        return;
      }

      const category = await CategoryModel.getById(categoryId);
      
      if (!category) {
        res.status(404).json({ 
          success: false, 
          message: 'Category not found' 
        });
        return;
      }

      // Get child categories if any
      const children = await CategoryModel.getSubcategories(categoryId);

      res.status(200).json({
        success: true,
        message: 'Category retrieved successfully',
        data: {
          ...category,
          children
        }
      });
    } catch (error) {
      console.error(`Error retrieving category #${req.params.id}:`, error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to retrieve category' 
      });
    }
  },

  /**
   * Update a category
   */
  async updateCategory(req: Request, res: Response): Promise<void> {
    try {
      const categoryId = parseInt(req.params.id);
      const { name, parent_id, description } = req.body;
      
      if (isNaN(categoryId)) {
        res.status(400).json({ 
          success: false, 
          message: 'Invalid category ID' 
        });
        return;
      }

      const category = await CategoryModel.getById(categoryId);
      
      if (!category) {
        res.status(404).json({ 
          success: false, 
          message: 'Category not found' 
        });
        return;
      }

      // Check if name is being changed and if so, check for conflicts
      if (name && name !== category.name) {
        const existingWithName = await CategoryModel.findByName(name);
        if (existingWithName && existingWithName.id !== categoryId) {
          res.status(409).json({
            success: false,
            message: 'Another category with this name already exists'
          });
          return;
        }
      }

      const success = await CategoryModel.update(categoryId, {
        name,
        parent_id: parent_id || null,
        description
      });

      if (success) {
        const updatedCategory = await CategoryModel.getById(categoryId);
        res.status(200).json({
          success: true,
          message: 'Category updated successfully',
          data: updatedCategory
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'No changes made to the category'
        });
      }
    } catch (error) {
      console.error(`Error updating category #${req.params.id}:`, error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to update category' 
      });
    }
  },

  /**
   * Delete a category
   */
  async deleteCategory(req: Request, res: Response): Promise<void> {
    try {
      const categoryId = parseInt(req.params.id);
      
      if (isNaN(categoryId)) {
        res.status(400).json({ 
          success: false, 
          message: 'Invalid category ID' 
        });
        return;
      }

      const category = await CategoryModel.getById(categoryId);
      
      if (!category) {
        res.status(404).json({ 
          success: false, 
          message: 'Category not found' 
        });
        return;
      }

      // Check if this category has child categories
      const children = await CategoryModel.getSubcategories(categoryId);
      
      if (children.length > 0) {
        res.status(400).json({
          success: false,
          message: 'Cannot delete category that has subcategories. Delete the subcategories first.'
        });
        return;
      }

      const success = await CategoryModel.delete(categoryId);

      res.status(success ? 200 : 400).json({
        success,
        message: success 
          ? 'Category deleted successfully' 
          : 'Failed to delete category'
      });
    } catch (error) {
      console.error(`Error deleting category #${req.params.id}:`, error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to delete category' 
      });
    }
  },

  /**
   * Assign a category to a transaction
   */
  async assignTransactionCategory(req: Request, res: Response): Promise<void> {
    try {
      console.log('Received category assignment request:', {
        params: req.params,
        body: req.body
      });
      
      const transactionId = parseInt(req.params.transactionId);
      const { categoryId } = req.body;
      
      console.log(`Processing assignment: Transaction ID ${transactionId}, Category ID ${categoryId}`);

      if (isNaN(transactionId) || isNaN(categoryId)) {
        res.status(400).json({ 
          success: false, 
          message: 'Invalid transaction ID or category ID' 
        });
        return;
      }

      // Verify both transaction and category exist
      const transaction = await TransactionModel.getById(transactionId);
      if (!transaction) {
        res.status(404).json({ 
          success: false, 
          message: 'Transaction not found' 
        });
        return;
      }

      const category = await CategoryModel.getById(categoryId);
      if (!category) {
        res.status(404).json({ 
          success: false, 
          message: 'Category not found' 
        });
        return;
      }

      // Remove any existing categories first to ensure one category per transaction
      await TransactionCategoryModel.removeAllCategories(transactionId);

      // Assign category to transaction
      const assignmentId = await TransactionCategoryModel.assignCategory(transactionId, categoryId);
      
      // Update the transaction's grouping status to "manual"
      await TransactionModel.update(transactionId, { grouping_status: 'manual' });

      // Handle similar transactions if requested
      let updatedSimilar = 0;
      const applyToSimilar = req.body.applyToSimilar === true;
      
      if (applyToSimilar) {
        // Find similar transactions based on description
        const similarTransactions = await findSimilarTransactions(transaction);

        // Parse the transaction date to compare
        const transactionDate = parseTransactionDate(transaction.transaction_date);
        
      // Assign the same category to similar transactions (only those with date >= current transaction date)
      for (const similarTransaction of similarTransactions) {
        // Skip if it's the same transaction
        if (similarTransaction.id === transactionId) continue;
        
        // Debug log to check what's in the transaction object
        console.log(`Transaction ID ${similarTransaction.id} - grouping_status: ${similarTransaction.grouping_status}`);
        
        // Get the full transaction details to ensure we have all fields
        const fullTransactionDetails = await TransactionModel.getById(similarTransaction.id!);
        console.log(`Full transaction details - grouping_status: ${fullTransactionDetails?.grouping_status}`);
        
        // Skip if this transaction already has any category assignment (manual or auto)
        // Using the full transaction details to ensure we have the correct status
        if (fullTransactionDetails && 
            (fullTransactionDetails.grouping_status === 'manual' || fullTransactionDetails.grouping_status === 'auto')) {
          console.log(`Skipping similar transaction ID ${similarTransaction.id} because it's already categorized (${fullTransactionDetails.grouping_status})`);
          continue;
        }
        
        // Parse the similar transaction date
        const similarDate = parseTransactionDate(similarTransaction.transaction_date);
        
        // Only apply to current or future transactions (not past ones)
        if (similarDate >= transactionDate) {
          console.log(`Applying category to similar transaction ID ${similarTransaction.id}, date ${similarTransaction.transaction_date}`);
          
          // Remove any existing categories for each similar transaction too
          await TransactionCategoryModel.removeAllCategories(similarTransaction.id!);
          
          // Then assign the new category
          await TransactionCategoryModel.assignCategory(similarTransaction.id!, categoryId);
          
          // Mark these as auto-grouped
          await TransactionModel.update(similarTransaction.id!, { grouping_status: 'auto' });
          updatedSimilar++;
        } else {
          console.log(`Skipping similar transaction ID ${similarTransaction.id} with earlier date ${similarTransaction.transaction_date}`);
        }
      }
      }

      res.status(200).json({
        success: true,
        message: 'Category assigned to transaction successfully',
        data: {
          transactionId,
          categoryId,
          assignmentId,
          similarTransactionsUpdated: updatedSimilar
        }
      });
    } catch (error) {
      console.error(`Error assigning category to transaction #${req.params.transactionId}:`, error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to assign category to transaction' 
      });
    }
  },

  /**
   * Get categories for a transaction
   */
  async getTransactionCategories(req: Request, res: Response): Promise<void> {
    try {
      const transactionId = parseInt(req.params.transactionId);
      
      if (isNaN(transactionId)) {
        res.status(400).json({ 
          success: false, 
          message: 'Invalid transaction ID' 
        });
        return;
      }

      const transaction = await TransactionModel.getById(transactionId);
      
      if (!transaction) {
        res.status(404).json({ 
          success: false, 
          message: 'Transaction not found' 
        });
        return;
      }

      const categories = await TransactionCategoryModel.getCategoriesForTransaction(transactionId);

      res.status(200).json({
        success: true,
        message: 'Transaction categories retrieved successfully',
        data: categories
      });
    } catch (error) {
      console.error(`Error retrieving categories for transaction #${req.params.transactionId}:`, error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to retrieve transaction categories' 
      });
    }
  },

  /**
   * Remove a category from a transaction
   */
  async removeTransactionCategory(req: Request, res: Response): Promise<void> {
    try {
      const transactionId = parseInt(req.params.transactionId);
      const categoryId = parseInt(req.params.categoryId);
      
      if (isNaN(transactionId) || isNaN(categoryId)) {
        res.status(400).json({ 
          success: false, 
          message: 'Invalid transaction ID or category ID' 
        });
        return;
      }

      const success = await TransactionCategoryModel.removeCategory(transactionId, categoryId);

      res.status(success ? 200 : 400).json({
        success,
        message: success 
          ? 'Category removed from transaction successfully' 
          : 'Failed to remove category from transaction'
      });
    } catch (error) {
      console.error(`Error removing category from transaction:`, error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to remove category from transaction' 
      });
    }
  }
};

/**
 * Find transactions similar to the provided one with advanced pattern matching
 * Uses string-similarity library and regex patterns for more accurate matching
 */
async function findSimilarTransactions(transaction: any) {
  // Get transaction's main description field
  const description = transaction.description1 || '';
  
  // Extract merchant identifiers using regular expressions
  
  // Pattern 1: Match "VDC-TESCO", "VDC-SPAR", etc.
  const merchantRegex = /([A-Z]+)-([A-Z]+)/;
  const merchantMatch = description.match(merchantRegex);
  
  // Pattern 2: For descriptions with store number or location codes like "TESCO STORES 1234"
  const storeRegex = /([A-Z]+)\s+([A-Z]+)(?:\s+\d+)?/;
  const storeMatch = description.match(storeRegex);
  
  // Extract the core merchant identifier to use for searching
  let merchantIdentifier = '';
  
  if (merchantMatch) {
    // Use the matched merchant pattern (e.g., "VDC-TESCO")
    merchantIdentifier = merchantMatch[0];
  } else if (storeMatch) {
    // Use the matched store name (e.g., "TESCO STORES")
    merchantIdentifier = storeMatch[0];
  } else {
    // Fallback to the first 2-3 words
    const words = description.split(/\s+/).filter((w: string) => w.length > 0);
    merchantIdentifier = words.slice(0, Math.min(2, words.length)).join(' ');
  }
  
  console.log(`Looking for transactions similar to: "${description}"`);
  console.log(`Using merchant identifier: "${merchantIdentifier}"`);
  
  // First, get a broader set of potential matches
  const potentialMatches = await TransactionModel.search({
    searchText: merchantIdentifier.split(/[\s-]/)[0] // Use first part for broad search
  });
  
  // Then filter by similarity score to get only highly similar transactions
  const similarTransactions = potentialMatches.filter(potentialMatch => {
    const potentialDesc = potentialMatch.description1 || '';
    
    // Calculate similarity score between the descriptions
    const similarityScore = stringSimilarity.compareTwoStrings(
      description.toLowerCase(), 
      potentialDesc.toLowerCase()
    );
    
    // Check for regex pattern match as well
    const patternMatch = merchantMatch && potentialDesc.match(merchantRegex)?.[0] === merchantMatch[0];
    
    // Log for debugging
    console.log(`Comparing: "${description}" with "${potentialDesc}" - Score: ${similarityScore}`);
    
    // Require high similarity (>0.6) or exact pattern match
    return similarityScore > 0.6 || patternMatch;
  });
  
  return similarTransactions;
}

/**
 * Helper function to parse transaction date string into a Date object
 * Handles different date formats like DD/MM/YYYY
 */
function parseTransactionDate(dateStr: string): Date {
  // Handle different possible date formats
  if (dateStr.includes('/')) {
    // Format: DD/MM/YYYY
    const [day, month, year] = dateStr.split('/').map(Number);
    return new Date(year, month - 1, day);
  } else if (dateStr.includes('-')) {
    // Format: YYYY-MM-DD
    return new Date(dateStr);
  } else {
    // Default parsing attempt
    return new Date(dateStr);
  }
}
