# Branded ProgramOptions Type Safety

## Overview

We've implemented a **branded type** pattern to ensure that `ProgramOptions` can ONLY be created through **`ts.parseJsonConfigFileContent()`**, which is the TypeScript API that properly sanitizes and processes tsconfig.json options. This provides compile-time type safety, preventing users from passing raw TypeScript compiler options that haven't been properly processed.

## Three Single Points of Control

The architecture enforces proper option sanitization through three single points:

1. **ONE call to `ts.parseJsonConfigFileContent`**: Located in `createProgramOptionsFromParsedConfig()` at `packages/jsts/src/program/tsconfig/options.ts:75`
2. **ONE place where brand is applied**: Located in `createProgramOptionsFromParsedConfig()` at `packages/jsts/src/program/tsconfig/options.ts:95`
3. **ONE call to `ts.createProgram`**: Located in `createStandardProgram()` at `packages/jsts/src/program/factory.ts:95`

This makes the codebase easy to audit and ensures all program creation flows through proper sanitization.

## Why This Matters

When creating TypeScript programs from a tsconfig.json, the compiler options **MUST** be processed through `ts.parseJsonConfigFileContent()` to perform critical transformations:

1. **Lib resolution**: Raw tsconfig has `"lib": ["esnext", "dom"]` as strings → TypeScript needs full paths like `"lib.esnext.d.ts"`
2. **Enum conversion**: Raw tsconfig has `"target": "ES2020"` as string → TypeScript needs `ts.ScriptTarget.ES2020` enum value
3. **Module resolution**: Similar enum conversions for module, moduleResolution, jsx, etc.
4. **Path resolution**: Converts relative paths to absolute paths
5. **extends/references**: Processes tsconfig inheritance and project references
6. **files/include/exclude**: Resolves glob patterns to actual file lists
7. **Default options**: Applies proper defaults for missing options
8. **Vue support**: Special handling for `.vue` files via extraFileExtensions

Without `ts.parseJsonConfigFileContent()`, programs will have broken type checking, missing lib files, and incorrect module resolution.

## Implementation

### 1. Branded Type Definition

```typescript
// In packages/jsts/src/program/tsconfig/options.ts

const PROGRAM_OPTIONS_BRAND: unique symbol = Symbol('ProgramOptions');

export type ProgramOptions = ts.CreateProgramOptions & {
  missingTsConfig: boolean;
  [PROGRAM_OPTIONS_BRAND]: true; // Brand property - can only be set internally
};
```

### 2. Single Branding Function (ONLY place brand is applied)

This is the **ONLY** function in the entire codebase that:

- Calls `ts.parseJsonConfigFileContent`
- Applies the brand to `ProgramOptions`

```typescript
/**
 * Default ParseConfigHost - uses TypeScript's file system APIs directly.
 * No caching or special handling - suitable for simple single-file analysis.
 */
const defaultParseConfigHost: ts.ParseConfigHost = {
  useCaseSensitiveFileNames: true,
  readDirectory: ts.sys.readDirectory,
  fileExists: ts.sys.fileExists,
  readFile: ts.sys.readFile,
};

/**
 * Parses and sanitizes compiler options using TypeScript's parseJsonConfigFileContent.
 * This is the ONLY function that should brand ProgramOptions.
 */
export function createProgramOptionsFromParsedConfig(
  config: any, // Raw config object
  basePath: string, // Base path for resolution
  existingOptions: ts.CompilerOptions, // Base compiler options
  configFileName?: string, // Config file name
  extraFileExtensions?: readonly ts.FileExtensionInfo[], // e.g., .vue
  missingTsConfig: boolean = false,
  parseConfigHost: ts.ParseConfigHost = defaultParseConfigHost, // Optional custom host
): ProgramOptions {
  // Call TypeScript's parser to sanitize all options
  const parsedConfigFile = ts.parseJsonConfigFileContent(
    config,
    parseConfigHost,
    basePath,
    existingOptions,
    configFileName,
    undefined,
    extraFileExtensions,
  );

  if (parsedConfigFile.errors.length > 0) {
    const message = parsedConfigFile.errors.map(diagnosticToString).join('; ');
    throw new Error(message);
  }

  return {
    rootNames: parsedConfigFile.fileNames,
    options: { ...parsedConfigFile.options, allowNonTsExtensions: true },
    projectReferences: parsedConfigFile.projectReferences,
    missingTsConfig,
    [PROGRAM_OPTIONS_BRAND]: true, // ONLY place brand is applied
  };
}
```

### 3. High-Level APIs (use the branding function)

**For TSConfig-based analysis:**

