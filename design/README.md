# Finance Tracker Design Documentation

This directory contains comprehensive technical documentation for the Finance Tracker project. These documents are intended for developers who want to understand the architecture, contribute to the project, or extend its functionality.

## Documentation Index

| Document | Description |
|----------|-------------|
| [Architecture Overview](architecture-overview.md) | High-level architectural overview of the application, component relationships, and data flow diagrams |
| [Database Schema](database-schema.md) | Detailed information about the database schema, tables, relationships, and data flow |
| [Auto-Categorization System](auto-categorization-system.md) | Documentation of the intelligent transaction categorization system, pattern matching algorithms, and machine learning approach |
| [Financial Analysis Features](financial-analysis-features.md) | Details about the financial analysis capabilities, visualization components, and calculation methodologies |
| [API Reference](api-reference.md) | Comprehensive API documentation for all endpoints, request/response formats, and example usage |
| [Transaction Importer Plugin](transaction-importer-plugin.md) | Design and implementation details for the plugin-based bank import system |

## Diagrams

The documentation includes various diagrams to illustrate system components and workflows:

1. **Entity-Relationship Diagram**: Located at [../er-diagram.png](../er-diagram.png), generated from [../er-diagram.mmd](../er-diagram.mmd)

2. **Sequence Diagrams**: Found throughout the documents, illustrating key processes like transaction import, categorization, and analysis

3. **Component Diagrams**: Visualizing the relationships between different application components

## Development Guides

For specific development tasks, refer to these sections:

1. **Adding a New Bank Importer**: See the [Transaction Importer Plugin](transaction-importer-plugin.md) document

2. **Extending the Analysis Features**: See the [Financial Analysis Features](financial-analysis-features.md) document

3. **Modifying the Database Schema**: See the [Database Schema](database-schema.md) document

## Contributing

When contributing to the documentation:

1. Use Markdown format for all documentation
2. Maintain the existing style and structure
3. Include diagrams when useful (preferably in Mermaid syntax)
4. Add examples and code snippets where appropriate
5. Update this index when adding new documentation files
