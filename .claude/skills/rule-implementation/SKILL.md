---
name: rule-implementation
description: Provides guidance on implementing and fixing SonarJS rules. Use also when tracing false positives, working with rule configuration, or understanding native vs external rule implementations.
---

# Rule Implementation

Use this skill when you need to understand how to implement or fix SonarJS rules. This covers tracing false positives, identifying where issues are raised, and working with rule configuration.

## Identifying Where Issues Are Raised

When analyzing why a false positive occurs, look for `context.report()` calls in the rule implementation:

```typescript
context.report({
  node,
  messageId: 'issue',
});
```

## Tracing the Root Cause of a False Positive

To identify why a false positive occurs, work backwards from the `context.report()` call:

### Step 1: Find All Report Calls

Search for `context.report` in the rule file. A rule may have multiple report locations for different scenarios.

### Step 2: Trace the Control Flow

For each `context.report()` call, trace backwards through the code:

1. **Identify the immediate condition** - What `if` statement or condition guards the report?
2. **Trace variable origins** - Where do the variables in that condition come from?
3. **Find the AST visitor** - Which visitor function (`CallExpression`, `Identifier`, etc.) triggers this path?
4. **Map the full path** - Document the complete path from AST node to report

### Step 3: Identify What's Missing

Compare the false positive scenario against the traced path:

- **Missing type check** - Does the rule assume a type without verifying it?
- **Missing context check** - Does the rule ignore the surrounding code context?
- **Missing pattern check** - Does the rule fail to recognize a valid code pattern?
- **Overly broad condition** - Is a condition too permissive?

### Step 4: Determine the Fix Location

Based on the analysis, identify where to add the fix:

- **Early return** - Add a guard clause before the report to skip false positive cases
- **Additional condition** - Tighten the existing condition that leads to the report
- **New helper check** - Create a helper function to detect the false positive pattern

### Example Analysis

```typescript
// Rule reports here:
if (isUnusedVariable(node)) {
  context.report({ node, messageId: 'unused' });
}

// Tracing back:
// 1. isUnusedVariable() returns true
// 2. But it doesn't check if variable is used in a type annotation
// 3. Fix: Add check for type annotation usage before reporting
```

## Rule Configuration Architecture

Rule configuration flows through multiple layers: `TypeScript config.ts` → `Java @RuleProperty` → `SonarQube UI` → `Bridge` → `ESLint context.options`.

### Configuration Layers

1. **TypeScript Configuration (`config.ts`)**: Defines parameters

```typescript
export const fields = [
  [
    {
      field: 'format',
      description: 'Description visible in SonarQube.', // REQUIRED for visibility
      default: '^[_a-z][a-zA-Z0-9]*$',
      items: { type: 'string' }, // REQUIRED for arrays
    },
  ],
] as const satisfies ESLintConfiguration;
```

2. **ESLint Schema (`meta.ts`)**: Defines JSON schema for validation
3. **Generated Metadata**: `npm run generate-meta` creates `generated-meta.ts`
4. **Java Classes**: `npm run generate-java-rule-classes` creates Java files with `@RuleProperty`

### External Rule Configuration

External rules (identified by `implementation = 'external'` in `meta.ts`) can have their configuration exposed to SonarQube.

**Requirements for External Config:**

1. **Must include `description`**: Without it, no `@RuleProperty` is generated
2. **Arrays need `items`**: Must specify `{ type: 'string' }` or similar
3. **No RegExp Objects**: Use string patterns (e.g., `'^pattern$'`), not JS RegExp objects (`/^pattern$/`)
4. **Double Escaping**: Backslashes in `customDefault` for Java must be double-escaped (e.g., `^\\\\w+$` to match `\w`)
5. **Value Translation with `customForConfiguration`**: When SonarQube exposes a property in a different type than what ESLint expects, use `customForConfiguration` (a `(value: unknown) => unknown` function) paired with `customDefault` (the SQ-side parse target):

```typescript
// S1441: SQ exposes boolean "singleQuotes", ESLint expects 'single' | 'double'
{
  default: 'single',          // ESLint default
  customDefault: true,        // SQ-side default (boolean — used for parsing)
  displayName: 'singleQuotes',
  customForConfiguration: (value: unknown) => (value ? 'single' : 'double'),
}

// S6418: SQ sends '5.0' as a string, ESLint expects a number
{
  field: 'randomnessSensibility',
  default: 5,                 // ESLint default
  customDefault: '5.0',       // SQ-side default (string — used for parsing)
  customForConfiguration: Number,
}
```

### Workflow for Exposing Configuration

If your fix requires exposing a new option:

1. **Create/Update `config.ts`**: Define fields, descriptions, and defaults
2. **Export in `meta.ts`**: Add `export * from './config.js';`
3. **Generate Java**: Run `npm run generate-java-rule-classes`
4. **Verify**: Check the generated Java file in `sonar-plugin/javascript-checks/src/main/java/org/sonar/javascript/checks/`