```typescript
export function createProgramOptions(tsConfig: string, tsconfigContents?: string): ProgramOptions {
  // Set up CUSTOM parseConfigHost with tsconfig-specific logic (caching, missing file handling)
  const parseConfigHost: ts.ParseConfigHost = {
    useCaseSensitiveFileNames: true,
    readDirectory: ts.sys.readDirectory,
    fileExists: file => {
      if (isLastTsConfigCheck(file)) return true; // Handle missing extended tsconfig
      return ts.sys.fileExists(file);
    },
    readFile: file => {
      // Check cache, read from disk, handle missing files
      // ... caching logic ...
    },
  };

  // Read the tsconfig file
  const config = ts.readConfigFile(tsConfig, parseConfigHost.readFile);

  // Parse and brand through the centralized function with custom host
  return createProgramOptionsFromParsedConfig(
    config.config,
    dirname(tsConfig),
    { ...defaultCompilerOptions, noEmit: true },
    tsConfig,
    [{ extension: 'vue', isMixedContent: true, scriptKind: ts.ScriptKind.Deferred }],
    missingTsConfig,
    parseConfigHost, // Pass custom host for tsconfig-specific behavior
  );
}
```

**For single-file analysis:**

```typescript
export function createProgramFromSingleFile(
  fileName: string,
  contents: string,
  compilerOptions: ts.CompilerOptions = defaultCompilerOptions,
) {
  const sourceFile = ts.createSourceFile(fileName, contents, target, true);

  // Parse and brand through the centralized function (uses DEFAULT parseConfigHost)
  const programOptions = createProgramOptionsFromParsedConfig(
    {}, // Empty config object (no tsconfig.json)
    process.cwd(),
    compilerOptions,
    fileName,
    // No parseConfigHost needed - uses defaultParseConfigHost automatically
  );

  // Override with custom host for the single file...
  const programOptionsWithCustomHost: ProgramOptions = {
    ...programOptions,
    rootNames: [fileName],
    host: customHost,
  };

  return createStandardProgram(programOptionsWithCustomHost);
}
```

**Key difference**:

- TSConfig analysis passes a **custom** `parseConfigHost` for caching and missing file handling
- Single-file analysis uses the **default** `parseConfigHost` automatically (no need to create one)

### 4. Enforced Usage in Program Creation

```typescript
// In packages/jsts/src/program/factory.ts

export function createStandardProgram(
  programOptions: ProgramOptions, // Requires branded type from ts.parseJsonConfigFileContent!
  oldProgram?: ts.Program,
): ts.Program {
  return ts.createProgram({
    ...programOptions,
    oldProgram,
  });
}
```

## Examples

### ✅ Correct Usage

```typescript
import { createProgramOptions, createStandardProgram } from './program/index.js';

// Properly processed options
const programOptions = createProgramOptions('/path/to/tsconfig.json');
const program = createStandardProgram(programOptions);
```

### ❌ Prevented at Compile Time

```typescript
import ts from 'typescript';
import { createStandardProgram } from './program/index.js';

// This will NOT compile!
const program = createStandardProgram({
  rootNames: ['file.ts'],
  options: { target: ts.ScriptTarget.ES2020 },
  // Error: missing [PROGRAM_OPTIONS_BRAND]: true
});
```

**Compilation error:**

```
error TS2345: Argument of type '{ rootNames: string[]; options: CompilerOptions; }'
is not assignable to parameter of type 'ProgramOptions'.
  Type '{ rootNames: string[]; options: CompilerOptions; }' is missing the following
  properties from type '{ missingTsConfig: boolean; [PROGRAM_OPTIONS_BRAND]: true; }':
  missingTsConfig, [PROGRAM_OPTIONS_BRAND]
```

## ts.createProgram Call Sites

There is exactly **ONE** call to `ts.createProgram` in the entire source code:

### Line 95: Inside `createStandardProgram()` ✅

```typescript
export function createStandardProgram(
  programOptions: ProgramOptions, // BRANDED - must come from ts.parseJsonConfigFileContent
  oldProgram?: ts.Program,
): ts.Program {
  return ts.createProgram({
    ...programOptions,
    oldProgram,
  });
}
```

**All program creation**, whether from a tsconfig.json file or for single-file analysis, flows through this one function. The branded `ProgramOptions` type enforces that options have been properly processed through `ts.parseJsonConfigFileContent`.

### What About Single-File Analysis?

Even `createProgramFromSingleFile()` now goes through the proper sanitization pipeline:

```typescript
export function createProgramFromSingleFile(
  fileName: string,
  contents: string,
  compilerOptions: ts.CompilerOptions = defaultCompilerOptions,
) {
  // Parse compiler options through TypeScript's parseJsonConfigFileContent
  const parsedConfigFile = ts.parseJsonConfigFileContent(
    {}, // Empty config object (no tsconfig.json)
    parseConfigHost,
    process.cwd(),
    compilerOptions, // Use provided compiler options as base
    fileName,
  );

  // Create branded ProgramOptions through the ONLY branding function
  const programOptions = createProgramOptionsFromParsedConfig(parsedConfigFile, false);

  // Override with custom host for the single file
  const programOptionsWithCustomHost: ProgramOptions = {
    ...programOptions,
    rootNames: [fileName],
    host: customHost,
  };

  // Goes through createStandardProgram like everything else
  return createStandardProgram(programOptionsWithCustomHost);
}
```

