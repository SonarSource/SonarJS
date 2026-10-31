import fs from 'node:fs';
import path from 'node:path';
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import { findCompilerRoot } from '../../packages/typescript/boundary.cjs';

// Load before the compiler, transpiler and application. Physical removal is the
// primary test; this prevents an unexpected absolute/nested copy from rescuing it.
const owned = path.resolve('packages/typescript');
const cache = new Map();
const loaded = new Map();
const attempts = [];
function identity(file) {
  const directory = findCompilerRoot(file, cache, owned);
  if (!directory) return undefined;
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'package.json'), 'utf8'));
  return { root: directory, version: manifest.version, name: manifest.name };
}

registerHooks({
  resolve(specifier, context, next) {
    if (/typescript/.test(specifier)) attempts.push({ specifier, importer: context.parentURL });
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.startsWith('file:')) {
      const file = fileURLToPath(url);
      const compiler = identity(file);
      if (compiler) {
        if (compiler.name === 'typescript' && Number(compiler.version.split('.')[0]) < 7)
          throw new Error(`Classic TypeScript execution is forbidden: ${file}`);
        loaded.set(file, compiler);
      }
    }
    return next(url, context);
  },
});
process.on('exit', () => {
  if (process.env.SONARJS_NO_CLASSIC_AUDIT)
    fs.writeFileSync(
      process.env.SONARJS_NO_CLASSIC_AUDIT,
      JSON.stringify({ attempts, loadedCompilers: [...loaded] }, null, 2),
    );
});
