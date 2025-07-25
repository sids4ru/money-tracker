# Finance Tracker API Reference

This document provides a comprehensive reference for the Finance Tracker REST API endpoints, including request formats, response schemas, and usage examples.

## Base URL

All API endpoints are relative to the base URL:
```
http://localhost:5001/api
```

## Authentication

The current version does not implement authentication as it is designed for personal use. Future versions will include authentication mechanisms.

## API Endpoints

### Transactions

#### Get All Transactions

Retrieves a paginated list of transactions with optional filtering.

**Endpoint**: `GET /transactions`

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)
- `search` (optional): Text search across description fields
- `startDate` (optional): Filter transactions after this date (YYYY-MM-DD)
- `endDate` (optional): Filter transactions before this date (YYYY-MM-DD)
- `category` (optional): Filter by category ID
- `sort` (optional): Field to sort by (default: transaction_date)
- `order` (optional): Sort order ('asc' or 'desc', default: 'desc')

**Response**:
```json
{
  "status": "success",
  "total": 250,
  "page": 1,
  "limit": 50,
  "data": [
    {
      "id": 1,
      "account_number": "12345678",
      "transaction_date": "2025-07-15",
      "description1": "PAYMENT",
      "description2": "ACME CORP",
      "description3": "Salary",
      "debit_amount": null,
      "credit_amount": "3000.00",
      "balance": "4500.00",
      "currency": "EUR",
      "transaction_type": "CREDIT",
      "category": {
        "id": 12,
        "name": "Salary",
        "parent_category": {
          "id": 3,
          "name": "Income"
        }
      },
      "grouping_status": "auto",
      "created_at": "2025-07-15T14:30:00.000Z"
    },
    // ... more transactions
  ]
}
```

#### Get Transaction by ID

Retrieves a single transaction by its ID.

**Endpoint**: `GET /transactions/:id`

**Response**:
```json
{
  "status": "success",
  "data": {
    "id": 1,
    "account_number": "12345678",
    "transaction_date": "2025-07-15",
    "description1": "PAYMENT",
    "description2": "ACME CORP",
    "description3": "Salary",
    "debit_amount": null,
    "credit_amount": "3000.00",
    "balance": "4500.00",
    "currency": "EUR",
    "transaction_type": "CREDIT",
    "category": {
      "id": 12,
      "name": "Salary",
      "parent_category": {
        "id": 3,
        "name": "Income"
      }
    },
    "grouping_status": "auto",
    "created_at": "2025-07-15T14:30:00.000Z"
  }
}
```

#### Create Transaction

Creates a new transaction record.

**Endpoint**: `POST /transactions`

**Request Body**:
```json
{
  "account_number": "12345678",
  "transaction_date": "2025-07-20",
  "description1": "GROCERY STORE",
  "description2": "LOCAL MARKET",
  "debit_amount": "45.67",
  "credit_amount": null,
  "balance": "4454.33",
  "currency": "EUR",
  "transaction_type": "DEBIT"
}
```

**Response**:
```json
{
  "status": "success",
  "data": {
    "id": 251,
    "account_number": "12345678",
    "transaction_date": "2025-07-20",
    "description1": "GROCERY STORE",
    "description2": "LOCAL MARKET",
    "description3": null,
    "debit_amount": "45.67",
    "credit_amount": null,
    "balance": "4454.33",
    "currency": "EUR",
    "transaction_type": "DEBIT",
    "category": null,
    "grouping_status": null,
    "created_at": "2025-07-25T14:32:10.000Z"
  }
}
```

#### Update Transaction

Updates an existing transaction.

**Endpoint**: `PUT /transactions/:id`

**Request Body**:
```json
{
  "description1": "GROCERY STORE UPDATED",
  "description2": "ORGANIC PRODUCE"
}
```

**Response**:
```json
{
  "status": "success",
  "data": {
    "id": 251,
    "account_number": "12345678",
    "transaction_date": "2025-07-20",
    "description1": "GROCERY STORE UPDATED",
    "description2": "ORGANIC PRODUCE",
    "description3": null,
    "debit_amount": "45.67",
    "credit_amount": null,
    "balance": "4454.33",
    "currency": "EUR",
    "transaction_type": "DEBIT",
    "category": null,
    "grouping_status": null,
    "created_at": "2025-07-25T14:32:10.000Z"
  }
}
```

#### Delete Transaction

Deletes a transaction.

**Endpoint**: `DELETE /transactions/:id`

**Response**:
```json
{
  "status": "success",
  "message": "Transaction deleted successfully"
}
```

#### Import Transactions from CSV

Imports transactions from a CSV file.

**Endpoint**: `POST /transactions/import`

**Request**: Multipart form data with:
- `file`: CSV file
- `importerCode` (optional): Specific importer code to use

**Response**:
```json
{
  "status": "success",
  "data": {
    "imported": 15,
    "duplicates": 3,
    "total": 18,
    "categorized": 10
  }
}
```

#### Assign Category to Transaction

Assigns a category to a transaction.

