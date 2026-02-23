---
name: helpers
description: Provides JavaScript/TypeScript helper functions and utilities for SonarJS rule implementation. Use when implementing rule fixes, searching for existing utilities, or needing to check available helper functions.
---

# JavaScript/TypeScript Rule Helper Functions

Helper functions are located in `packages/jsts/src/rules/helpers/`. These provide common utilities for rule implementations.

## Helper Categories

- **AST Utilities**: Functions for traversing and querying the AST
- **Type Checking**: Helpers for checking types via TypeScript parser services
- **Module Helpers**: Functions for analyzing imports and exports
- **String/Regex Utilities**: Common string and pattern matching helpers

## Common Helper Functions

- `isCallingMethod()` - Check if a call expression is calling a specific method
- `getUniqueWriteUsageOrNode()` - Track variable assignments
- `isRequiredParserServices()` - Check if TypeScript type information is available
- `isArray()`, `isString()`, etc. - Type checking helpers
- `getImportDeclarations()` - Get import declarations from the context

## Usage Guidance

When implementing a fix:
1. Review the `packages/jsts/src/rules/helpers/` directory for existing utilities
2. Use existing helpers instead of writing custom logic where possible
3. This ensures consistency and reduces code duplication

## Finding Helpers

To explore available helpers:
```bash
ls packages/jsts/src/rules/helpers/
```

Read helper implementations to understand their usage and parameters.
