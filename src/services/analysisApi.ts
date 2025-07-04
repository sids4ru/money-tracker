import api from './api';

export interface MonthlySpendingByParentCategory {
  months: string[];
  categories: {
    id: number;
    name: string;
    data: number[];
    dailyData?: {
      days: string[];
      values: number[];
    };
  }[];
  currentMonth?: number; // 1-based month number
  isCurrentYear?: boolean;
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
   * Daily data will be included for the specified month (defaults to current month)
   */
  async getSpendingByParentCategoryPerMonth(
    year: number = new Date().getFullYear(),
    selectedMonth: number = new Date().getMonth() + 1
  ): Promise<MonthlySpendingByParentCategory> {
    try {
      const isCurrentYear = year === new Date().getFullYear();
      const includeDaily = true; // Always include daily data for the selected month
      
      const response = await api.get(`/analysis/spending/parent-categories?year=${year}&includeDaily=${includeDaily}&currentMonth=${selectedMonth}`);
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