## Regenerating Metadata

After modifying configuration or metadata files, regenerate the derived files:

- `npm run generate-meta` - Regenerate rule metadata after changes to `meta.ts` or `config.ts`
- `npm run generate-java-rule-classes` - Regenerate Java rule classes (required after `config.ts` changes)

---

## AST Traversal Strategy

### Prefer ESLint selector-based node collection over recursive walks

When implementing a rule, use ESLint's selector-based dispatch instead of walking the AST manually:

```typescript
// ❌ Recursive walk — expensive and brittle
create(context) {
  return {
    FunctionDeclaration(node) {
      const returns = collectReturns(node.body); // recursive walk inside
    }
  };
}

// ✅ Selector + side-table — ESLint dispatches once per node
create(context) {
  const returnsByFunction = new Map();
  return {
    ReturnStatement(node) {
      const fn = getEnclosingFunction(node);
      if (fn) returnsByFunction.set(fn, [...(returnsByFunction.get(fn) ?? []), node]);
    },
    'FunctionDeclaration:exit'(node) {
      const returns = returnsByFunction.get(node) ?? [];
      // analyse returns
    }
  };
}
```

Selector-based approaches let ESLint dispatch to your handler exactly once per matching node at no extra traversal cost, and automatically handle all node types including future additions to the language.

### When recursive traversal is unavoidable, use visitorKeys — not switch

If you must traverse a subtree recursively inside a helper (e.g. `containsAssignment`, `nodeHasReturn`), enumerate child properties generically using ESLint's `visitorKeys` instead of a manual `switch`:

```typescript
// ❌ Manual switch — silently drops unlisted node types
function containsReturn(node: estree.Node): boolean {
  switch (node.type) {
    case 'ReturnStatement':
      return true;
    case 'BlockStatement':
      return node.body.some(containsReturn);
    default:
      return false; // silently misses loops, try/catch, switch bodies...
  }
}

// ✅ Generic traversal via visitorKeys
import { visitorKeys } from '@typescript-eslint/visitor-keys';
function containsReturn(node: estree.Node): boolean {
  if (node.type === 'ReturnStatement') return true;
  const keys = visitorKeys[node.type] ?? [];
  return keys.some(key => {
    const child = (node as Record<string, unknown>)[key];
    if (Array.isArray(child)) return child.some(c => c && containsReturn(c as estree.Node));
    if (child && typeof child === 'object') return containsReturn(child as estree.Node);
    return false;
  });
}
```

---

## TypeScript Type Safety

### Unsafe type assertions must be guarded or explained

Do not cast AST nodes silently. A cast is safe only if it holds for every node type the upstream rule can report on.

```typescript
// ❌ Silent cast — crashes if upstream rule ever reports a non-Identifier node
const identifier = tsNode as TSESTree.Identifier;

// ✅ Type guard
if (tsNode.type !== 'Identifier') return;
const identifier = tsNode; // narrowed

// ✅ Explanatory comment when guard is impractical
// Safe: prefer-single-call only reports Identifier property nodes; computed access is excluded.
const identifier = tsNode as TSESTree.Identifier;
```

### Enumerate all upstream report sites before casting reportDescriptor.node

When writing a decorator, inspect **every** `context.report()` call in the upstream rule to determine all possible node types. A cast that only covers the common case will crash on edge cases.

```typescript
// ❌ Assumes only one node type is ever reported
const node = descriptor.node as TSESTree.TSCallSignatureDeclaration;

// ✅ After auditing all context.report() calls in the upstream source
const node = descriptor.node as
  | TSESTree.TSCallSignatureDeclaration
  | TSESTree.TSConstructSignatureDeclaration;
```

This audit is the natural follow-on to Step 1 ("Find All Report Calls") in the FP tracing workflow above.

### Use specific node types in function signatures

Declare parameters with the most specific `estree`/`TSESTree` type the function actually requires. Using the base `estree.Node` hides the contract and disables type-checker assistance:

```typescript
// ❌ Too broad
function isInDirectionalContext(node: estree.Node): boolean { ... }

// ✅ Specific
function isInDirectionalContext(node: estree.CallExpression): boolean { ... }
```

---

## TypeScript Compiler API

### Use mutual assignability to test type equivalence

One-directional `isTypeAssignableTo(A, B)` only proves that `A` is a structural subtype of `B`. It returns `true` even when `B` is much wider, causing wrong-trigger suppressions.

```typescript
// ❌ One-directional — false matches when B has extra optional fields
if (checker.isTypeAssignableTo(typeA, typeB)) {
  suppress();
}

// ✅ Mutual — true only when both types are structurally equivalent
if (checker.isTypeAssignableTo(typeA, typeB) && checker.isTypeAssignableTo(typeB, typeA)) {
  suppress();
}
```

### Use bitwise operators for TypeFlags comparisons

