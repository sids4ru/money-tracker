import api from './api';
import { CategoryInfo } from '../types/Transaction';

export interface ParentCategory {
  id?: number;
  name: string;
  description?: string;
  created_at?: string;
  children?: Category[]; // Used for hierarchical display
}

export interface Category {
  id?: number;
  name: string;
  parent_id?: number | null; // References parent_categories
  parentId?: number; // Alternate property name for frontend use
  description?: string;
  created_at?: string;
  parent_category?: ParentCategory; // Optional joined parent category
  parentName?: string; // Name of the parent category (for convenience)
}

export interface TransactionSimilarityPattern {
  id?: number;
  pattern_type: string; // 'exact', 'regex', 'contains', etc.
  pattern_value: string;
  parent_category_id?: number | null;
  category_id?: number | null;
  confidence_score?: number;
  created_at?: string;
  updated_at?: string;
  usage_count?: number;
}

export interface CategoryAssignment {
  transactionId: number;
  categoryId: number;
  applyToSimilar?: boolean;
}

// API service for categories
export const CategoryService = {
  /**
   * Get all parent categories with their child categories
   */
  async getAllCategories(): Promise<ParentCategory[]> {
    try {
      const response = await api.get('/categories');
      return response.data.data;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  },
  
  /**
   * Get all parent categories without their children
   */
  async getAllParentCategories(): Promise<ParentCategory[]> {
    try {
      const response = await api.get('/categories/parent');
      return response.data.data;
    } catch (error) {
      console.error('Error fetching parent categories:', error);
      throw error;
    }
  },

  /**
   * Get a parent category by ID
   */
  async getParentCategory(id: number): Promise<ParentCategory> {
    try {
      const response = await api.get(`/categories/parent/${id}`);
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching parent category #${id}:`, error);
      throw error;
    }
  },

  /**
   * Get a category by ID
   */
  async getCategory(id: number): Promise<Category & { parentId?: number, parentName?: string }> {
    try {
      const response = await api.get(`/categories/${id}`);
      const category = response.data.data;
      
      // Add parentId as an alias for parent_id for frontend consistency
      if (category.parent_id) {
        category.parentId = category.parent_id;
        
        // Fetch parent category to get its name
        try {
          const parentCategory = await this.getParentCategory(category.parent_id);
          if (parentCategory) {
            category.parentName = parentCategory.name;
          }
        } catch (err) {
          console.error(`Error fetching parent for category #${id}:`, err);
        }
      }
      
      return category;
    } catch (error) {
      console.error(`Error fetching category #${id}:`, error);
      throw error;
    }
  },

  /**
   * Create a new parent category
   */
  async createParentCategory(parentCategory: Omit<ParentCategory, 'id' | 'created_at' | 'children'>): Promise<ParentCategory> {
    try {
      const response = await api.post('/categories/parent', parentCategory);
      return response.data.data;
    } catch (error: any) {
      console.error('Error creating parent category:', error);
      
      // Enhanced conflict error handling
      if (error.response && error.response.status === 409) {
        console.error(`A parent category with the name "${parentCategory.name}" already exists.`);
        error.conflictDetails = {
          message: `A parent category with the name "${parentCategory.name}" already exists.`,
          fieldName: 'name',
          attemptedValue: parentCategory.name
        };
      }
      throw error;
    }
  },

  /**
   * Create a new category
   */
  async createCategory(category: Omit<Category, 'id' | 'created_at'>): Promise<Category> {
    try {
      const response = await api.post('/categories', category);
      return response.data.data;
    } catch (error: any) {
      // Enhance error logging with more details
      console.error('Error creating category:', error);
      
      // If it's a conflict error, add more context to the error
      if (error.response && error.response.status === 409) {
        console.error(`A category with the name "${category.name}" already exists.`);
        // You could enhance the error object with additional information
        error.conflictDetails = {
          message: `A category with the name "${category.name}" already exists.`,
          fieldName: 'name',
          attemptedValue: category.name
        };
      }
      throw error;
    }
  },

  /**
   * Update a parent category
   */
  async updateParentCategory(id: number, parentCategory: Partial<ParentCategory>): Promise<ParentCategory> {
    try {
      const response = await api.put(`/categories/parent/${id}`, parentCategory);
      return response.data.data;
    } catch (error: any) {
      console.error(`Error updating parent category #${id}:`, error);
      
      // Enhanced conflict error handling
      if (error.response && error.response.status === 409) {
        console.error(`A parent category with the name "${parentCategory.name}" already exists.`);
        error.conflictDetails = {
          message: `A parent category with the name "${parentCategory.name}" already exists.`,
          fieldName: 'name',
          attemptedValue: parentCategory.name
        };
      }
      throw error;
    }
  },

  /**
   * Update a category
   */
  async updateCategory(id: number, category: Partial<Category>): Promise<Category> {
    try {
      const response = await api.put(`/categories/${id}`, category);
      return response.data.data;
    } catch (error) {
      console.error(`Error updating category #${id}:`, error);
      throw error;
    }
  },

  /**
   * Delete a parent category
   */
  async deleteParentCategory(id: number): Promise<boolean> {
    try {
      await api.delete(`/categories/parent/${id}`);
      return true;
    } catch (error) {
      console.error(`Error deleting parent category #${id}:`, error);
      throw error;
    }
  },

  /**
   * Delete a category
   */
  async deleteCategory(id: number): Promise<boolean> {
    try {
      await api.delete(`/categories/${id}`);
      return true;
    } catch (error) {
      console.error(`Error deleting category #${id}:`, error);
      throw error;
    }
  },

  /**
   * Assign a transaction to a category
   */
  async assignTransactionToCategory(
    transactionId: number, 
    categoryId: number, 
    applyToSimilar: boolean = false
  ): Promise<any> {
    try {
      const response = await api.post(`/categories/transaction/${transactionId}`, {
        categoryId,
        applyToSimilar
      });
      return response.data.data;
    } catch (error) {
      console.error(`Error assigning transaction #${transactionId} to category #${categoryId}:`, error);
      throw error;
    }
  },

  /**
   * Get categories for a transaction
   */
  async getCategoriesForTransaction(transactionId: number): Promise<CategoryInfo[]> {
    try {
      const response = await api.get(`/categories/transaction/${transactionId}`);
      
      // Transform the data but don't make additional API calls
      // The backend now includes parent_name in the response
      const categories = response.data.data;
      const transformedCategories: CategoryInfo[] = categories.map((category: any) => {
        return {
          id: category.id!,
          name: category.name,
          description: category.description,
          parentId: category.parent_id,
          parentName: category.parent_name // Using the parent_name from the JOIN query
        };
      });
      
      return transformedCategories;
    } catch (error) {
      console.error(`Error fetching categories for transaction #${transactionId}:`, error);
      throw error;
    }
  },

  /**
   * Remove a category from a transaction
   */
  async removeTransactionCategory(transactionId: number, categoryId: number): Promise<boolean> {
    try {
      await api.delete(`/categories/transaction/${transactionId}/category/${categoryId}`);
      return true;
    } catch (error) {
      console.error(`Error removing category #${categoryId} from transaction #${transactionId}:`, error);
      throw error;
    }
  },

  /**
   * Create a transaction similarity pattern
   */
  async createTransactionSimilarityPattern(
    pattern: Omit<TransactionSimilarityPattern, 'id' | 'created_at' | 'updated_at' | 'usage_count'>
  ): Promise<TransactionSimilarityPattern> {
    try {
      const response = await api.post('/categories/pattern', pattern);
      return response.data.data;
    } catch (error) {
      console.error('Error creating transaction similarity pattern:', error);
      throw error;
    }
  },

  /**
   * Get a transaction similarity pattern by ID
   */
  async getTransactionSimilarityPattern(id: number): Promise<TransactionSimilarityPattern> {
    try {
      const response = await api.get(`/categories/pattern/${id}`);
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching transaction similarity pattern #${id}:`, error);
      throw error;
    }
  },

  /**
   * Update a transaction similarity pattern
   */
  async updateTransactionSimilarityPattern(
    id: number,
    pattern: Partial<TransactionSimilarityPattern>
  ): Promise<TransactionSimilarityPattern> {
    try {
      const response = await api.put(`/categories/pattern/${id}`, pattern);
      return response.data.data;
    } catch (error) {
      console.error(`Error updating transaction similarity pattern #${id}:`, error);
      throw error;
    }
  },

  /**
   * Delete a transaction similarity pattern
   */
  async deleteTransactionSimilarityPattern(id: number): Promise<boolean> {
    try {
      await api.delete(`/categories/pattern/${id}`);
      return true;
    } catch (error) {
      console.error(`Error deleting transaction similarity pattern #${id}:`, error);
      throw error;
    }
  },
  
  /**
   * Get all transaction similarity patterns
   */
  async getAllPatterns(): Promise<TransactionSimilarityPattern[]> {
    try {
      // Use the TransactionSimilarityPatternModel.getAll endpoint - no specific endpoint exists yet
      // For now, return empty array to prevent errors
      return [];
      
      // When backend endpoint is implemented, use this code:
      // const response = await api.get('/categories/patterns');
      // return response.data.data;
    } catch (error) {
      console.error('Error fetching transaction patterns:', error);
      throw error;
    }
  }
};
