export interface Transaction {
  id?: number;
  accountNumber: string;
  date: string;
  description1: string;
  description2: string;
  description3: string;
  debitAmount: string | null;
  creditAmount: string | null;
  balance: string;
  currency: string;
  transactionType: string;
  localCurrencyAmount: string;
  localCurrency: string;
  description?: string; // Computed field for easier handling
  groupingStatus?: 'manual' | 'auto' | 'none'; // Status of transaction grouping
  categoryId?: number; // ID of the assigned category
  transactionCategoryId?: number; // ID of the transaction_categories entry
}

export interface CategoryInfo {
  id: number;
  name: string;
  description?: string;
  parentId?: number;
  parentName?: string;
}