`ts.TypeFlags` values are bitmasks. A type can have multiple flags set simultaneously. Using `===` against a single flag value fails whenever any other flag is also set:

```typescript
// ❌ Fails when multiple flags are set (common with union types)
if (type.flags === ts.TypeFlags.Any) { ... }

// ✅ Bitwise mask — true whenever the flag is set, regardless of other flags
if (type.flags & ts.TypeFlags.Any) { ... }
if (type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) { ... }
```

---

## FP Remediation Quality

### Do not suppress reports that the rule is correct to raise

Not every complaint is a genuine false positive. Two cases to watch for:

**strictNullChecks disabled:** Do not add an exemption that suppresses non-null assertion (`!`) reports when `strictNullChecks` is off. Without `strictNullChecks`, `!` is a no-op — but suppressing the report hides future migration debt. Let the rule fire and guide developers to write proper null guards.

**Rule goal conflicts:** Before implementing an exception, re-read the upstream rule's documentation. If the exception would allow exactly the pattern the rule was designed to catch, the report is not a false positive. Do not proceed with the fix; flag it for human review instead.

### Cover the full API family when adding an exception

When adding a suppression exception for one method, identify all semantically equivalent siblings in the same API family and include them in the same guard:

```typescript
// ❌ Only covers Object.keys — Object.getOwnPropertyNames users still get FPs
if (isCallingMethod(node, 1, 'keys')) {
  suppress();
}

// ✅ Covers the full family
if (isCallingMethod(node, 1, 'keys', 'getOwnPropertyNames', 'getOwnPropertySymbols')) {
  suppress();
}
```

Add test cases and update rule documentation for each covered variant.

---

## Decorator Design

### When all identification strategies fail, preserve the report

When a decorator uses multiple strategies to identify the owning component, and all strategies fail, preserve the original report. Do not fall back to `context.sourceCode.ast` (the entire file AST) as a catch-all scope:

```typescript
// ❌ File-scope fallback — suppresses reports the decorator cannot correctly attribute
const scope = findOwner(node) ?? context.sourceCode.ast;
if (isSuppressible(node, scope)) return;

// ✅ No owner found → preserve the report
const owner = findOwner(node);
if (!owner) {
  context.report(reportDescriptor); // original report is more likely correct
  return;
}
```

### Scope suppression decisions to the component, not the file

Never cache a suppression decision at the file level. If one component matches, a file-level cache incorrectly suppresses reports for other components in the same file:

```typescript
// ❌ File-level cache — contaminates all components in the file
let fileHasSuppressibleProps = false;
return {
  'Program:exit'() {
    if (fileHasSuppressibleProps) return; // suppresses everything in file
  },
};

// ✅ Per-report decision scoped to the component
(context, descriptor) => {
  const owner = findOwner(descriptor.node);
  if (owner && isSuppressible(descriptor.node, owner)) return;
  context.report(descriptor);
};
```

### Resolve spread expressions before suppressing

Do not suppress a report simply because a JSX spread attribute `{...expr}` is present. Attempt to resolve `expr` statically first:

```typescript
// ❌ Suppresses on mere presence of spread — may produce false negatives
if (node.openingElement.attributes.some(a => a.type === 'JSXSpreadAttribute')) return;

// ✅ Resolve the spread value first
const spreadAttr = node.openingElement.attributes.find(a => a.type === 'JSXSpreadAttribute');
if (spreadAttr) {
  const value = getValueOfExpression(context, spreadAttr.argument, 'ObjectExpression');
  if (!value) return; // unresolvable — suppress conservatively
  if (hasRelevantProperties(value)) return; // spread carries the relevant content
  // else: spread resolves to irrelevant object — do not suppress
}
```

### Document multi-strategy decorator helpers with JSDoc and inline comments

When a decorator helper uses multiple identification strategies, add JSDoc describing the strategy sequence and inline comments at each branch:

```typescript
/**
 * Finds the React component that owns the reported props interface.
 * Strategy A: match by component name in the same file.
 * Strategy B: match by structural subtyping against known prop shapes.
 * Strategy C: match by mutual type assignability.
 * Returns null if no owner is found; the caller must preserve the report in that case.
 */
function findOwner(node: TSESTree.Node): ComponentNode | null {
  // Strategy A: direct name match
  const byName = findByName(node);
  if (byName) return byName;

  // Strategy B: structural subtype check (faster, less precise)
  const byShape = findByShape(node);
  if (byShape) return byShape;

  // Strategy C: mutual assignability (slower, most precise)
  return findByMutualAssignability(node);
}
```

---

## Code Style

### Use optional chaining for optional array length checks

```typescript
// ❌ Redundant double guard
if (arr && arr.length > 0) { ... }
if (declaration?.typeParameters && declaration.typeParameters.length > 0) { ... }

// ✅ Optional chaining short-circuits on undefined; undefined > 0 is false
if (arr?.length > 0) { ... }
if (declaration?.typeParameters?.length > 0) { ... }
```
