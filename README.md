# Finance Tracker

A React application for tracking finances with a SQLite database backend. This application allows users to import AIB bank transactions from CSV files, view and search transaction history, and perform basic financial analysis.

## Features

- **CSV Import**: Import AIB bank transaction exports with automatic format detection
- **Duplicate Detection**: System automatically recognizes and prevents duplicate transactions
- **Transaction Display**: Comprehensive table with transaction details and account balance
- **Search & Filtering**: Full-text search across all transaction fields
- **Sorting**: Sort by any column including date, amount, and balance
- **Pagination**: Browse through transactions with configurable page sizes
- **Transaction Categorization**: Assign categories to transactions for better organization
- **Apply to Similar Transactions**: Automatically categorize similar transactions
- **Financial Reports**: View charts and breakdowns by category
- **Summary Statistics**: View total debits, credits and overall transaction count
- **Mobile-Responsive UI**: Adapts to different screen sizes

## Project Structure

The project is organized into two main components:

### Backend (Server)
- **Technology**: Node.js/Express with TypeScript
- **Database**: SQLite for portable, file-based storage
- **API**: RESTful endpoints for transaction management
- **Directory**: `/server` contains all backend code

### Frontend
- **Framework**: React with TypeScript
- **UI Library**: Material UI components
- **State Management**: React hooks for local state management
- **Directory**: Root level except `/server` contains frontend code

### Key Files and Directories
- `/server/src/database/db.ts` - Database connection and initialization
- `/server/src/models/Transaction.ts` - Transaction model and database operations
- `/server/src/controllers/transactionController.ts` - API endpoint handlers
- `/src/components/TransactionList.tsx` - Main transaction display component
- `/src/components/ImportCSV.tsx` - CSV import component
- `/src/services/api.ts` - API client for backend communication

## Setup and Installation

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Backend Setup

1. Navigate to the server directory:
   ```
   cd server
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the server in development mode:
   ```
   npm run dev
   ```
   This will start the server at http://localhost:5001

### Frontend Setup

1. From the project root directory, install dependencies:
   ```
   npm install
   ```

2. Start the React development server:
   ```
   npm start
   ```
   This will start the frontend at http://localhost:3002 (or another available port)

## Usage

### Importing Transactions

1. Click on the "Import Transactions" button
2. Drag and drop your AIB CSV file or click to browse files
3. The application will automatically detect and skip duplicate transactions
4. A summary will display how many new transactions were added and how many duplicates were skipped

### Viewing and Managing Transactions

- **Sorting**: Click on any column header to sort transactions (ascending or descending)
- **Searching**: Use the search box to filter transactions by any field
- **Pagination**: Navigate between pages using controls at the bottom
- **Balance Tracking**: View running account balance for each transaction

### Enhancements to Balance Column

- The balance column now displays the account balance at the time of each transaction
- Transactions can be sorted by balance to identify high and low points
- The balance column is properly formatted with currency symbol

## Technical Implementation Details

### Database Schema

The SQLite database uses the following schema for transactions:
```
CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_number TEXT NOT NULL,
  transaction_date TEXT NOT NULL,
  description1 TEXT,
  description2 TEXT,
  description3 TEXT,
  debit_amount TEXT,
  credit_amount TEXT,
  balance TEXT NOT NULL,
  currency TEXT NOT NULL,
  transaction_type TEXT NOT NULL,
  local_currency_amount TEXT,
  local_currency TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)
```

### API Endpoints

The backend provides the following REST API endpoints:

- `GET /api/transactions` - Get all transactions
- `GET /api/transactions/:id` - Get a specific transaction
- `POST /api/transactions` - Create a new transaction
- `PUT /api/transactions/:id` - Update a transaction
- `DELETE /api/transactions/:id` - Delete a transaction
- `GET /api/transactions/search` - Search transactions with various criteria
- `POST /api/transactions/import` - Import transactions from CSV file

### Version Control

The project uses Git for version control:
- `.gitignore` configured to exclude node_modules, database files, and other temporary files
- Organized commit structure for tracking changes

## Current Status

The application now includes:
- Transaction categorization system with parent/child category support
- Visual data presentation with multiple chart types (bar, pie, line)
- Financial analysis by month, category, and trends
- Auto-categorization of similar transactions

## Pending Features

1. **Transaction Categorization Improvements**:
   - ✅ Skip already categorized transactions (both manual and auto) when using "Apply to similar transactions" feature
   - ✅ Remove hard-coded categories in category page and make the system more dynamic
   - Add feature to persist auto-categorization rules using a similarity table
   - Create UI for the similarity table in the settings page

2. **Data Analysis Enhancements**:
   - Add budget tracking with goals by category
   - Improve visualization options for financial insights
   - Add custom date range selection for reports

## Future Enhancements

- **Recurring Transaction Detection**: Identify regular payments and subscriptions
- **Multiple Account Support**: Track transactions across different bank accounts
- **Export Functionality**: Export transaction data in various formats
- **Authentication**: User accounts and authentication for multi-user support

## License

This project is open-source software licensed under the MIT license.
