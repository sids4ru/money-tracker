import { Request, Response } from 'express';
import { query } from '../database/db';
import { ParentCategoryModel } from '../models/ParentCategory';

/**
 * Get spending by parent category per month for a year
 */
export const getSpendingByParentCategoryPerMonth = async (req: Request, res: Response): Promise<void> => {
  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    
    // Get all parent categories
    const parentCategories = await ParentCategoryModel.getAll();
    
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
    
    // Add debug info
    console.log(`Fetching spending data for year: ${year}`);
    
    // SQL query to get monthly spending by parent category
    // Using parent_category_id directly from transaction_categories for better efficiency
    // Note: transaction_date is in DD/MM/YYYY format, so we need to extract month and year differently
    const monthlySpendingData = await query<{
      parent_id: number;
      month: number; // 1-based month
      total: number;
    }>(`
      SELECT 
        tc.parent_category_id as parent_id,
        CAST(substr(t.transaction_date, 4, 2) AS INTEGER) AS month,
        SUM(
          CASE
            WHEN t.debit_amount IS NOT NULL THEN -CAST(REPLACE(t.debit_amount, ',', '') AS REAL)
            WHEN t.credit_amount IS NOT NULL THEN CAST(REPLACE(t.credit_amount, ',', '') AS REAL)
            ELSE 0
          END
        ) AS total
      FROM 
        transaction_categories tc
      JOIN
        transactions t ON tc.transaction_id = t.id  
      WHERE 
        substr(t.transaction_date, 7, 4) = ? 
        AND tc.parent_category_id IS NOT NULL
      GROUP BY 
        tc.parent_category_id, month
      ORDER BY 
        tc.parent_category_id, month
    `, [year.toString()]);
    
    console.log(`Monthly spending data from transaction_categories: ${JSON.stringify(monthlySpendingData)}`);
    
    // Now handle transactions with category_id directly set on the transaction
    // Note: transaction_date is in DD/MM/YYYY format, so we need to extract month and year differently
    const directCategorySpending = await query<{
      parent_id: number;
      month: number; // 1-based month
      total: number;
    }>(`
      SELECT 
        c.parent_id,
        CAST(substr(t.transaction_date, 4, 2) AS INTEGER) AS month,
        SUM(
          CASE
            WHEN t.debit_amount IS NOT NULL THEN -CAST(REPLACE(t.debit_amount, ',', '') AS REAL)
            WHEN t.credit_amount IS NOT NULL THEN CAST(REPLACE(t.credit_amount, ',', '') AS REAL)
            ELSE 0
          END
        ) AS total
      FROM 
        transactions t
      JOIN 
        categories c ON t.category_id = c.id
      WHERE 
        substr(t.transaction_date, 7, 4) = ? 
        AND c.parent_id IS NOT NULL
        AND t.category_id IS NOT NULL
      GROUP BY 
        c.parent_id, month
      ORDER BY 
        c.parent_id, month
    `, [year.toString()]);
    
    console.log(`Monthly spending data from direct category_id: ${JSON.stringify(directCategorySpending)}`);
    
    // Return empty data if no transactions are found - don't generate random data
    if (monthlySpendingData.length === 0 && directCategorySpending.length === 0) {
      console.log("No spending data found for the specified year");
      
      res.json({
        success: true,
        data: result
      });
      return;
    }
    
    // Merge the two result sets
    for (const spending of directCategorySpending) {
      const existingIndex = monthlySpendingData.findIndex(
        item => item.parent_id === spending.parent_id && item.month === spending.month
      );
      
      if (existingIndex !== -1) {
        // Add to existing data
        monthlySpendingData[existingIndex].total += spending.total;
      } else {
        // Add new data point
        monthlySpendingData.push(spending);
      }
    }
    
    // Process the SQL results into our result structure
    for (const spending of monthlySpendingData) {
      const categoryIndex = result.categories.findIndex(cat => cat.id === spending.parent_id);
      if (categoryIndex !== -1) {
        // Month is 1-based in SQL result, but 0-based in our array
        result.categories[categoryIndex].data[spending.month - 1] = spending.total;
      }
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
    
    // Format month for SQL query (ensure it's two digits)
    const monthFormatted = month.toString().padStart(2, '0');
    
    // Add debug info
    console.log(`Fetching category spending data for parent: ${parentCategoryId}, month: ${month}, year: ${year}`);
    
    // SQL query to get category spending for a specific month and parent category
    // Note: transaction_date is in DD/MM/YYYY format, so we need to extract month and year differently
    const categorySpendingData = await query<{
      id: number;
      name: string;
      total: number;
    }>(`
      SELECT 
        c.id,
        c.name,
        SUM(
          CASE
            WHEN t.debit_amount IS NOT NULL THEN -CAST(REPLACE(t.debit_amount, ',', '') AS REAL)
            WHEN t.credit_amount IS NOT NULL THEN CAST(REPLACE(t.credit_amount, ',', '') AS REAL)
            ELSE 0
          END
        ) AS total
      FROM 
        transaction_categories tc
      JOIN 
        transactions t ON tc.transaction_id = t.id
      JOIN 
        categories c ON tc.category_id = c.id
      WHERE 
        tc.parent_category_id = ?
        AND substr(t.transaction_date, 7, 4) = ? AND substr(t.transaction_date, 4, 2) = ?
      GROUP BY 
        c.id, c.name
      ORDER BY 
        ABS(total) DESC
    `, [parentCategoryId, year.toString(), monthFormatted]);
    
    console.log(`Category spending data from transaction_categories: ${JSON.stringify(categorySpendingData)}`);
    
    // Now handle transactions with category_id directly set on the transaction
    // Note: transaction_date is in DD/MM/YYYY format, so we need to extract month and year differently
    const directCategorySpending = await query<{
      id: number;
      name: string;
      total: number;
    }>(`
      SELECT 
        c.id,
        c.name,
        SUM(
          CASE
            WHEN t.debit_amount IS NOT NULL THEN -CAST(REPLACE(t.debit_amount, ',', '') AS REAL)
            WHEN t.credit_amount IS NOT NULL THEN CAST(REPLACE(t.credit_amount, ',', '') AS REAL)
            ELSE 0
          END
        ) AS total
      FROM 
        transactions t
      JOIN 
        categories c ON t.category_id = c.id
      WHERE 
        c.parent_id = ?
        AND substr(t.transaction_date, 7, 4) = ? AND substr(t.transaction_date, 4, 2) = ?
        AND t.category_id IS NOT NULL
      GROUP BY 
        c.id, c.name
      ORDER BY 
        ABS(total) DESC
    `, [parentCategoryId, year.toString(), monthFormatted]);
    
    console.log(`Category spending data from direct category_id: ${JSON.stringify(directCategorySpending)}`);
    
    // Return empty data if no transactions are found - don't generate random data
    if (categorySpendingData.length === 0 && directCategorySpending.length === 0) {
      console.log(`No category spending data found for parent: ${parentCategoryId}, month: ${month}, year: ${year}`);
      
      res.json({
        success: true,
        data: {
          parentId: parentCategoryId,
          month,
          year,
          categories: []
        }
      });
      return;
    }
    
    // Merge the two result sets
    const mergedCategorySpending = [...categorySpendingData];
    
    for (const spending of directCategorySpending) {
      const existingIndex = mergedCategorySpending.findIndex(item => item.id === spending.id);
      
      if (existingIndex !== -1) {
        // Add to existing data
        mergedCategorySpending[existingIndex].total += spending.total;
      } else {
        // Add new data point
        mergedCategorySpending.push(spending);
      }
    }
    
    // Re-sort after merging
    mergedCategorySpending.sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
    
    // Format the result
    const result = {
      parentId: parentCategoryId,
      month,
      year,
      categories: mergedCategorySpending
    };
    
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