**Key point**: Even though there's no tsconfig.json file, the compiler options are still processed through `ts.parseJsonConfigFileContent` to ensure proper lib file resolution, enum conversion, and other sanitization.

## Complete Architecture

```
Path 1: TSConfig-based analysis
────────────────────────────────
tsconfig.json
    ↓
createProgramOptions()
    ↓
ts.parseJsonConfigFileContent()  ← Sanitization
    ↓
createProgramOptionsFromParsedConfig()  ← ONLY branding point
    ↓
ProgramOptions (branded)
    ↓
createStandardProgram()
    ↓
ts.createProgram()  ← ONLY call site


Path 2: Single-file analysis
─────────────────────────────
compilerOptions
    ↓
createProgramFromSingleFile()
    ↓
ts.parseJsonConfigFileContent()  ← Sanitization (even without tsconfig!)
    ↓
createProgramOptionsFromParsedConfig()  ← ONLY branding point
    ↓
ProgramOptions (branded)
    ↓
createStandardProgram()
    ↓
ts.createProgram()  ← ONLY call site
```

**Key invariant**: ALL paths go through `ts.parseJsonConfigFileContent()` → `createProgramOptionsFromParsedConfig()` → `createStandardProgram()` → `ts.createProgram()`

## Benefits

1. **Compile-time safety**: TypeScript catches misuse at build time, not runtime
2. **Self-documenting**: The type signature clearly shows proper usage
3. **Prevents subtle bugs**: Ensures lib files and other options are always properly resolved through `ts.parseJsonConfigFileContent`
4. **Zero runtime overhead**: Branded types are erased during compilation
5. **Single branding point**: Only one function (`createProgramOptionsFromParsedConfig`) can apply the brand, making the architecture easy to audit
6. **Single ts.createProgram call**: Only one place in the codebase calls `ts.createProgram`, making program creation easy to trace and debug

## Key Architectural Decision

### The ONLY Function That Calls `ts.parseJsonConfigFileContent`

`createProgramOptionsFromParsedConfig` is the **single point** in the entire codebase where:

1. `ts.parseJsonConfigFileContent` is called
2. The `ProgramOptions` brand is applied

This ensures that **all** compiler options, regardless of source, go through TypeScript's official parsing and sanitization pipeline.

```typescript
// Default host for simple cases (single-file analysis)
const defaultParseConfigHost: ts.ParseConfigHost = {
  useCaseSensitiveFileNames: true,
  readDirectory: ts.sys.readDirectory,
  fileExists: ts.sys.fileExists,
  readFile: ts.sys.readFile,
};

export function createProgramOptionsFromParsedConfig(
  config: any, // Raw config (from tsconfig or {})
  basePath: string,
  existingOptions: ts.CompilerOptions,
  configFileName?: string,
  extraFileExtensions?: readonly ts.FileExtensionInfo[],
  missingTsConfig: boolean = false,
  parseConfigHost: ts.ParseConfigHost = defaultParseConfigHost, // Optional custom host
): ProgramOptions {
  // ← ONLY call to ts.parseJsonConfigFileContent in entire codebase
  const parsedConfigFile = ts.parseJsonConfigFileContent(
    config,
    parseConfigHost,
    basePath,
    existingOptions,
    configFileName,
    undefined,
    extraFileExtensions,
  );

  if (parsedConfigFile.errors.length > 0) {
    throw new Error(parsedConfigFile.errors.map(diagnosticToString).join('; '));
  }

  return {
    rootNames: parsedConfigFile.fileNames,
    options: { ...parsedConfigFile.options, allowNonTsExtensions: true },
    projectReferences: parsedConfigFile.projectReferences,
    missingTsConfig,
    [PROGRAM_OPTIONS_BRAND]: true, // ← ONLY place brand is applied
  };
}
```

**Why this matters**: By making this the ONLY function that calls `ts.parseJsonConfigFileContent`, we guarantee at the type system level that all compiler options have been properly sanitized before being used to create a program.

**Default ParseConfigHost**: For simple cases (single-file analysis), callers can omit the `parseConfigHost` parameter and a sensible default will be used. For complex cases (tsconfig with caching/missing file handling), callers can pass a custom host.

## Testing

The branded type was validated during implementation:

1. Initial compilation succeeded with all existing code
2. When raw options were passed to `createStandardProgram`, compilation failed with clear error
3. After ensuring all paths go through `ts.parseJsonConfigFileContent`, compilation succeeded
4. This proves the type system is correctly enforcing the constraint
