import api from './api';

export interface MonthlySpendingByParentCategory {
  months: string[];
  categories: {
    id: number;
    name: string;
    data: number[];
  }[];
}

export interface CategorySpendingForMonth {
  parentId: number;
  month: number;
  year: number;
  categories: {
    id: number;
    name: string;
    total: number;
  }[];
}

export const AnalysisService = {
  /**
   * Get spending by parent category per month for a year
   */
  async getSpendingByParentCategoryPerMonth(year: number = new Date().getFullYear()): Promise<MonthlySpendingByParentCategory> {
    try {
      const response = await api.get(`/analysis/spending/parent-categories?year=${year}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching parent category monthly spending:', error);
      throw error;
    }
  },

  /**
   * Get spending by category for a specific parent category and month
   */
  async getSpendingByCategoryForMonth(
    parentId: number,
    month: number = new Date().getMonth() + 1,
    year: number = new Date().getFullYear()
  ): Promise<CategorySpendingForMonth> {
    try {
      const response = await api.get(
        `/analysis/spending/parent-categories/${parentId}/categories?month=${month}&year=${year}`
      );
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching category spending for month:`, error);
      throw error;
    }
  }
};
