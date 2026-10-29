import fs from 'node:fs';
import path from 'node:path';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';

const directory = process.env.SONARJS_TS7_SDK;
if (!directory || !path.isAbsolute(directory)) {
  throw new Error('SONARJS_TS7_SDK must name an absolute, built TypeScript package directory');
}
const manifest = path.join(directory, 'package.json');
const { name, exports } = JSON.parse(fs.readFileSync(manifest, 'utf8'));
if (name !== 'typescript' && name !== '@typescript/typescript') {
  throw new Error(`Unexpected TypeScript SDK package name: ${name}`);
}
const redirects = new Map(
  Object.entries(exports)
    .filter(([key]) => key.startsWith('./'))
    .map(([key, value]) => {
      const target = typeof value === 'string' ? value : value.default;
      if (typeof target !== 'string') throw new Error(`No built export for ${key}`);
      return [`typescript/${key.slice(2)}`, pathToFileURL(path.resolve(directory, target)).href];
    }),
);

// Load before production compatibility so its channel path and metadata also
// resolve to this SDK. Bare TypeScript imports remain classic compatibility.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('typescript-native/')) {
      const resolved = redirects.get(specifier.replace('typescript-native/', 'typescript/'));
      if (!resolved) throw new Error(`Source SDK does not export ${specifier}`);
      return { url: resolved, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});