**Endpoint**: `PUT /transactions/:id/category`

**Request Body**:
```json
{
  "categoryId": 5,
  "applyToSimilar": true
}
```

**Response**:
```json
{
  "status": "success",
  "data": {
    "transaction": {
      "id": 251,
      "category": {
        "id": 5,
        "name": "Groceries",
        "parent_category": {
          "id": 2,
          "name": "Food & Dining"
        }
      },
      "grouping_status": "manual"
    },
    "similarTransactions": {
      "count": 3,
      "ids": [252, 255, 260]
    }
  }
}
```

### Categories

#### Get All Categories

Retrieves all categories with their parent categories.

**Endpoint**: `GET /categories`

**Response**:
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "name": "Rent",
      "description": "Monthly rent payment",
      "parent_category": {
        "id": 1,
        "name": "Housing"
      },
      "created_at": "2025-01-01T00:00:00.000Z"
    },
    {
      "id": 2,
      "name": "Mortgage",
      "description": "Mortgage payments",
      "parent_category": {
        "id": 1,
        "name": "Housing"
      },
      "created_at": "2025-01-01T00:00:00.000Z"
    },
    // ... more categories
  ]
}
```

#### Get Parent Categories

Retrieves all parent categories.

**Endpoint**: `GET /categories/parents`

**Response**:
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "name": "Housing",
      "description": "Housing and accommodation expenses",
      "created_at": "2025-01-01T00:00:00.000Z"
    },
    {
      "id": 2,
      "name": "Food & Dining",
      "description": "Food and dining expenses",
      "created_at": "2025-01-01T00:00:00.000Z"
    },
    // ... more parent categories
  ]
}
```

#### Create Category

Creates a new category.

**Endpoint**: `POST /categories`

**Request Body**:
```json
{
  "name": "Internet",
  "description": "Internet service provider fees",
  "parentId": 4
}
```

**Response**:
```json
{
  "status": "success",
  "data": {
    "id": 25,
    "name": "Internet",
    "description": "Internet service provider fees",
    "parent_category": {
      "id": 4,
      "name": "Utilities"
    },
    "created_at": "2025-07-25T14:35:20.000Z"
  }
}
```

#### Update Category

Updates an existing category.

**Endpoint**: `PUT /categories/:id`

**Request Body**:
```json
{
  "name": "Internet & TV",
  "description": "Internet and television services"
}
```

**Response**:
```json
{
  "status": "success",
  "data": {
    "id": 25,
    "name": "Internet & TV",
    "description": "Internet and television services",
    "parent_category": {
      "id": 4,
      "name": "Utilities"
    },
    "created_at": "2025-07-25T14:35:20.000Z"
  }
}
```

#### Delete Category

Deletes a category.

**Endpoint**: `DELETE /categories/:id`

**Response**:
```json
{
  "status": "success",
  "message": "Category deleted successfully"
}
```

### Analysis

#### Get Category Spending

Retrieves spending by category for a specific date range.

**Endpoint**: `GET /analysis/category-spending`

**Query Parameters**:
- `startDate` (required): Start date (YYYY-MM-DD)
- `endDate` (required): End date (YYYY-MM-DD)
- `parentCategoryId` (optional): Filter by parent category

**Response**:
```json
{
  "status": "success",
  "data": {
    "categories": [
      {
        "category_id": 5,
        "category_name": "Groceries",
        "parent_category_id": 2,
        "parent_category_name": "Food & Dining",
        "total_amount": 453.21
      },
      {
        "category_id": 6,
        "category_name": "Restaurants",
        "parent_category_id": 2,
        "parent_category_name": "Food & Dining",
        "total_amount": 178.45
      },
      // ... more categories
    ],
    "total": 2450.67
  }
}
```

#### Get Monthly Spending

Retrieves spending by month.

**Endpoint**: `GET /analysis/monthly-spending`

**Query Parameters**:
- `year` (required): Year to analyze
- `parentCategoryId` (optional): Filter by parent category

**Response**:
```json
{
  "status": "success",
  "data": [
    {
      "month": 1,
      "month_name": "January",
      "total_amount": 2345.67
    },
    {
      "month": 2,
      "month_name": "February",
      "total_amount": 2156.89
    },
    // ... more months
  ]
}
```

#### Get Category Trends

Retrieves spending trends by category over time.

**Endpoint**: `GET /analysis/category-trends`

**Query Parameters**:
- `startDate` (required): Start date (YYYY-MM-DD)
- `endDate` (required): End date (YYYY-MM-DD)
- `interval` (required): Interval for grouping ('day', 'week', 'month')
- `categoryIds` (optional): Comma-separated list of category IDs

**Response**:
```json
{
  "status": "success",
  "data": [
    {
      "interval": "2025-01",
      "label": "Jan 2025",
      "categories": {
        "5": 156.78,
        "6": 89.45
      },
      "total": 246.23
    },
    {
      "interval": "2025-02",
      "label": "Feb 2025",
      "categories": {
        "5": 178.34,
        "6": 92.56
      },
      "total": 270.90
    },
    // ... more intervals
  ]
}
```

