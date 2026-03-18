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

**Before writing any new function**, search `packages/jsts/src/rules/helpers/` for an existing equivalent. Key files to check:

- `ast.ts` — generic AST utilities (child enumeration, node classification, ancestor walking)
- `vue.ts` — Vue-specific helpers
- `react.ts` — React/JSX-specific helpers

Reviewers will reject re-implementations of existing helpers.

**Anti-pattern:** Iterating `Object.keys(node)` to enumerate child nodes. Use the existing `childrenOf` helper instead:

```typescript
// ❌ Do not do this
for (const key of Object.keys(node)) { ... }

// ✅ Use this
for (const child of childrenOf(node)) { ... }
```

If you write a **new** utility function that only operates on `estree`/`TSESTree` nodes with no rule-specific domain logic, place it in `helpers/ast.ts` (or `helpers/vue.ts`, `helpers/react.ts` for domain-specific utilities) — not inside the individual rule file. Functions buried in a rule file are invisible to future implementers.

## Finding Helpers

To explore available helpers:

```bash
ls packages/jsts/src/rules/helpers/
```

Read helper implementations to understand their usage and parameters.

## Helper Contracts

### childrenOf

`childrenOf(node)` always returns `estree.Node[]`. Do not write custom type guard predicates or `Array.isArray()` checks on its return values — they are dead code:

```typescript
// ❌ Redundant — childrenOf already guarantees estree.Node[]
for (const child of childrenOf(node)) {
  if (typeof child === 'object' && 'type' in child) { ... }
}

// ✅ Iterate directly
for (const child of childrenOf(node)) {
  // child is already estree.Node
}
```
