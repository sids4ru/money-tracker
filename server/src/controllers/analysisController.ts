import { Request, Response } from 'express';
import { query } from '../database/db';
import { ParentCategoryModel } from '../models/ParentCategory';

/**
 * Get spending by parent category per month for a year
 */
export const getSpendingByParentCategoryPerMonth = async (req: Request, res: Response): Promise<void> => {
  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    // Always include daily data regardless of year when includeDaily is true
    const includeDaily = (req.query.includeDaily === 'true');
    // Use the specified month (defaults to current month)
    const selectedMonth = parseInt(req.query.currentMonth as string) || new Date().getMonth() + 1; // 1-based month
    const isCurrentYear = year === new Date().getFullYear();
    
    // Get all parent categories
    const parentCategories = await ParentCategoryModel.getAll();
    
    // Initialize result structure
    const result: {
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
      currentMonth?: number;
      isCurrentYear?: boolean;
    } = {
      months: [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ],
      categories: parentCategories.map(cat => ({
        id: cat.id!,
        name: cat.name,
        data: Array(12).fill(0) // Initialize with zeros for 12 months
      })),
      currentMonth: selectedMonth,
      isCurrentYear: isCurrentYear
    };
    
    // Add debug info
    console.log(`Fetching spending data for year: ${year}`);
    
    // SQL query to get monthly spending by parent category
    // Use a CTE to combine both data sources and aggregate properly to avoid duplicates
    const monthlySpendingData = await query<{
      parent_id: number;
      month: number; // 1-based month
      total: number;
    }>(`
      WITH MonthlyTransactions AS (
        -- Get transactions from transaction_categories table
        SELECT 
          COALESCE(tc.parent_category_id, c.parent_id) as parent_id,
          CAST(substr(t.transaction_date, 6, 2) AS INTEGER) AS month,
          CASE
            WHEN t.debit_amount IS NOT NULL THEN -CAST(REPLACE(t.debit_amount, ',', '') AS REAL)
            WHEN t.credit_amount IS NOT NULL THEN CAST(REPLACE(t.credit_amount, ',', '') AS REAL)
            ELSE 0
          END AS amount
        FROM 
          transaction_categories tc
        JOIN
          transactions t ON tc.transaction_id = t.id  
        JOIN
          categories c ON tc.category_id = c.id
        WHERE 
          substr(t.transaction_date, 1, 4) = ? 
          AND (tc.parent_category_id IS NOT NULL OR c.parent_id IS NOT NULL)
        
        UNION ALL
        
        -- Get transactions with direct category_id assignments
        SELECT 
          c.parent_id,
          CAST(substr(t.transaction_date, 6, 2) AS INTEGER) AS month,
          CASE
            WHEN t.debit_amount IS NOT NULL THEN -CAST(REPLACE(t.debit_amount, ',', '') AS REAL)
            WHEN t.credit_amount IS NOT NULL THEN CAST(REPLACE(t.credit_amount, ',', '') AS REAL)
            ELSE 0
          END AS amount
        FROM 
          transactions t
        JOIN 
          categories c ON t.category_id = c.id
        WHERE 
          substr(t.transaction_date, 1, 4) = ? 
          AND c.parent_id IS NOT NULL
          AND t.category_id IS NOT NULL
      )
      -- Now aggregate by parent_id and month
      SELECT 
        parent_id,
        month,
        SUM(amount) AS total
      FROM 
        MonthlyTransactions
      WHERE parent_id IS NOT NULL
      GROUP BY 
        parent_id, month
      ORDER BY 
        parent_id, month
    `, [year.toString(), year.toString()]);
    
    console.log(`Monthly spending data retrieved: ${monthlySpendingData.length} records`);
    console.log(`Monthly spending data: ${JSON.stringify(monthlySpendingData)}`);
    
    // Return empty data if no transactions are found
    if (monthlySpendingData.length === 0) {
      console.log("No spending data found for the specified year");
      
      res.json({
        success: true,
        data: result
      });
      return;
    }
    
    // Process the SQL results into our result structure
    for (const spending of monthlySpendingData) {
      const categoryIndex = result.categories.findIndex(cat => cat.id === spending.parent_id);
      if (categoryIndex !== -1) {
        // Month is 1-based in SQL result, but 0-based in our array
        result.categories[categoryIndex].data[spending.month - 1] = spending.total;
      }
    }
    
    // If we need to include daily data for the selected month
    if (includeDaily) {
      // Calculate days in the selected month
      const daysInMonth = new Date(year, selectedMonth, 0).getDate();
      
      // For each category, fetch daily spending for the selected month
      for (let i = 0; i < result.categories.length; i++) {
        const category = result.categories[i];
        
        // Initialize daily data structure with the correct number of days in the month
        category.dailyData = {
          days: Array.from({ length: daysInMonth }, (_, index) => `${index + 1}`),
          values: Array(daysInMonth).fill(0)
        };
        
        // Always generate daily data structure, even if values will be zero
        
        // Fetch daily spending for this parent category for the selected month
        // Note: transaction_date is in DD/MM/YYYY format, so we extract day differently
        const dailySpendingData = await query<{
          parent_id: number;
          day: number; // Day of month (1-31)
          total: number;
        }>(`
          WITH DailyTransactions AS (
            -- Get transactions from transaction_categories
            SELECT 
              COALESCE(tc.parent_category_id, c.parent_id) as parent_id,
              CAST(substr(t.transaction_date, 9, 2) AS INTEGER) AS day,
              CASE
                WHEN t.debit_amount IS NOT NULL THEN -CAST(REPLACE(t.debit_amount, ',', '') AS REAL)
                WHEN t.credit_amount IS NOT NULL THEN CAST(REPLACE(t.credit_amount, ',', '') AS REAL)
                ELSE 0
              END AS amount
            FROM 
              transaction_categories tc
            JOIN
              transactions t ON tc.transaction_id = t.id  
            JOIN
              categories c ON tc.category_id = c.id
            WHERE 
              substr(t.transaction_date, 1, 4) = ? 
              AND substr(t.transaction_date, 6, 2) = ?
              AND (tc.parent_category_id = ? OR (tc.parent_category_id IS NULL AND c.parent_id = ?))
            
            UNION ALL
            
            -- Get transactions with direct category_id
            SELECT 
              c.parent_id,
              CAST(substr(t.transaction_date, 9, 2) AS INTEGER) AS day,
              CASE
                WHEN t.debit_amount IS NOT NULL THEN -CAST(REPLACE(t.debit_amount, ',', '') AS REAL)
                WHEN t.credit_amount IS NOT NULL THEN CAST(REPLACE(t.credit_amount, ',', '') AS REAL)
                ELSE 0
              END AS amount
            FROM 
              transactions t
            JOIN 
              categories c ON t.category_id = c.id
            WHERE 
              substr(t.transaction_date, 1, 4) = ? 
              AND substr(t.transaction_date, 6, 2) = ?
              AND c.parent_id = ?
              AND t.category_id IS NOT NULL
          )
          
          -- Sum up by day
          SELECT 
            parent_id,
            day,
            SUM(amount) AS total
          FROM 
            DailyTransactions
          GROUP BY 
            parent_id, day
          ORDER BY 
            day
        `, [
          year.toString(), 
          selectedMonth.toString().padStart(2, '0'),
          category.id,
          category.id, // Added parameter for the additional condition
          year.toString(),
          selectedMonth.toString().padStart(2, '0'),
          category.id
        ]);
        
        // Process daily spending data
        if (dailySpendingData.length > 0) {
          for (const dailySpending of dailySpendingData) {
            // Day is 1-based in SQL result and also 1-based in our array (day 1 is index 0)
            const dayIndex = dailySpending.day - 1;
            if (dayIndex >= 0 && dayIndex < daysInMonth) {
              category.dailyData.values[dayIndex] = dailySpending.total;
            }
          }
          
          console.log(`Daily spending data for category ${category.name}: ${JSON.stringify(category.dailyData)}`);
        }
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
    
    // Use a CTE (Common Table Expression) to handle both cases in a single query
    const categorySpendingData = await query<{
      id: number;
      name: string;
      total: number;
    }>(`
      WITH CategoryTransactions AS (
        -- Get transactions from transaction_categories
        SELECT 
          c.id,
          c.name,
          CASE
            WHEN t.debit_amount IS NOT NULL THEN -CAST(REPLACE(t.debit_amount, ',', '') AS REAL)
            WHEN t.credit_amount IS NOT NULL THEN CAST(REPLACE(t.credit_amount, ',', '') AS REAL)
            ELSE 0
          END AS amount
        FROM 
          categories c
        JOIN 
          transaction_categories tc ON c.id = tc.category_id
        JOIN 
          transactions t ON tc.transaction_id = t.id
        WHERE 
          tc.parent_category_id = ?
          AND substr(t.transaction_date, 1, 4) = ? AND substr(t.transaction_date, 6, 2) = ?
        
        UNION ALL
        
        -- Get transactions with direct category_id
        SELECT 
          c.id,
          c.name,
          CASE
            WHEN t.debit_amount IS NOT NULL THEN -CAST(REPLACE(t.debit_amount, ',', '') AS REAL)
            WHEN t.credit_amount IS NOT NULL THEN CAST(REPLACE(t.credit_amount, ',', '') AS REAL)
            ELSE 0
          END AS amount
        FROM 
          categories c
        JOIN 
          transactions t ON c.id = t.category_id
        WHERE 
          c.parent_id = ?
          AND substr(t.transaction_date, 1, 4) = ? AND substr(t.transaction_date, 6, 2) = ?
          AND t.category_id IS NOT NULL
      )
      
      -- Sum up the amounts by category
      SELECT 
        id,
        name,
        SUM(amount) AS total
      FROM 
        CategoryTransactions
      GROUP BY 
        id, name
      ORDER BY 
        ABS(SUM(amount)) DESC;
    `, [parentCategoryId, year.toString(), monthFormatted, parentCategoryId, year.toString(), monthFormatted]);
    
    console.log(`Category spending data from combined query: ${JSON.stringify(categorySpendingData)}`);
    
    // Return empty data if no transactions are found - don't generate random data
    if (categorySpendingData.length === 0) {
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
    
    // Format the result
    const result = {
      parentId: parentCategoryId,
      month,
      year,
      categories: categorySpendingData
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
