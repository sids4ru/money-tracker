# Finance Tracker

A React application for tracking finances with a SQLite database backend. This application allows users to import AIB bank transactions from CSV files, view and search transaction history, and perform basic financial analysis.

## Features

- Import AIB CSV bank transaction files with duplicate detection
- Persistent storage using SQLite database
- View all transactions in a sortable, searchable table
- Financial summary with totals for debits and credits
- RESTful API for transaction management
- Mobile-responsive design

## Project Structure

The project consists of two main parts:

1. **Frontend**: React application with TypeScript
2. **Backend**: Node.js/Express server with SQLite database

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
   This will start the server at http://localhost:5000

### Frontend Setup

1. From the project root directory, install dependencies:
   ```
   npm install
   ```

2. Start the React development server:
   ```
   npm start
   ```
   This will start the frontend at http://localhost:3000

## Usage

### Importing Transactions

1. Click on the "Import Transactions" button
2. Drag and drop your AIB CSV file or click to browse files
3. The application will automatically detect and skip duplicate transactions

### Viewing Transactions

- All imported transactions are displayed in the main table
- Click on column headers to sort transactions
- Use the search box to filter transactions
- Pagination controls are available at the bottom of the table

## Database

The application uses SQLite for data storage:

- The database file is stored in `server/data/finance_tracker.db`
- You can back up this file to transfer your data between machines
- SQLite is a portable, lightweight database that runs without a separate server process

## API Endpoints

The backend provides the following REST API endpoints:

- `GET /api/transactions` - Get all transactions
- `GET /api/transactions/:id` - Get a specific transaction
- `POST /api/transactions` - Create a new transaction
- `PUT /api/transactions/:id` - Update a transaction
- `DELETE /api/transactions/:id` - Delete a transaction
- `GET /api/transactions/search` - Search transactions
- `POST /api/transactions/import` - Import transactions from CSV file

## Future Enhancements

- Transaction categorization
- Budget tracking
- Data visualization and reports
- Multiple account support
