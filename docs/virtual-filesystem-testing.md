# Virtual Filesystem for Testing

This document describes approaches to intercept Node.js filesystem calls for unit testing, enabling tests to run against in-memory filesystems instead of real disk fixtures.

## Overview

Virtual filesystems provide several benefits for testing:

- **No fixture files to manage** - Tests define their filesystem inline
- **Faster execution** - In-memory operations are faster than disk I/O
- **Better isolation** - No side effects between tests
- **Easier edge cases** - Simulate errors, permissions, missing files
- **Parallel-safe** - No conflicts when tests run concurrently

## Popular npm Packages

| Package       | Description                      | Use Case                   |
| ------------- | -------------------------------- | -------------------------- |
| **memfs**     | Full in-memory fs implementation | Primary virtual fs         |
| **unionfs**   | Combines multiple filesystems    | Overlay virtual on real fs |
| **fs-monkey** | Patching utilities for fs        | Runtime patching           |
| **mock-fs**   | Patches native fs bindings       | Lower-level interception   |

## Approach 1: ESM Module Hooks (Recommended)

Node.js 20.6+ supports module hooks via `--import` that can intercept ALL module imports before any code runs. This catches filesystem usage from TypeScript, ESLint, and any other dependency.

### Step 1: Create the Hook Registration File

```typescript
// tests/hooks/register.mjs
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('./fs-hook.mjs', pathToFileURL('./'));
```

### Step 2: Create the Filesystem Hook

```typescript
// tests/hooks/fs-hook.mjs
import { vol, fs as memfs } from 'memfs';

// Make vol globally accessible for tests to configure
globalThis.__virtualFs = vol;

const FS_MODULES = new Set(['fs', 'node:fs', 'fs/promises', 'node:fs/promises']);

export async function resolve(specifier, context, nextResolve) {
  if (FS_MODULES.has(specifier)) {
    return {
      url: 'virtual-fs://' + specifier,
      shortCircuit: true,
    };
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.startsWith('virtual-fs://')) {
    const specifier = url.replace('virtual-fs://', '');

    if (specifier === 'fs' || specifier === 'node:fs') {
      return {
        format: 'module',
        shortCircuit: true,
        source: `
          import { fs } from 'memfs';
          export const {
            readFileSync, writeFileSync, existsSync, mkdirSync,
            readdirSync, statSync, lstatSync, unlinkSync, rmdirSync,
            copyFileSync, renameSync, chmodSync, accessSync,
            createReadStream, createWriteStream, watch, watchFile,
            unwatchFile, realpathSync, readlinkSync, symlinkSync,
            linkSync, fstatSync, ftruncateSync, futimesSync,
            fsyncSync, fdatasyncSync, closeSync, openSync, readSync,
            writeSync, appendFileSync, truncateSync, utimesSync,
            lutimesSync, constants, Dir, Dirent, Stats,
            ReadStream, WriteStream
          } = fs;
          export const promises = fs.promises;
          export default fs;
        `,
      };
    }

    if (specifier === 'fs/promises' || specifier === 'node:fs/promises') {
      return {
        format: 'module',
        shortCircuit: true,
        source: `
          import { fs } from 'memfs';
          export const {
            readFile, writeFile, appendFile, access, copyFile,
            open, rename, truncate, rm, rmdir, mkdir, readdir,
            readlink, symlink, link, unlink, chmod, lchmod,
            lchown, chown, utimes, lutimes, realpath, mkdtemp,
            stat, lstat, opendir, watch, cp
          } = fs.promises;
          export default fs.promises;
        `,
      };
    }
  }

  return nextLoad(url, context);
}
```

### Step 3: Run Tests with the Hook

```bash
node --import ./tests/hooks/register.mjs --test packages/jsts/tests/**/*.test.ts
```

Or configure in `package.json`:

```json
{
  "scripts": {
    "test:virtual": "node --import ./tests/hooks/register.mjs --test"
  }
}
```

