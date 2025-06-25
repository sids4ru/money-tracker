// Utility for categorizing transactions using database categories
import { CategoryService, Category } from '../services/categoryApi';

// Modified type to match database structure but keep compatibility
export type TransactionCategory = {
  id: string | number;
  name: string;
  parent?: string | number | null;
  keywords?: string[];
  parent_id?: number | null;
};

// This will store the categories once loaded from database
let dbCategories: TransactionCategory[] = [];
let dbCategoriesLoaded = false;

// Common financial keywords to help with categorization when needed
const commonKeywordsByCategory: Record<string, string[]> = {
  'earnings': ['salary', 'income', 'payment received', 'dividends', 'interest received', 'revenue'],
  'expenditures': ['payment', 'bill', 'purchase'],
  'savings': ['savings', 'investment', 'deposit'],
  'grocery': ['tesco', 'aldi', 'lidl', 'supermarket', 'grocery'],
  'entertainment': ['restaurant', 'cinema', 'theater', 'concert', 'pub', 'bar'],
  'travel': ['ticket', 'flight', 'train', 'bus', 'taxi', 'uber', 'hotel'],
  'utilities': ['electric', 'gas', 'water', 'internet', 'phone', 'mobile']
};

// Load categories from database
export const loadCategoriesFromDb = async (): Promise<TransactionCategory[]> => {
  if (!dbCategoriesLoaded) {
    try {
      const response = await CategoryService.getAllCategories();
      if (response && Array.isArray(response)) {
        // Convert DB categories to our format
        dbCategories = response.map((cat: Category) => ({
          id: cat.id || 0,
          name: cat.name,
          parent_id: cat.parent_id,
          // Map parent_id to parent for backward compatibility
          parent: cat.parent_id ? String(cat.parent_id) : undefined,
          // Assign common keywords if we have them for this category name
          keywords: getKeywordsForCategory(cat.name)
        }));
        
        dbCategoriesLoaded = true;
        console.log(`Loaded ${dbCategories.length} categories from database`);
      }
    } catch (error) {
      console.error('Error loading categories from DB:', error);
      // Fallback to empty categories if DB load fails
      dbCategories = [];
    }
  }
  
  return dbCategories;
};

// Helper to get keywords for a category based on the name
const getKeywordsForCategory = (name: string): string[] => {
  const lowerName = name.toLowerCase();
  
  // See if we have predefined keywords for this category
  for (const [category, keywords] of Object.entries(commonKeywordsByCategory)) {
    if (lowerName.includes(category.toLowerCase())) {
      return keywords;
    }
  }
  
  // Default keywords based on category name itself
  return [name.toLowerCase()]; 
};

// For backwards compatibility - returns categories (loads from DB if not loaded)
export const getCategories = async (): Promise<TransactionCategory[]> => {
  if (!dbCategoriesLoaded) {
    await loadCategoriesFromDb();
  }
  return dbCategories;
};

// Function to categorize a transaction - now works with DB categories
export const categorizeTransaction = async (description: string): Promise<string | number> => {
  // Ensure categories are loaded
  const categories = await getCategories();
  
  // Convert to lowercase for case-insensitive comparison
  const lowerDesc = description.toLowerCase();
  
  // Try to match transaction to a specific category based on keywords
  for (const category of categories) {
    if (category.keywords) {
      for (const keyword of category.keywords) {
        if (lowerDesc.includes(keyword.toLowerCase())) {
          return category.id;
        }
      }
    }
  }
  
  // If no specific category matched, check if it's a debit or credit
  if (lowerDesc.includes('withdrawal') || lowerDesc.includes('payment')) {
    // Find the default expenditure category
    const expenditureCategory = categories.find(c => 
      c.name.toLowerCase().includes('expenditure') || c.name.toLowerCase().includes('expense')
    );
    return expenditureCategory?.id || 'uncategorized';
  } else if (lowerDesc.includes('deposit') || lowerDesc.includes('credit')) {
    // Find the default earnings category
    const earningsCategory = categories.find(c => 
      c.name.toLowerCase().includes('earning') || c.name.toLowerCase().includes('income')
    );
    return earningsCategory?.id || 'uncategorized';
  }
  
  // Default fallback
  return 'uncategorized';
};

// Function to get all categories with their parents - now works with DB categories
export const getCategoryTree = async () => {
  const allCategories = await getCategories();
  const mainCategories = allCategories.filter(c => !c.parent_id && !c.parent);
  
  return mainCategories.map(mainCat => {
    const children = allCategories.filter(c => 
      c.parent_id === mainCat.id || c.parent === mainCat.id
    );
    return {
      ...mainCat,
      children
    };
  });
};

// Get all subcategories for a given parent
export const getSubcategories = async (parentId: string | number) => {
  const allCategories = await getCategories();
  return allCategories.filter(c => 
    c.parent_id === parentId || c.parent === parentId
  );
};

// Get a category by ID
export const getCategoryById = async (categoryId: string | number) => {
  const allCategories = await getCategories();
  return allCategories.find(c => String(c.id) === String(categoryId));
};

// Get the parent category of a subcategory
export const getParentCategory = async (categoryId: string | number) => {
  const allCategories = await getCategories();
  const category = allCategories.find(c => String(c.id) === String(categoryId));
  
  if (category?.parent_id || category?.parent) {
    const parentId = category.parent_id || category.parent;
    return allCategories.find(c => String(c.id) === String(parentId));
  }
  return null;
};
