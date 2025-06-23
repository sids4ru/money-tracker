import api from './api';

export interface Category {
  id?: number;
  name: string;
  parent_id?: number | null;
  description?: string;
  created_at?: string;
  children?: Category[];
}

export interface CategoryAssignment {
  transactionId: number;
  categoryId: number;
  applyToSimilar?: boolean;
}

// API service for categories
export const CategoryService = {
  /**
   * Get all categories
   */
  async getAllCategories(): Promise<Category[]> {
    try {
      const response = await api.get('/categories');
      return response.data.data;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  },

  /**
   * Get a category by ID
   */
  async getCategory(id: number): Promise<Category> {
    try {
      const response = await api.get(`/categories/${id}`);
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching category #${id}:`, error);
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
    } catch (error) {
      console.error('Error creating category:', error);
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
  async getCategoriesForTransaction(transactionId: number): Promise<Category[]> {
    try {
      const response = await api.get(`/categories/transaction/${transactionId}`);
      return response.data.data;
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
  }
};
