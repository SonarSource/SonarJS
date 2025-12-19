/**
 * ESM Loader Hook: Patchable FS Module
 *
 * PROBLEM:
 * In ESM, monkey-patching Node.js built-in modules like `fs` doesn't work for all import patterns.
 * When you do `fs.readFileSync = patched`, only default imports see the patch:
 *
 *   import fs from 'fs';           // ✅ fs.readFileSync sees patch
 *   import { readFileSync } from 'fs';  // ❌ Still uses original!
 *   import * as fs from 'fs';      // ❌ Still uses original!
 *
 * This is because ESM named imports bind directly to the module's export, not to a property
 * on an object. The binding is established at import time and cannot be changed.
 *
 * SOLUTION:
 * This loader intercepts all fs-related imports and replaces them with synthetic
 * modules that re-export all functions as delegating wrappers:
 *
 * Intercepted specifiers:
 *   - fs, node:fs
 *   - fs/promises, node:fs/promises
 *
 *   // What the loader generates:
 *   import { createRequire } from 'node:module';
 *   const require = createRequire('<loader-url>');  // Real URL, not custom:
 *   const fs = require('fs');  // Bypasses ESM loader, gets real fs
 *   export function readFileSync(...args) { return fs.readFileSync(...args); }
 *   export function existsSync(...args) { return fs.existsSync(...args); }
 *   // ... all other fs functions
 *   export default fs;
 *
 * WHY THIS WORKS:
 * The wrapper functions are ESM exports (immutable bindings), but their bodies perform
 * a dynamic property lookup on the mutable `fs` object at CALL TIME, not export time.
 *
 *   // This is what gets exported - the function itself is fixed
 *   export function readFileSync(...args) {
 *     return fs.readFileSync(...args);  // ← fs.readFileSync looked up when CALLED
 *   }
 *
 * When you patch `fs.readFileSync = myPatch`:
 *   1. Import time: `readFileSync` export → wrapper function (fixed, immutable)
 *   2. Patch time: `fs.readFileSync = myPatch` → modifies fs object property
 *   3. Call time: wrapper runs `fs.readFileSync(...)` → finds `myPatch`!
 *
 * Compare to approaches that DON'T work:
 *
 *   // Direct re-export - binding is frozen at import time
 *   export { readFileSync } from 'fs';  // ❌ Always points to original
 *
 *   // Named import then re-export - same problem
 *   import { readFileSync } from 'fs';
 *   export { readFileSync };  // ❌ Always points to original
 *
 * The wrapper adds indirection: immutable ESM binding → mutable object property lookup.
 *
 * HOW IT WORKS:
 *
 *   ┌─────────────────────────────────────────────────────────────────────────┐
 *   │  LOADER THREAD (runs once at startup)                                  │
 *   │                                                                         │
 *   │  1. resolve('fs') → returns 'custom:fs-wrapped'                        │
 *   │  2. load('custom:fs-wrapped') → returns generated wrapper source       │
 *   └─────────────────────────────────────────────────────────────────────────┘
 *                                    │
 *                                    ▼
 *   ┌─────────────────────────────────────────────────────────────────────────┐
 *   │  MAIN THREAD (all runtime execution)                                   │
 *   │                                                                         │
 *   │  3. Wrapper module executes, imports real fs via require()             │
 *   │  4. Your code patches fs.readFileSync = myPatch                        │
 *   │  5. All imports (named, default, namespace) call wrapper functions     │
 *   │  6. Wrapper functions delegate to fs.readFileSync → sees your patch!   │
 *   └─────────────────────────────────────────────────────────────────────────┘
 *
 * IMPORTANT: The loader only generates code - it doesn't intercept calls at runtime.
 * All patching and fs operations happen in the main thread with direct method calls.
 * No IPC, no MessageChannel, no serialization needed.
 *
 * USAGE:
 *
 *   // register.mjs
 *   import { register } from 'node:module';
 *   register('./fs-wrapper-loader.mjs', import.meta.url);
 *
 *   // Run your app:
 *   node --import ./register.mjs your-app.mjs
 *
 *   // In your app, patch fs normally:
 *   import fs from 'fs';
 *   fs.readFileSync = (path, opts) => { ... };  // All imports will see this!
 *
 * USE CASES:
 * - Testing: Mock fs for unit tests
 * - Caching: Intercept file reads to serve from cache
 * - Logging: Trace all filesystem operations
 * - Metrics: Count/time fs operations
 *
 * @see https://nodejs.org/api/module.html#customization-hooks
 */

