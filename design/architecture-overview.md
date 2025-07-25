# Finance Tracker Architecture Overview

This document provides a high-level architectural overview of the Finance Tracker application, explaining how different components interact to create a complete personal finance management solution.

## System Architecture

The Finance Tracker follows a client-server architecture with clear separation of concerns:

```mermaid
graph TD
    A[User] -->|Interacts with| B[React Frontend]
    B -->|API Requests| C[Express Backend]
    C -->|Queries| D[SQLite Database]
    C -->|File Operations| E[CSV Import/Export]
    
    subgraph "Client Layer"
    B
    end
    
    subgraph "Server Layer"
    C
    E
    end
    
    subgraph "Data Layer"
    D
    end
```

### Key Architectural Principles

1. **Separation of Concerns**: Clear division between frontend (UI/UX), backend (business logic), and data storage
2. **RESTful API Design**: Standardized communication between client and server
3. **Pluggable Components**: Modular design for extensibility (e.g., bank importers)
4. **Single Responsibility**: Each component has a focused purpose
5. **DRY (Don't Repeat Yourself)**: Reusable code and abstractions throughout the codebase

## Frontend Architecture

The frontend follows a component-based architecture using React with TypeScript:

```mermaid
graph TD
    A[App.tsx] --> B[Route Configuration]
    B --> C[Pages]
    C --> D[Components]
    D --> E[API Services]
    E --> F[Backend API]
    
    C --> G[State Management]
    D --> G
    G --> E
    
    subgraph "UI Layer"
    A
    B
    C
    D
    end
    
    subgraph "Service Layer"
    E
    G
    end
```

### Key Frontend Components

1. **Pages**: Container components representing entire views
   - `TransactionsPage.tsx`: Main transaction listing and management
   - `AnalysisPage.tsx`: Financial analysis and visualization
   - `SettingsPage.tsx`: Application configuration
   - `GroupedTransactionsPage.tsx`: Transactions grouped by categories

2. **Components**: Reusable UI elements
   - `TransactionList.tsx`: Displays transaction data in tabular format
   - `ImportCSV.tsx`: Handles file upload and import
   - `CategoryAssignmentDialog.tsx`: UI for categorizing transactions
   - Charts: Visualization components for financial data

3. **Services**: API communication layer
   - `api.ts`: Core API service
   - `categoryApi.ts`: Category-related operations
   - `analysisApi.ts`: Financial analysis operations
   - `db.ts`: Local storage utilities

4. **State Management**: Using React hooks and context for state management
   - Component-level state for UI-specific concerns
   - Context for shared state (categories, filters, etc.)
   - Custom hooks for reusable logic

## Backend Architecture

The backend follows an Express-based architecture with a modular structure:

```mermaid
graph TD
    A[Express Application] --> B[Routes]
    B --> C[Controllers]
    C --> D[Models]
    D --> E[Database]
    
    C --> F[Utilities]
    C --> G[Importers]
    G --> D
    
    subgraph "API Layer"
    A
    B
    end
    
    subgraph "Business Logic Layer"
    C
    F
    G
    end
    
    subgraph "Data Access Layer"
    D
    end
    
    subgraph "Storage Layer"
    E
    end
```

### Key Backend Components

1. **Routes**: API endpoint definitions
   - `transactionRoutes.ts`: Transaction CRUD operations
   - `categoryRoutes.ts`: Category management
   - `analysisRoutes.ts`: Financial analysis endpoints

2. **Controllers**: Business logic implementation
   - `transactionController.ts`: Transaction operations
   - `categoryController.ts`: Category operations
   - `analysisController.ts`: Analysis and reporting

3. **Models**: Data structure and database operations
   - `Transaction.ts`: Transaction model and operations
   - `Category.ts`: Category model and operations
   - `ParentCategory.ts`: Parent category model
   - `TransactionSimilarityPattern.ts`: Auto-categorization patterns

4. **Importers**: Plugin system for importing transactions
   - `ImporterRegistry.ts`: Plugin registration
   - `AIBImporter.ts`: AIB bank format importer
   - `RevoluteImporter.ts`: Revolut format importer
   - `types.ts`: Importer interfaces and types

5. **Database**: SQLite database with custom ORM
   - `db.ts`: Database connection and query utilities

## Data Flow

### 1. Transaction Import Flow

```mermaid
sequenceDiagram
    participant User
    participant ImportCSV as ImportCSV Component
    participant API as API Service
    participant Controller as Transaction Controller
    participant Registry as Importer Registry
    participant Importer as Bank Importer
    participant Model as Transaction Model
    participant DB as SQLite Database

    User->>ImportCSV: Upload CSV File
    ImportCSV->>API: POST /api/transactions/import
    API->>Controller: processImport()
    Controller->>Registry: getImporterForFile()
    Registry->>Importer: Determine appropriate importer
    Importer-->>Registry: Return selected importer
    Registry-->>Controller: Return importer instance
    Controller->>Importer: parseFile(csvBuffer)
    Importer->>Importer: Parse and normalize
    Importer-->>Controller: Return normalized transactions
    Controller->>Model: checkForDuplicates()
    Model->>DB: Query existing transactions
    DB-->>Model: Return matches
    Model-->>Controller: Return non-duplicates
    Controller->>Model: saveTransactions()
    Model->>DB: INSERT transactions
    DB-->>Model: Confirm save
    Model-->>Controller: Return results
    Controller-->>API: Return import summary
    API-->>ImportCSV: Display results
    ImportCSV-->>User: Show import summary
```

### 2. Transaction Categorization Flow

```mermaid
sequenceDiagram
    participant User
    participant UI as TransactionList
    participant Dialog as CategoryAssignmentDialog
    participant API as API Service
    participant Controller as Transaction Controller
    participant Model as Transaction Model
    participant Pattern as Similarity Pattern
    participant DB as SQLite Database

    User->>UI: Click Categorize
    UI->>Dialog: Open with transaction
    User->>Dialog: Select category & Apply to Similar
    Dialog->>API: PUT /api/transactions/:id/category
    API->>Controller: assignCategory()
    Controller->>Model: updateCategory()
    Model->>DB: UPDATE transaction
    DB-->>Model: Confirm update
    
    alt Apply to Similar Transactions
        Controller->>Pattern: createSimilarityPattern()
        Pattern->>DB: INSERT pattern
        DB-->>Pattern: Confirm pattern creation
        Controller->>Model: findSimilarTransactions()
        Model->>DB: SELECT similar transactions
        DB-->>Model: Return similar transactions
        Controller->>Model: updateCategoryBatch()
        Model->>DB: UPDATE transactions
        DB-->>Model: Confirm batch update
    end
    
    Controller-->>API: Return results
    API-->>Dialog: Display confirmation
    Dialog-->>User: Show success message
```

### 3. Financial Analysis Flow

```mermaid
sequenceDiagram
    participant User
    participant UI as AnalysisPage
    participant Chart as Chart Component
    participant API as API Service
    participant Controller as Analysis Controller
    participant DB as SQLite Database

    User->>UI: Select date range & filters
    UI->>Chart: Update parameters
    Chart->>API: GET /api/analysis/category-spending
    API->>Controller: getCategorySpending()
    Controller->>DB: Execute aggregation query
    DB-->>Controller: Return aggregated results
    Controller-->>API: Return formatted data
    API-->>Chart: Update with new data
    Chart-->>UI: Re-render visualization
    UI-->>User: Display updated chart
```

## Component Relationships

### Transaction Management

The core of the application revolves around transaction management:

1. **Import → Categorization → Analysis** pipeline
   - Transactions are imported from bank exports
   - Transactions are categorized (manually or automatically)
   - Categorized transactions enable meaningful analysis

2. **Transaction List → Transaction Detail → Category Assignment** workflow
   - Users view transactions in list format
   - They can select individual transactions for detailed view
   - From the detail view, they can assign or modify categories

### Category System

The category system provides the foundation for financial insights:

1. **Two-Level Hierarchy**
   - Parent categories for high-level grouping
   - Categories for specific transaction types

2. **Category Relationships**
   - Each category belongs to exactly one parent category
   - Each transaction ideally has one category assignment

3. **Auto-Categorization**
   - Transaction similarity patterns link descriptions to categories
   - Pattern matching enables automatic categorization of new transactions

## Deployment Architecture

The application uses a simple deployment architecture for personal use:

```mermaid
graph TD
    A[Web Browser] -->|HTTP| B[Node.js Server]
    B -->|File I/O| C[SQLite Database File]
    B -->|File I/O| D[Uploaded CSV Files]
    
    subgraph "Single Machine Deployment"
    B
    C
    D
    end
```

For more advanced deployments:
- Frontend could be deployed to static hosting (Netlify, Vercel)
- Backend could be containerized (Docker)
- Database could be upgraded to a managed database service

## Performance Considerations

1. **Data Volume Handling**:
   - SQLite is sufficient for personal finance data (thousands of transactions)
   - Pagination implemented for transaction lists
   - Indexed queries for efficient retrieval

2. **Import Performance**:
   - Stream processing for CSV imports
   - Batch inserts for database efficiency
   - Duplicate detection using indexed queries

3. **Analysis Optimization**:
   - Pre-aggregated data for common time periods
   - Client-side caching of analysis results
   - Optimized SQL queries for aggregations

## Security Considerations

1. **Data Security**:
   - Local storage of financial data
   - No cloud dependencies by default
   - File-based database allows easy backup

2. **Input Validation**:
   - Strict validation for all imported data
   - Sanitization of user inputs
   - Type checking with TypeScript

3. **Future Authentication**:
   - Prepared for future multi-user support
   - Authentication system design planned

## Conclusion

The Finance Tracker architecture provides a solid foundation for personal finance management with a focus on transaction categorization and analysis. The modular design allows for future expansion and feature enhancements while maintaining a clean separation of concerns between system components.

The plugin-based import system, hierarchical categorization, and flexible analysis tools work together to create a comprehensive solution that can adapt to various financial tracking needs.