### Import System

#### Get Available Importers

Retrieves the list of available transaction importers.

**Endpoint**: `GET /importers`

**Response**:
```json
{
  "status": "success",
  "data": [
    {
      "code": "aib-importer",
      "name": "AIB Bank",
      "description": "Imports transactions from Allied Irish Bank CSV exports",
      "supportedFileTypes": [".csv"]
    },
    {
      "code": "revolute-importer",
      "name": "Revolut",
      "description": "Imports transactions from Revolut CSV exports",
      "supportedFileTypes": [".csv"]
    }
    // ... more importers
  ]
}
```

#### Auto-Detect Importer for File

Detects the appropriate importer for a CSV file based on its contents.

**Endpoint**: `POST /importers/detect`

**Request**: Multipart form data with:
- `file`: CSV file

**Response**:
```json
{
  "status": "success",
  "data": {
    "importerCode": "aib-importer",
    "importerName": "AIB Bank",
    "confidence": 0.95
  }
}
```

### Transaction Similarity Patterns

#### Get All Patterns

Retrieves all transaction similarity patterns.

**Endpoint**: `GET /patterns`

**Response**:
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "pattern_type": "contains",
      "pattern_value": "STARBUCKS",
      "category": {
        "id": 8,
        "name": "Coffee Shops",
        "parent_category": {
          "id": 2,
          "name": "Food & Dining"
        }
      },
      "confidence_score": 0.95,
      "usage_count": 12,
      "created_at": "2025-03-15T10:30:00.000Z"
    },
    // ... more patterns
  ]
}
```

#### Create Pattern

Creates a new similarity pattern.

**Endpoint**: `POST /patterns`

**Request Body**:
```json
{
  "pattern_type": "contains",
  "pattern_value": "AMAZON",
  "category_id": 15,
  "confidence_score": 0.8
}
```

**Response**:
```json
{
  "status": "success",
  "data": {
    "id": 25,
    "pattern_type": "contains",
    "pattern_value": "AMAZON",
    "category": {
      "id": 15,
      "name": "Online Shopping",
      "parent_category": {
        "id": 5,
        "name": "Shopping"
      }
    },
    "confidence_score": 0.8,
    "usage_count": 0,
    "created_at": "2025-07-25T14:40:00.000Z"
  }
}
```

#### Update Pattern

Updates an existing pattern.

**Endpoint**: `PUT /patterns/:id`

**Request Body**:
```json
{
  "confidence_score": 0.9,
  "category_id": 16
}
```

**Response**:
```json
{
  "status": "success",
  "data": {
    "id": 25,
    "pattern_type": "contains",
    "pattern_value": "AMAZON",
    "category": {
      "id": 16,
      "name": "Electronics",
      "parent_category": {
        "id": 5,
        "name": "Shopping"
      }
    },
    "confidence_score": 0.9,
    "usage_count": 0,
    "created_at": "2025-07-25T14:40:00.000Z"
  }
}
```

#### Delete Pattern

Deletes a pattern.

**Endpoint**: `DELETE /patterns/:id`

**Response**:
```json
{
  "status": "success",
  "message": "Pattern deleted successfully"
}
```

## Error Handling

All API endpoints use consistent error handling:

```json
{
  "status": "error",
  "message": "Error description",
  "details": {
    // Optional additional error details
  }
}
```

Common HTTP status codes:

- `200 OK`: Request succeeded
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request parameters
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

## Rate Limiting

The current version does not implement rate limiting. Future versions may include rate limiting for production deployments.

## Versioning

The current API version is v1 (implicit in the base URL). Future versions will be explicitly versioned (e.g., `/api/v2/`).

## API Usage Examples

### Example 1: Import transactions and categorize them

1. Import transactions:
```bash
curl -X POST http://localhost:5001/api/transactions/import \
  -H "Content-Type: multipart/form-data" \
  -F "file=@transactions.csv"
```

2. Auto-detect categories for uncategorized transactions:
```bash
curl -X POST http://localhost:5001/api/transactions/auto-categorize
```

3. Get a summary of category spending:
```bash
curl -X GET "http://localhost:5001/api/analysis/category-spending?startDate=2025-01-01&endDate=2025-07-25"
```

### Example 2: Create a new category and update a transaction

1. Create a new category:
```bash
curl -X POST http://localhost:5001/api/categories \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Public Transportation",
    "description": "Bus, train, and subway expenses",
    "parentId": 3
  }'
```

2. Assign the new category to a transaction:
```bash
curl -X PUT http://localhost:5001/api/transactions/123/category \
  -H "Content-Type: application/json" \
  -d '{
    "categoryId": 26,
    "applyToSimilar": true
  }'
```

## Conclusion

This API reference documents the current endpoints available in the Finance Tracker application. The API provides comprehensive functionality for managing transactions, categories, and financial analysis, with a focus on data integrity and usability.

As the application evolves, additional endpoints may be added to support new features such as budgeting, multi-account management, and user authentication.
