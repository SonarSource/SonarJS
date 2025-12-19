/**
 * FS Loader Registration Entry Point
 *
 * This file registers the fs-wrapper-loader using Node.js module.register() API.
 *
 * ════════════════════════════════════════════════════════════════════════════════
 * WHEN IS THIS LOADER NEEDED?
 * ════════════════════════════════════════════════════════════════════════════════
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ COMMONJS (require)                                                         │
 * │ Loader needed: NO ❌                                                        │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ In CommonJS, monkey-patching works natively:                               │
 * │                                                                             │
 * │   const fs = require('fs');                                                │
 * │   fs.readFileSync = patched;  // ✅ Works for ALL require('fs') calls      │
 * │                                                                             │
 * │ All require() calls return the same cached module object, so patching      │
 * │ the object's properties affects all consumers.                             │
 * │                                                                             │
 * │ Usage: Just patch fs directly, no loader needed.                           │
 * │                                                                             │
 * │   const fs = require('fs');                                                │
 * │   const original = fs.readFileSync;                                        │
 * │   fs.readFileSync = (...args) => myCache.get(...args) ?? original(...args);│
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ ESM with DEFAULT IMPORTS only                                              │
 * │ Loader needed: NO ❌                                                        │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ If your code AND all dependencies use only default imports:                │
 * │                                                                             │
 * │   import fs from 'fs';                                                     │
 * │   fs.readFileSync = patched;  // ✅ Works                                  │
 * │                                                                             │
 * │ The default export is an object, and patching its properties works.        │
 * │                                                                             │
 * │ Usage: Just patch fs directly, no loader needed.                           │
 * │                                                                             │
 * │   import fs from 'fs';                                                     │
 * │   const original = fs.readFileSync;                                        │
 * │   fs.readFileSync = (...args) => myCache.get(...args) ?? original(...args);│
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ ESM with NAMED or NAMESPACE IMPORTS                                        │
 * │ Loader needed: YES ✅                                                       │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ If your code OR any dependency uses named/namespace imports:               │
 * │                                                                             │
 * │   import { readFileSync } from 'fs';     // ❌ Won't see patches           │
 * │   import * as fs from 'fs';              // ❌ Won't see patches           │
 * │   const fs = await import('fs');         // ❌ Won't see patches           │
 * │                                                                             │
 * │ Named imports bind directly to the original function, bypassing any        │
 * │ patches applied to the fs object.                                          │
 * │                                                                             │
 * │ Usage: Register this loader before your app starts.                        │
 * │                                                                             │
 * │   node --import ./register.mjs your-app.mjs                                │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ ESM calling CJS libraries (e.g., TypeScript)                               │
 * │ Loader needed: NO ❌                                                        │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ If you're in ESM but the library you want to intercept uses CJS internally:│
 * │                                                                             │
 * │   // Your ESM code                                                         │
 * │   import fs from 'fs';                                                     │
 * │   fs.readFileSync = patched;                                               │
 * │                                                                             │
 * │   // TypeScript (CJS) internally does: require('fs').readFileSync(...)     │
 * │   // ✅ This WILL see your patch!                                          │
 * │                                                                             │
 * │ ESM default import and CJS require() return the SAME object.               │
 * │ Patching from ESM affects CJS consumers.                                   │
 * │                                                                             │
 * │ Usage: Just patch fs directly, no loader needed.                           │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ════════════════════════════════════════════════════════════════════════════════
 * SUMMARY
 * ════════════════════════════════════════════════════════════════════════════════
 *
 * │ Scenario                              │ Loader Needed │
 * │───────────────────────────────────────│───────────────│
 * │ CommonJS (require)                    │ NO            │
 * │ ESM default imports only              │ NO            │
 * │ ESM named imports ({ readFileSync })  │ YES           │
 * │ ESM namespace imports (* as fs)       │ YES           │
 * │ ESM dynamic imports (await import)    │ YES           │
 * │ ESM patching CJS libraries            │ NO            │
 *
 * ════════════════════════════════════════════════════════════════════════════════
 * USAGE (when loader IS needed)
 * ════════════════════════════════════════════════════════════════════════════════
 *
 *   node --import ./register.mjs your-app.mjs
 *
 * Or programmatically (must be before any fs imports):
 *
 *   await import('./register.mjs');
 *
 * After registration, patch fs normally:
 *
 *   import fs from 'fs';
 *   fs.readFileSync = (path, opts) => { ... };  // All imports will see this!
 *
 * NOTE: The older --experimental-loader flag is deprecated in Node.js 20+.
 * This file uses the recommended register() API instead.
 *
 * @see fs-wrapper-loader.mjs for detailed explanation of how the loader works
 */

import { register } from 'node:module';

// Register the loader hook
// Second argument is the parent URL for resolving the relative loader path
register('./fs-wrapper-loader.mjs', import.meta.url);
