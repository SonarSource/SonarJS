import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  compilerEntry,
  supportedRoot,
  metadataEntry,
  controlEntries,
  findCompilerRoot,
  getImplementationRoots,
} from '../packages/typescript/boundary.cjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const owned = path.join(root, 'packages/typescript');
const classic = path.join(root, 'node_modules/typescript-classic');
const inside = (file, directory) => file === directory || file.startsWith(directory + path.sep);
const privateRoots = getImplementationRoots(owned, classic);
const privateImporter = file => privateRoots.some(directory => inside(file, directory));

// Runtime hooks cannot inspect imports that esbuild has already inlined. Enforce
// the same boundary before bundling, not through a global package-name alias.
export function typescriptModulePlugin() {
  const packages = new Map();
  return {
    name: 'sonarjs-typescript-module',
    setup(build) {
      build.initialOptions.define = { ...build.initialOptions.define, __SONARJS_BUNDLED__: 'true' };
      build.onResolve({ filter: /.*/ }, async args => {
        if (args.pluginData?.typescriptResolved || !args.importer || privateImporter(args.importer))
          return;
        if (compilerEntry.test(args.path)) {
          if (controlEntries.has(args.path))
            return {
              path: path.join(
                owned,
                args.path.endsWith('control')
                  ? args.kind === 'require-call'
                    ? 'control.cjs'
                    : 'control.mjs'
                  : 'errors.cjs',
              ),
            };
          if (supportedRoot.test(args.path))
            return {
              path: path.join(owned, args.kind === 'require-call' ? 'index.cjs' : 'index.mjs'),
            };
          if (metadataEntry.test(args.path)) return { path: path.join(owned, 'package.json') };
          throw new Error(
            `Unsupported compiler entry in bundle: ${args.path} from ${args.importer}`,
          );
        }
        const resolved = await build.resolve(args.path, {
          importer: args.importer,
          resolveDir: args.resolveDir,
          kind: args.kind,
          pluginData: { typescriptResolved: true },
        });
        if (
          !resolved.errors.length &&
          !resolved.external &&
          findCompilerRoot(resolved.path, packages, owned)
        )
          throw new Error(
            `Import bypasses the owned TypeScript module: ${args.path} from ${args.importer}`,
          );
      });
    },
  };
}