import { createRequire } from 'node:module';
import fs from 'node:fs'; // Safe here - loader runs in separate thread, doesn't trigger its own hooks

// Store loader's URL for use in generated code (custom URLs don't work with createRequire)
const LOADER_URL = import.meta.url;

/**
 * Dynamically generates ESM source code that wraps all exports from a module.
 * Functions become delegating wrappers, non-functions are re-exported directly.
 *
 * @param {object} moduleExports - The module's exports to wrap
 * @param {string} requireCall - The require() call to get the real module (bypasses ESM loader)
 * @param {string} objectName - The name of the object to delegate through
 */
function generateWrapperSource(moduleExports, requireCall, objectName) {
  const lines = [
    `// Auto-generated wrapper module`,
    `// All function calls delegate through the ${objectName} object, making patches visible`,
    ``,
    `// Use require() to get the real fs module - this bypasses ESM loader hooks`,
    `// Note: createRequire needs a real file URL, not our custom:fs-wrapped URL`,
    `import { createRequire } from 'node:module';`,
    `const require = createRequire('${LOADER_URL}');`,
    `const ${objectName} = ${requireCall};`,
    ``,
  ];

  for (const key of Object.keys(moduleExports)) {
    const value = moduleExports[key];

    if (typeof value === 'function') {
      // Wrap functions to delegate through the object
      // This is what makes patching work for named imports
      lines.push(`export function ${key}(...args) { return ${objectName}.${key}(...args); }`);
    } else {
      // Export non-functions directly (constants, classes, etc.)
      lines.push(`export const ${key} = ${objectName}.${key};`);
    }
  }

  lines.push(``);
  lines.push(`// Default export is the patchable object`);
  lines.push(`export default ${objectName};`);

  return lines.join('\n');
}

// Pre-generate the source at loader initialization
const wrappedFsSource = generateWrapperSource(fs, `require('fs')`, 'fs');

const wrappedFsPromisesSource = generateWrapperSource(
  fs.promises,
  `require('fs').promises`,
  'fsPromises',
);

/**
 * Resolve hook: Intercepts module specifier resolution.
 * Redirects 'fs', 'node:fs', 'fs/promises', and 'node:fs/promises' to custom URLs.
 */
export async function resolve(specifier, context, nextResolve) {
  // Intercept fs and node:fs
  if (specifier === 'fs' || specifier === 'node:fs') {
    return {
      url: 'custom:fs-wrapped',
      shortCircuit: true,
    };
  }

  // Intercept fs/promises and node:fs/promises
  if (specifier === 'fs/promises' || specifier === 'node:fs/promises') {
    return {
      url: 'custom:fs-promises-wrapped',
      shortCircuit: true,
    };
  }

  return nextResolve(specifier, context);
}

/**
 * Load hook: Provides source code for resolved modules.
 * Returns our generated wrapper for the custom URLs.
 */
export async function load(url, context, nextLoad) {
  if (url === 'custom:fs-wrapped') {
    return {
      format: 'module',
      source: wrappedFsSource,
      shortCircuit: true,
    };
  }

  if (url === 'custom:fs-promises-wrapped') {
    return {
      format: 'module',
      source: wrappedFsPromisesSource,
      shortCircuit: true,
    };
  }

  return nextLoad(url, context);
}