### Step 4: Configure Virtual Filesystem in Tests

```typescript
// In your test file
declare const __virtualFs: typeof import('memfs').vol;

beforeEach(() => {
  __virtualFs.reset();
  __virtualFs.fromJSON({
    '/project/tsconfig.json': JSON.stringify({
      compilerOptions: { strict: true },
    }),
    '/project/src/index.ts': 'const x: number = 1;;',
  });
});

afterEach(() => {
  __virtualFs.reset();
});
```

### Verification

Add debug logging to verify interception:

```typescript
// In fs-hook.mjs resolve function
if (FS_MODULES.has(specifier)) {
  console.log(`[fs-hook] Intercepted: ${specifier} from ${context.parentURL}`);
  // ...
}
```

Output will show all intercepted calls:

```
[fs-hook] Intercepted: fs from file:///node_modules/typescript/lib/typescript.js
[fs-hook] Intercepted: fs from file:///node_modules/@typescript-eslint/parser/...
[fs-hook] Intercepted: fs/promises from file:///packages/jsts/src/...
```

## Approach 2: mock-fs (Native Binding Level)

`mock-fs` patches at the native binding level (`process.binding('fs')`), which is even lower than module resolution.

### Basic Usage

```typescript
import mock from 'mock-fs';
import path from 'path';

beforeEach(() => {
  mock({
    '/project': {
      'tsconfig.json': '{"compilerOptions": {}}',
      src: {
        'index.ts': 'const x = 1;',
      },
    },
    // Important: include node_modules so TypeScript libs still work
    node_modules: mock.load(path.resolve('node_modules')),
  });
});

afterEach(() => {
  mock.restore();
});
```

### Key Consideration

The `mock.load()` function is essential - it allows real access to `node_modules` while virtualizing project files. Without it, TypeScript's lib files won't be accessible.

## Approach 3: Hybrid with unionfs

Overlay a virtual filesystem on top of the real one:

```typescript
import { vol } from 'memfs';
import { Union } from 'unionfs';
import * as realFs from 'fs';
import { patchFs } from 'fs-monkey';

const ufs = new Union();
ufs.use(realFs); // Real fs as base
ufs.use(vol); // Virtual fs overlaid on top

patchFs(ufs);

// Now virtual files take precedence, but real files are still accessible
vol.fromJSON({
  '/project/src/index.ts': 'virtual content',
});

// Reading /project/src/index.ts returns 'virtual content'
// Reading /real/path/file.ts falls through to real fs
```

## Comparison

| Approach      | Pros                                          | Cons                                    |
| ------------- | --------------------------------------------- | --------------------------------------- |
| **ESM Hooks** | Clean, modern, explicit, catches everything   | Requires Node 20.6+, ESM only           |
| **mock-fs**   | Works everywhere, battle-tested, native level | Global state, must include node_modules |
| **unionfs**   | Flexible overlay, gradual adoption            | More complex setup                      |

## TypeScript Considerations

TypeScript uses `ts.sys` which wraps Node's `fs` module. Both ESM hooks and mock-fs approaches will intercept these calls since they operate below the TypeScript abstraction layer.

The existing `IncrementalCompilerHost` in this codebase already provides some filesystem abstraction for TypeScript program creation, which can work alongside virtual filesystem approaches.

## Recommendations

1. **For new test files**: Consider using the ESM hooks approach with memfs for complete isolation
2. **For existing tests**: The current fixture-based approach works well; migrate gradually if needed
3. **For integration tests**: Keep real fixtures as they test actual file system behavior
4. **For edge case testing**: Virtual fs makes it easy to test error conditions (ENOENT, EACCES, etc.)

## Resources

- [memfs documentation](https://github.com/streamich/memfs)
- [mock-fs documentation](https://github.com/tschaub/mock-fs)
- [Node.js ESM Loaders](https://nodejs.org/api/esm.html#loaders)
- [fs-monkey documentation](https://github.com/nicolo-ribaudo/fs-monkey)
