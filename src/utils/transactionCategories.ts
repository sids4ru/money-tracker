// Utility for categorizing transactions

type TransactionCategory = {
  id: string;
  name: string;
  parent?: string;
  keywords: string[];
};

// Transaction category definitions
export const categories: TransactionCategory[] = [
  // Main categories
  { id: 'earnings', name: 'Earnings', keywords: ['salary', 'income', 'payment received', 'dividends', 'interest received'] },
  { id: 'expenditures', name: 'Expenditures', keywords: [] }, // Parent category
  { id: 'savings', name: 'Savings', keywords: [] }, // Parent category
  
  // Savings subcategories
  { id: 'fd', name: 'Fixed Deposits', parent: 'savings', keywords: ['fixed deposit', 'fd', 'term deposit'] },
  { id: 'rd', name: 'Recurring Deposits', parent: 'savings', keywords: ['recurring deposit', 'rd'] },
  { id: 'savings_other', name: 'Other Savings', parent: 'savings', keywords: ['savings', 'investment'] },
  
  // Trading subcategories
  { id: 'etoro', name: 'eToro', parent: 'savings', keywords: ['etoro', 'e-toro'] },
  { id: 'trading121', name: 'Trading 121', parent: 'savings', keywords: ['trading 121', 'trading121'] },
  { id: 'trading_other', name: 'Other Trading', parent: 'savings', keywords: ['trading', 'stocks', 'shares', 'broker'] },
  
  // Expenditure subcategories
  { id: 'grocery', name: 'Grocery', parent: 'expenditures', keywords: ['tesco', 'aldi', 'lidl', 'supermarket', 'grocery'] },
  { id: 'entertainment', name: 'Entertainment', parent: 'expenditures', keywords: ['restaurant', 'cinema', 'theater', 'concert', 'pub', 'bar'] },
  { id: 'travel', name: 'Travel', parent: 'expenditures', keywords: ['ticket', 'flight', 'train', 'bus', 'taxi', 'uber', 'hotel'] },
  { id: 'utilities', name: 'Utilities', parent: 'expenditures', keywords: ['electric', 'gas', 'water', 'internet', 'phone', 'mobile'] },
  { id: 'expenditure_other', name: 'Other Expenditures', parent: 'expenditures', keywords: [] }
];

// Function to categorize a transaction
export const categorizeTransaction = (description: string): string => {
  // Convert to lowercase for case-insensitive comparison
  const lowerDesc = description.toLowerCase();
  
  // Try to match transaction to a specific category based on keywords
  for (const category of categories) {
    for (const keyword of category.keywords) {
      if (lowerDesc.includes(keyword.toLowerCase())) {
        return category.id;
      }
    }
  }
  
  // If no specific category matched, check if it's a debit or credit
  // This is just a fallback - you may want to refine this logic
  if (lowerDesc.includes('withdrawal') || lowerDesc.includes('payment')) {
    return 'expenditure_other';
  } else if (lowerDesc.includes('deposit') || lowerDesc.includes('credit')) {
    return 'earnings';
  }
  
  // Default fallback
  return 'uncategorized';
};

// Function to get all categories with their parents
export const getCategoryTree = () => {
  const mainCategories = categories.filter(c => !c.parent);
  
  return mainCategories.map(mainCat => {
    const children = categories.filter(c => c.parent === mainCat.id);
    return {
      ...mainCat,
      children
    };
  });
};

// Get all subcategories for a given parent
export const getSubcategories = (parentId: string) => {
  return categories.filter(c => c.parent === parentId);
};

// Get a category by ID
export const getCategoryById = (categoryId: string) => {
  return categories.find(c => c.id === categoryId);
};

// Get the parent category of a subcategory
export const getParentCategory = (categoryId: string) => {
  const category = categories.find(c => c.id === categoryId);
  if (category?.parent) {
    return categories.find(c => c.id === category.parent);
  }
  return null;
};
