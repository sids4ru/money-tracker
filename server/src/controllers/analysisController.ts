import { Request, Response } from 'express';
import { TransactionModel, Transaction } from '../models/Transaction';
import { CategoryModel } from '../models/Category';
import { ParentCategoryModel } from '../models/ParentCategory';

/**
 * Get spending by parent category per month for a year
 */
export const getSpendingByParentCategoryPerMonth = async (req: Request, res: Response): Promise<void> => {
  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    
    // Get all parent categories
    const parentCategories = await ParentCategoryModel.getAll();
    
    // Get all transactions for the year with their categories
    const transactions = await TransactionModel.search({
      startDate,
      endDate
    });
    
    // Initialize result structure
    const result: {
      months: string[];
      categories: {
        id: number;
        name: string;
        data: number[];
      }[];
    } = {
      months: [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ],
      categories: parentCategories.map(cat => ({
        id: cat.id!,
        name: cat.name,
        data: Array(12).fill(0) // Initialize with zeros for 12 months
      }))
    };
    
    // Process transactions
    for (const transaction of transactions) {
      // Skip transactions without categories
      if (!transaction.category_id) continue;
      
      // Get the category and its parent
      const category = await CategoryModel.getById(transaction.category_id);
      if (!category || !category.parent_id) continue;
      
      // Find the parent category in our result
      const parentCategoryIndex = result.categories.findIndex(pc => pc.id === category.parent_id);
      if (parentCategoryIndex === -1) continue;
      
      // Determine the transaction amount (debit is negative, credit is positive for spending calculations)
      let amount = 0;
      if (transaction.debit_amount) {
        amount = -parseFloat(transaction.debit_amount.replace(/,/g, ''));
      } else if (transaction.credit_amount) {
        amount = parseFloat(transaction.credit_amount.replace(/,/g, ''));
      }
      
      // Get the month (0-based in JavaScript Date)
      const transactionDate = new Date(transaction.transaction_date);
      const month = transactionDate.getMonth();
      
      // Add the amount to the appropriate month for this parent category
      result.categories[parentCategoryIndex].data[month] += amount;
    }
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting spending by parent category per month:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get spending analysis data',
      error: (error as Error).message
    });
  }
};

/**
 * Get spending by category within a parent category for a specific month
 */
export const getSpendingByCategoryForMonth = async (req: Request, res: Response): Promise<void> => {
  try {
    const parentCategoryId = parseInt(req.params.parentId);
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1; // 1-12
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    
    // Validate month
    if (month < 1 || month > 12) {
      res.status(400).json({
        success: false,
        message: 'Invalid month, must be between 1 and 12'
      });
      return;
    }
    
    // Calculate start and end dates for the month
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    let endDate: string;
    
    // Calculate the last day of the month
    if (month === 12) {
      endDate = `${year}-12-31`;
    } else {
      endDate = `${year}-${(month + 1).toString().padStart(2, '0')}-01`;
      endDate = new Date(new Date(endDate).getTime() - 86400000).toISOString().split('T')[0];
    }
    
    // Get all categories for the parent category
    const categories = await ParentCategoryModel.getCategories(parentCategoryId);
    
    // Get all transactions for the period
    const transactions = await TransactionModel.search({
      startDate,
      endDate
    });
    
    // Initialize result structure
    const result = {
      parentId: parentCategoryId,
      month,
      year,
      categories: categories.map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        total: 0
      }))
    };
    
    // Process transactions
    for (const transaction of transactions) {
      // Skip transactions without categories
      if (!transaction.category_id) continue;
      
      // Check if this transaction belongs to one of our categories
      const categoryIndex = result.categories.findIndex(cat => cat.id === transaction.category_id);
      if (categoryIndex === -1) continue;
      
      // Determine the transaction amount (debit is negative, credit is positive for spending calculations)
      let amount = 0;
      if (transaction.debit_amount) {
        amount = -parseFloat(transaction.debit_amount.replace(/,/g, ''));
      } else if (transaction.credit_amount) {
        amount = parseFloat(transaction.credit_amount.replace(/,/g, ''));
      }
      
      // Add the amount to the category total
      result.categories[categoryIndex].total += amount;
    }
    
    // Sort categories by total (descending)
    result.categories.sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting spending by category for month:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get category spending data',
      error: (error as Error).message
    });
  }
};
