import { query, get, run } from '../database/db';
import { ParentCategory } from './ParentCategory';

export interface Category {
  id?: number;
  name: string;
  parent_id?: number | null; // References parent_categories table
  description?: string;
  created_at?: string;
  parent_category?: ParentCategory; // Optional joined parent category
}

export interface TransactionCategory {
  id?: number;
  transaction_id: number;
  category_id: number;
  created_at?: string;
}

export class CategoryModel {
  /**
   * Get all categories from the database
   */
  static async getAll(): Promise<Category[]> {
    return query<Category>('SELECT * FROM categories ORDER BY name');
  }

  /**
   * Get a category by its ID
   */
  static async getById(id: number): Promise<Category | undefined> {
    const category = await get<Category>('SELECT * FROM categories WHERE id = ?', [id]);
    
    if (category && category.parent_id) {
      // Join with parent category
      const parentCategory = await get<ParentCategory>(
        'SELECT * FROM parent_categories WHERE id = ?', 
        [category.parent_id]
      );
      
      if (parentCategory) {
        category.parent_category = parentCategory;
      }
    }
    
    return category;
  }

  /**
   * Create a new category
   */
  static async create(category: Omit<Category, 'id' | 'created_at'>): Promise<number> {
    const result = await run(
      `INSERT INTO categories (
        name, parent_id, description
      ) VALUES (?, ?, ?)`,
      [
        category.name,
        category.parent_id || null,
        category.description || null
      ]
    );

    return result.lastID;
  }

  /**
   * Update an existing category
   */
  static async update(id: number, category: Partial<Category>): Promise<boolean> {
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(category).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'created_at') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) {
      return false;
    }

    values.push(id);

    const result = await run(
      `UPDATE categories SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return result.changes > 0;
  }

  /**
   * Delete a category by ID
   */
  static async delete(id: number): Promise<boolean> {
    const result = await run('DELETE FROM categories WHERE id = ?', [id]);
    return result.changes > 0;
  }

  /**
   * Get all categories by parent category ID
   */
  static async getCategoriesByParentId(parentId: number): Promise<Category[]> {
    return query<Category>('SELECT * FROM categories WHERE parent_id = ? ORDER BY name', [parentId]);
  }

  /**
   * Find a category by name
   */
  static async findByName(name: string): Promise<Category | undefined> {
    return get<Category>('SELECT * FROM categories WHERE name = ?', [name]);
  }
  
  /**
   * Get all categories with their parent categories
   */
  static async getAllWithParents(): Promise<Category[]> {
    const categories = await query<Category>('SELECT * FROM categories ORDER BY name');
    
    // For each category, get its parent category if available
    for (const category of categories) {
      if (category.parent_id) {
        const parentCategory = await get<ParentCategory>(
          'SELECT * FROM parent_categories WHERE id = ?',
          [category.parent_id]
        );
        
        if (parentCategory) {
          category.parent_category = parentCategory;
        }
      }
    }
    
    return categories;
  }
}

export class TransactionCategoryModel {
  /**
   * Assign a category to a transaction
   */
  static async assignCategory(transactionId: number, categoryId: number): Promise<number> {
    // Check if this assignment already exists
    const existing = await get<TransactionCategory>(
      'SELECT * FROM transaction_categories WHERE transaction_id = ? AND category_id = ?',
      [transactionId, categoryId]
    );

    if (existing) {
      return existing.id!;
    }

    const result = await run(
      'INSERT INTO transaction_categories (transaction_id, category_id) VALUES (?, ?)',
      [transactionId, categoryId]
    );

    return result.lastID;
  }

  /**
   * Get categories for a transaction
   */
  static async getCategoriesForTransaction(transactionId: number): Promise<Category[]> {
    return query<Category>(
      `SELECT c.* 
       FROM categories c
       JOIN transaction_categories tc ON c.id = tc.category_id
       WHERE tc.transaction_id = ?
       ORDER BY c.name`,
      [transactionId]
    );
  }

  /**
   * Get all transactions for a category
   */
  static async getTransactionsForCategory(categoryId: number): Promise<number[]> {
    const results = await query<{ transaction_id: number }>(
      'SELECT transaction_id FROM transaction_categories WHERE category_id = ?',
      [categoryId]
    );
    
    return results.map(row => row.transaction_id);
  }

  /**
   * Remove a category assignment from a transaction
   */
  static async removeCategory(transactionId: number, categoryId: number): Promise<boolean> {
    const result = await run(
      'DELETE FROM transaction_categories WHERE transaction_id = ? AND category_id = ?',
      [transactionId, categoryId]
    );
    
    return result.changes > 0;
  }

  /**
   * Remove all category assignments for a transaction
   */
  static async removeAllCategories(transactionId: number): Promise<boolean> {
    const result = await run(
      'DELETE FROM transaction_categories WHERE transaction_id = ?',
      [transactionId]
    );
    
    return result.changes > 0;
  }
}
