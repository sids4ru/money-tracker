# Finance Tracker Database Schema - ER Diagram

```
+---------------+       +------------------------+       +---------------+
|  categories   |       | transaction_categories |       | transactions  |
+---------------+       +------------------------+       +---------------+
| id (PK)       |       | id (PK)                |       | id (PK)       |
| name          |<----->| category_id (FK)       |<----->| account_number|
| parent_id (FK)|       | transaction_id (FK)    |       | transaction_date
| description   |       | created_at             |       | description1  |
| created_at    |       +------------------------+       | description2  |
+---------------+                                        | description3  |
      ^                                                  | debit_amount  |
      |                                                  | credit_amount |
      +------------------------------------------------>| balance       |
                 parent-child relationship               | currency      |
                                                         | transaction_type
                                                         | grouping_status
                                                         | category_id   |
                                                         | created_at    |
                                                         +---------------+
```

## Schema Details

### transactions
- **id**: Primary key
- **account_number**: Account identifier
- **transaction_date**: Date of transaction
- **description1, description2, description3**: Transaction description fields
- **debit_amount**: Amount debited (outgoing)
- **credit_amount**: Amount credited (incoming)
- **balance**: Account balance after transaction
- **currency**: Currency code
- **transaction_type**: Type of transaction
- **grouping_status**: Status of categorization ('manual', 'auto', 'none')
- **category_id**: Direct reference to category (legacy/redundant field)
- **created_at**: Record creation timestamp

### categories
- **id**: Primary key
- **name**: Category name (unique)
- **parent_id**: Foreign key to parent category (self-referential for hierarchy)
- **description**: Category description
- **created_at**: Record creation timestamp

### transaction_categories
- **id**: Primary key
- **transaction_id**: Foreign key to transactions
- **category_id**: Foreign key to categories
- **created_at**: Record creation timestamp
- **UNIQUE(transaction_id, category_id)**: Prevents duplicate category assignments

## Implementation Notes

1. The database uses a junction table `transaction_categories` to implement a many-to-many relationship between transactions and categories.

2. There is also a direct `category_id` field in the transactions table that appears to be redundant with the junction table.

3. Categories have a hierarchical structure with parent-child relationships (self-reference).

4. The `grouping_status` field in transactions tracks whether categorization was done manually or automatically.

## Current Issue

Currently, a transaction can be assigned multiple categories through the `transaction_categories` junction table, which causes inconsistent behavior:

- The SQL query showing that multiple categories are assigned to some transactions:
  ```sql
  SELECT transaction_id, COUNT(*) as category_count 
  FROM transaction_categories 
  GROUP BY transaction_id 
  HAVING category_count > 1
  ```

- Example for transaction_id 105:
  ```
  105|*MOBI REVOLUTE|400.00||auto|8|Fixed Deposits
  105|*MOBI REVOLUTE|400.00||auto|17|School
  105|*MOBI REVOLUTE|400.00||auto|22|REVOLUTE
  ```

The business rule is that each transaction should have only ONE category.
