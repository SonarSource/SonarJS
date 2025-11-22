# TypeScript Program Creation: Undocumented Behaviors and Pitfalls

This guide documents critical findings about TypeScript's `ts.createProgram` and `ts.parseJsonConfigFileContent` APIs that are poorly documented and can lead to subtle bugs.

## Table of Contents

1. [How configFilePath Affects @types Resolution](#1-how-configfilepath-affects-types-resolution)
2. [Options Precedence: existingOptions vs json.compilerOptions](#2-options-precedence-existingoptions-vs-jsoncompileroptions)
3. [Input Curation: json vs existingOptions](#3-input-curation-json-vs-existingoptions)
4. [Best Practices](#4-best-practices)

---

## 1. How configFilePath Affects @types Resolution

### Key Discovery

**TypeScript uses `dirname(configFilePath)` as the starting point for @types resolution when configFilePath is set in compiler options.**

This is contrary to the common assumption that only `host.getCurrentDirectory()` matters.

### How It Works

```typescript
// Signature of ts.parseJsonConfigFileContent
ts.parseJsonConfigFileContent(
  json: any,                    // 1st: tsconfig.json content
  host: ParseConfigHost,        // 2nd: file system host
  basePath: string,             // 3rd: base path for resolving files
  existingOptions?: CompilerOptions,  // 4th: existing compiler options
  configFileName?: string       // 5th: path to tsconfig.json
);
```

**The 5th parameter (configFileName) determines WHERE TypeScript searches for @types packages!**

### Scenarios Tested

#### Scenario A: configFilePath OUTSIDE process.cwd()

```typescript
const parsed = ts.parseJsonConfigFileContent(
  { compilerOptions: { target: 'ES2020', allowJs: true, noEmit: true } },
  ts.sys,
  '/project/root',
  {},
  '/project/root/tsconfig.json', // Outside process.cwd()
);

const program = ts.createProgram({
  rootNames: ['path/to/file.js'],
  options: parsed.options,
  host: ts.createCompilerHost(parsed.options),
});
```

**Result:**

- Total CompilerHost method calls: **2,388**
- `getCurrentDirectory()` calls: 1 (returns `C:\www\projects\SonarJS`)
- `directoryExists()` calls: 757
- @types searches: Only **3 attempts**
  - `/project/root/node_modules/@types` → false
  - `/project/node_modules/@types` → false
  - `/node_modules/@types` → false
- **@types/node: NOT FOUND** ❌

#### Scenario B: configFilePath UNDEFINED

```typescript
const parsed = ts.parseJsonConfigFileContent(
  { compilerOptions: { target: 'ES2020', allowJs: true, noEmit: true } },
  ts.sys,
  '/project/root',
  {},
  undefined, // NO configFilePath
);

const program = ts.createProgram({
  rootNames: ['path/to/file.js'],
  options: parsed.options,
  host: ts.createCompilerHost(parsed.options),
});
```

**Result:**

- Total CompilerHost method calls: **11,758** (almost 5x more!)
- `getCurrentDirectory()` calls: 39 (all return `C:\www\projects\SonarJS`)
- `directoryExists()` calls: 3,439
- @types searches: **1,537 attempts**
  - `C:/www/projects/SonarJS/node_modules/@types` → true ✓
  - Then searches each @types package: babel\_\_preset-env, body-parser, express, node, etc.
- **@types/node: FOUND** ✓

#### Scenario C: configFilePath INSIDE process.cwd()

```typescript
const parsed = ts.parseJsonConfigFileContent(
  { compilerOptions: { target: 'ES2020', allowJs: true, noEmit: true } },
  ts.sys,
  'c:/www/projects/SonarJS/packages/jsts',
  {},
  'c:/www/projects/SonarJS/packages/jsts/tsconfig.json', // Inside process.cwd()
);

const program = ts.createProgram({
  rootNames: ['path/to/file.js'],
  options: parsed.options,
  host: ts.createCompilerHost(parsed.options),
});
```

**Result:**

- Total CompilerHost method calls: **11,996** (similar to Scenario B)
- `getCurrentDirectory()` calls: 1 (returns `C:\www\projects\SonarJS`)
- `directoryExists()` calls: 3,715
- @types searches: **1,537+ attempts**
  - `c:/www/projects/SonarJS/packages/jsts/node_modules/@types` → false
  - `c:/www/projects/SonarJS/node_modules/@types` → true ✓
  - Then searches each @types package like Scenario B
- **@types/node: FOUND** ✓

### Summary

| Scenario | configFilePath                                        | @types Search Starting Point             | @types/node Found? | Method Calls |
| -------- | ----------------------------------------------------- | ---------------------------------------- | ------------------ | ------------ |
| A        | `/project/root/tsconfig.json`                         | `/project/root/`                         | ❌ No              | 2,388        |
| B        | `undefined`                                           | `process.cwd()`                          | ✓ Yes              | 11,758       |
| C        | `c:/www/projects/SonarJS/packages/jsts/tsconfig.json` | `c:/www/projects/SonarJS/packages/jsts/` | ✓ Yes              | 11,996       |

### Important Notes

- `host.getCurrentDirectory()` ALWAYS returns `process.cwd()`, regardless of configFilePath
- BUT TypeScript internally uses `dirname(configFilePath)` to start searching for @types
- The `basePath` parameter does NOT affect @types resolution (only used for include/exclude patterns)
- The 5x increase in method calls happens because finding @types triggers loading of all @types packages

### Practical Implications

**❌ Wrong:** Setting configFilePath to a location without node_modules

```typescript
// This will NOT find @types/node!
const parsed = ts.parseJsonConfigFileContent(
  tsconfig,
  ts.sys,
  basePath,
  {},
  '/some/random/path/tsconfig.json', // No node_modules here
);
```

**✓ Correct:** Ensure configFilePath has node_modules in parent hierarchy

```typescript
// This WILL find @types/node
const parsed = ts.parseJsonConfigFileContent(
  tsconfig,
  ts.sys,
  basePath,
  {},
  'c:/my/project/tsconfig.json', // Has node_modules in parent
);
```

**✓ Alternative:** Use undefined to fall back to process.cwd()

```typescript
// This uses host.getCurrentDirectory() for @types resolution
const parsed = ts.parseJsonConfigFileContent(
  tsconfig,
  ts.sys,
  basePath,
  {},
  undefined, // Falls back to process.cwd()
);
```

---

## 2. Options Precedence: existingOptions vs json.compilerOptions

### Key Discovery

**When both json.compilerOptions AND existingOptions are provided, existingOptions takes PRECEDENCE over json.compilerOptions!**

This is counter-intuitive. The merge behavior is:

```typescript
Result = { ...parsedJsonOptions, ...existingOptions };
```

In other words: **existingOptions overwrites json.compilerOptions**.

### Examples

#### Example 1: existingOptions Wins Over json

```typescript
const parsed = ts.parseJsonConfigFileContent(
  {
    compilerOptions: {
      target: 'ES2020',
      module: 'CommonJS',
      strict: true,
    },
  },
  ts.sys,
  '/project',
  {
    target: ts.ScriptTarget.ES5,
    module: ts.ModuleKind.AMD,
    strict: false,
    noEmit: true, // Not in json
  },
);

console.log(parsed.options.target); // ts.ScriptTarget.ES5 (existing wins!)
console.log(parsed.options.module); // ts.ModuleKind.AMD (existing wins!)
console.log(parsed.options.strict); // false (existing wins!)
console.log(parsed.options.noEmit); // true (from existing, not in json)
```

**Result:**

- `target`: ES5 (existingOptions wins over json's ES2020)
- `module`: AMD (existingOptions wins over json's CommonJS)
- `strict`: false (existingOptions wins over json's true)
- `noEmit`: true (from existingOptions, not in json)

#### Example 2: json Only Adds New Options

```typescript
const parsed = ts.parseJsonConfigFileContent(
  {
    compilerOptions: {
      target: 'ES2020',
      allowJs: true,
    },
  },
  ts.sys,
  '/project',
  {
    target: ts.ScriptTarget.ES5,
    module: ts.ModuleKind.ESNext,
    strict: true,
    noEmit: true,
  },
);

console.log(parsed.options.target); // ts.ScriptTarget.ES5 (existing wins)
console.log(parsed.options.allowJs); // true (from json, not in existing)
console.log(parsed.options.module); // ts.ModuleKind.ESNext (from existing)
console.log(parsed.options.strict); // true (from existing)
console.log(parsed.options.noEmit); // true (from existing)
```

**Result:**

- `target`: ES5 (existingOptions overrides json's ES2020)
- `allowJs`: true (from json, since not in existingOptions)
- `module`: ESNext (from existingOptions)
- `strict`: true (from existingOptions)
- `noEmit`: true (from existingOptions)

#### Example 3: Even Explicit false is Ignored

```typescript
const parsed = ts.parseJsonConfigFileContent(
  {
    compilerOptions: {
      noEmit: false, // Explicitly trying to override
    },
  },
  ts.sys,
  '/project',
  {
    noEmit: true,
  },
);

console.log(parsed.options.noEmit); // true (existing wins, json false ignored!)
```

**Result:** existingOptions wins even when json explicitly sets false!

### Practical Implications

#### ❌ Common Mistake

```typescript
// WRONG: Expecting json to override existingOptions
const parsed = ts.parseJsonConfigFileContent(
  tsconfig,
  ts.sys,
  basePath,
  { target: ts.ScriptTarget.ES5 }, // This will WIN over tsconfig!
);
// tsconfig cannot override target to ES2020
```

#### ✓ Correct Usage 1: No Overrides

```typescript
// Parse tsconfig with no overrides
const parsed = ts.parseJsonConfigFileContent(
  tsconfig,
  ts.sys,
  basePath,
  undefined, // No existingOptions
);
// All options come from tsconfig
```

#### ✓ Correct Usage 2: Provide Defaults That Cannot Be Overridden

```typescript
// Provide defaults that tsconfig cannot override
const parsed = ts.parseJsonConfigFileContent(
  tsconfig,
  ts.sys,
  basePath,
  { noEmit: true, target: ts.ScriptTarget.ES2020 }, // These WIN over tsconfig
);
// tsconfig can only add NEW options, not override these
```

#### ✓ Correct Usage 3: Manual Override After Parsing

```typescript
// Parse first, then manually apply overrides
const parsed = ts.parseJsonConfigFileContent(tsconfig, ts.sys, basePath);
// Manually merge with higher precedence
const finalOptions = { ...parsed.options, noEmit: true };
```

### Summary Table

| Scenario               | json value         | existingOptions value | Result          | Who Wins?       |
| ---------------------- | ------------------ | --------------------- | --------------- | --------------- |
| Both defined           | `target: 'ES2020'` | `target: ES5`         | `target: ES5`   | existingOptions |
| Only in json           | `allowJs: true`    | (not defined)         | `allowJs: true` | json            |
| Only in existing       | (not defined)      | `noEmit: true`        | `noEmit: true`  | existingOptions |
| Explicit false in json | `noEmit: false`    | `noEmit: true`        | `noEmit: true`  | existingOptions |

### Conclusion

The `existingOptions` parameter is NOT for "existing options to be overridden", but rather for **"options that should take precedence over the config file"**.

This naming is confusing and the behavior is counter-intuitive!

---

## 3. Input Curation: json vs existingOptions

### Key Discovery

**TypeScript only curates options from json.compilerOptions, NOT from existingOptions!**

Curation means:

- Converting string values to enum values (e.g., `"ES2020"` → `ts.ScriptTarget.ES2020`)
- Expanding lib arrays (e.g., `["DOM", "ES2020"]` → `["lib.dom.d.ts", "lib.es2020.d.ts"]`)

### What Gets Curated

#### ✓ json.compilerOptions (Curated)

```typescript
const parsed = ts.parseJsonConfigFileContent(
  {
    compilerOptions: {
      target: 'ES2020', // String
      module: 'CommonJS', // String
      jsx: 'react', // String
      lib: ['DOM', 'ES2020'], // String array
    },
  },
  ts.sys,
  '/project',
);

console.log(parsed.options.target); // 7 (ts.ScriptTarget.ES2020, number)
console.log(parsed.options.module); // 1 (ts.ModuleKind.CommonJS, number)
console.log(parsed.options.jsx); // 2 (ts.JsxEmit.React, number)
console.log(parsed.options.lib); // ['lib.dom.d.ts', 'lib.es2020.d.ts']
```

**All string values are curated to proper enum values and lib files!**

#### ✗ existingOptions (NOT Curated)

```typescript
const parsed = ts.parseJsonConfigFileContent({}, ts.sys, '/project', {
  target: 'ES2020' as any, // String
  module: 'CommonJS' as any, // String
  lib: ['DOM', 'ES2020'] as any, // String array
});

console.log(parsed.options.target); // 'ES2020' (string, NOT curated!)
console.log(parsed.options.module); // 'CommonJS' (string, NOT curated!)
console.log(parsed.options.lib); // ['DOM', 'ES2020'] (NOT expanded!)

console.log(typeof parsed.options.target); // 'string'
console.log(typeof parsed.options.module); // 'string'
```

**String values are NOT curated - they stay as strings!**

### Value Format Inconsistency Problem

When both json and existingOptions are provided, the same option can have **different value formats** depending on precedence:

```typescript
const parsed = ts.parseJsonConfigFileContent(
  {
    compilerOptions: {
      target: 'ES2020', // Would be curated to enum 7 (number)
    },
  },
  ts.sys,
  '/project',
  {
    target: 'ES5' as any, // NOT curated, stays as string 'ES5'
  },
);

console.log(parsed.options.target); // 'ES5' (string!)
console.log(typeof parsed.options.target); // 'string'
// existingOptions wins, but WITHOUT curation!
```

**Result:** `parsed.options.target` is now a **string** (`'ES5'`), not a number (`1`).

While `CompilerOptions.target` accepts both strings and numbers, having inconsistent value formats can lead to unexpected behavior:

```typescript
// Value format matters for comparisons
console.log(parsed.options.target === ts.ScriptTarget.ES5); // false ('ES5' !== 1)
console.log(parsed.options.target === 'ES5'); // true

// This affects logic that depends on the value format
switch (parsed.options.target) {
  case ts.ScriptTarget.ES5: // Won't match if target is string 'ES5'
    break;
  case 'ES5': // Won't match if target is number 1
    break;
}
```

The TypeScript compiler handles both formats internally, but **your own code** may behave differently depending on whether you receive a curated (number) or uncurated (string) value.

### Best Practices

#### ✓ Correct Usage of existingOptions

Always use proper enum values and full lib file paths:

```typescript
const parsed = ts.parseJsonConfigFileContent(tsconfig, ts.sys, basePath, {
  target: ts.ScriptTarget.ES2020, // Use enum
  module: ts.ModuleKind.CommonJS, // Use enum
  jsx: ts.JsxEmit.React, // Use enum
  moduleResolution: ts.ModuleResolutionKind.Node10, // Use enum
  lib: ['lib.dom.d.ts', 'lib.es2020.d.ts'], // Use full lib file names
  strict: true, // Booleans are fine
  noEmit: true, // Booleans are fine
});
```

#### ✗ Incorrect Usage (Works but Creates Inconsistent Types)

```typescript
const parsed = ts.parseJsonConfigFileContent(tsconfig, ts.sys, basePath, {
  target: 'ES2020', // String won't be curated!
  module: 'CommonJS', // String won't be curated!
  lib: ['DOM', 'ES2020'], // Won't be expanded to lib files!
});
// These will stay as strings, causing type inconsistency
```

### Curation Comparison Table

| Option Type   | json.compilerOptions | existingOptions |
| ------------- | -------------------- | --------------- |
| String → Enum | ✓ Curated            | ✗ Not curated   |
| lib Array     | ✓ Expanded           | ✗ Not expanded  |
| Boolean       | ✓ Used as-is         | ✓ Used as-is    |
| Number        | ✓ Used as-is         | ✓ Used as-is    |
| Enum          | ✓ Used as-is         | ✓ Used as-is    |

### Example: String vs Enum

```typescript
// Test 1: String in json (curated)
const parsed1 = ts.parseJsonConfigFileContent(
  { compilerOptions: { target: 'ES2020' } },
  ts.sys,
  '/project',
);
console.log(parsed1.options.target); // 7
console.log(typeof parsed1.options.target); // 'number'

// Test 2: String in existingOptions (NOT curated)
const parsed2 = ts.parseJsonConfigFileContent({}, ts.sys, '/project', { target: 'ES2020' as any });
console.log(parsed2.options.target); // 'ES2020'
console.log(typeof parsed2.options.target); // 'string'

// Test 3: Enum in existingOptions (used as-is)
const parsed3 = ts.parseJsonConfigFileContent({}, ts.sys, '/project', {
  target: ts.ScriptTarget.ES2020,
});
console.log(parsed3.options.target); // 7
console.log(typeof parsed3.options.target); // 'number'
```

---

## 4. Best Practices

### Summary of All Findings

1. **configFilePath determines @types resolution starting point**
   - Set configFilePath to a location with node_modules in parent hierarchy
   - Or use undefined to fall back to process.cwd()

2. **existingOptions takes precedence over json.compilerOptions**
   - Don't pass existingOptions if you want json to be authoritative
   - Use existingOptions for unchangeable defaults, not for overrides

3. **Only json.compilerOptions is curated, not existingOptions**
   - Always use proper enum values in existingOptions
   - Use full lib file paths like `'lib.dom.d.ts'`, not `'DOM'`

### Recommended Patterns

#### Pattern 1: Parse tsconfig.json Cleanly

```typescript
// Just parse the tsconfig, no overrides
const parsed = ts.parseJsonConfigFileContent(
  tsconfig,
  ts.sys,
  basePath,
  undefined, // No existingOptions
  configFilePath, // Ensure this has node_modules in parents
);

const program = ts.createProgram({
  rootNames: fileNames,
  options: parsed.options,
  host: ts.createCompilerHost(parsed.options),
});
```

#### Pattern 2: Parse and Then Override

```typescript
// Parse first, then manually merge overrides
const parsed = ts.parseJsonConfigFileContent(tsconfig, ts.sys, basePath, undefined, configFilePath);

// Apply overrides after parsing
const finalOptions: ts.CompilerOptions = {
  ...parsed.options,
  noEmit: true, // Your override
  allowJs: true, // Your override
};

const program = ts.createProgram({
  rootNames: fileNames,
  options: finalOptions,
  host: ts.createCompilerHost(finalOptions),
});
```

#### Pattern 3: Provide Unchangeable Defaults

```typescript
// Use existingOptions for options that MUST NOT be overridden
const parsed = ts.parseJsonConfigFileContent(
  tsconfig,
  ts.sys,
  basePath,
  {
    // These CANNOT be overridden by tsconfig
    noEmit: true,
    target: ts.ScriptTarget.ES2020, // Use proper enum!
  },
  configFilePath,
);

const program = ts.createProgram({
  rootNames: fileNames,
  options: parsed.options,
  host: ts.createCompilerHost(parsed.options),
});
```

#### Pattern 4: For @types Resolution Without Config File

```typescript
// Create program without tsconfig, but ensure @types resolution works
const options: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2020,
  module: ts.ModuleKind.ESNext,
  allowJs: true,
  noEmit: true,
  // DON'T set configFilePath in options
};

// TypeScript will use host.getCurrentDirectory() for @types resolution
const program = ts.createProgram({
  rootNames: fileNames,
  options: options,
  host: ts.createCompilerHost(options),
});
```

### Common Pitfalls to Avoid

#### ❌ Pitfall 1: configFilePath Outside Project

```typescript
// DON'T do this - @types won't be found!
const parsed = ts.parseJsonConfigFileContent(
  tsconfig,
  ts.sys,
  basePath,
  {},
  '/random/location/tsconfig.json', // No node_modules here
);
```

#### ❌ Pitfall 2: Expecting json to Override existingOptions

```typescript
// DON'T do this - existingOptions wins!
const parsed = ts.parseJsonConfigFileContent(
  { compilerOptions: { target: 'ES2020' } }, // Won't work
  ts.sys,
  basePath,
  { target: ts.ScriptTarget.ES5 }, // This wins
);
```

#### ❌ Pitfall 3: Using Strings in existingOptions

```typescript
// DON'T do this - strings won't be curated!
const parsed = ts.parseJsonConfigFileContent(tsconfig, ts.sys, basePath, {
  lib: ['DOM', 'ES2020'], // Won't be expanded!
});
```

### Testing Your Configuration

To verify your configuration works correctly:

```typescript
const program = ts.createProgram({
  rootNames: fileNames,
  options: compilerOptions,
  host: ts.createCompilerHost(compilerOptions),
});

// Check if @types/node was loaded
const hasNodeTypes = program
  .getSourceFiles()
  .some(sf => sf.fileName.includes('node_modules/@types/node'));

console.log('Found @types/node:', hasNodeTypes);

// Check option types
console.log('target type:', typeof compilerOptions.target);
console.log('target value:', compilerOptions.target);

// Should be number (enum), not string!
if (typeof compilerOptions.target === 'string') {
  console.warn('WARNING: target is a string, should be enum!');
}
```

---

## References

These findings are documented in the following test files in `docs/fixtures/`:

- `docs/fixtures/comprehensive-host-tracking.test.ts` - Tracks all CompilerHost method calls across three scenarios to demonstrate how configFilePath affects @types resolution
- `docs/fixtures/parse-config-options-precedence.test.ts` - Tests and documents how existingOptions takes precedence over json.compilerOptions

All findings were discovered through comprehensive empirical testing by monitoring every CompilerHost method call and comparing different configuration scenarios.

---

**Last Updated:** 2025-01-21

**Note:** These behaviors are present in TypeScript 5.x and are poorly documented in official TypeScript documentation. This guide is based on extensive testing and reverse-engineering of TypeScript's internal behavior.
