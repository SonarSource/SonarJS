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
export const fields = [[{
  field: 'format',
  description: 'Description visible in SonarQube.', // REQUIRED for visibility
  default: '^[_a-z][a-zA-Z0-9]*$',
  items: { type: 'string' } // REQUIRED for arrays
}]] as const satisfies ESLintConfiguration;
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
