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
}
