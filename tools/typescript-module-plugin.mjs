import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const owned = path.join(root, 'packages/typescript');
const classic = path.join(root, 'node_modules/typescript-classic');
const normalize = file => file.replaceAll('\\', '/');
const inside = (file, directory) => file === directory || file.startsWith(directory + path.sep);
const privateImporter = file =>
  inside(file, owned) ||
  inside(file, classic) ||
  /\/(?:packages|lib)\/analysis\/src\/jsts\/native\//.test(normalize(file));
const compilerEntry =
  /^(?:typescript(?:-classic|-native)?|@typescript\/(?:native-preview|api))(?:\/|$)/;

// Runtime hooks cannot inspect imports that esbuild has already inlined. Enforce
// the same boundary before bundling, not through a global package-name alias.
export function typescriptModulePlugin() {
  const packages = new Map();
  function compilerPackage(file) {
    if (!normalize(file).includes('/node_modules/')) return false;
    let directory = path.dirname(file);
    const visited = [];
    let result = false;
    while (path.dirname(directory) !== directory) {
      if (packages.has(directory)) {
        result = packages.get(directory);
        break;
      }
      visited.push(directory);
      const manifest = path.join(directory, 'package.json');
      if (fs.existsSync(manifest)) {
        const name = JSON.parse(fs.readFileSync(manifest, 'utf8')).name;
        if (name) {
          result = ['typescript', '@typescript/api', '@typescript/native-preview'].includes(name);
          break;
        }
      }
      directory = path.dirname(directory);
    }
    for (const item of visited) packages.set(item, result);
    return result;
  }
  return {
    name: 'sonarjs-typescript-module',
    setup(build) {
      build.initialOptions.define = { ...build.initialOptions.define, __SONARJS_BUNDLED__: 'true' };
      build.onResolve({ filter: /.*/ }, async args => {
        if (args.pluginData?.typescriptResolved || !args.importer || privateImporter(args.importer))
          return;
        if (compilerEntry.test(args.path)) {
          if (['typescript/control', 'typescript/errors'].includes(args.path))
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
          if (
            /^(?:typescript|typescript-classic)(?:\/lib\/(?:typescript|tsserverlibrary)(?:\.js)?)?$/.test(
              args.path,
            )
          )
            return {
              path: path.join(owned, args.kind === 'require-call' ? 'index.cjs' : 'index.mjs'),
            };
          if (/^(?:typescript|typescript-classic)\/package\.json$/.test(args.path))
            return { path: path.join(owned, 'package.json') };
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
        if (!resolved.errors.length && !resolved.external && compilerPackage(resolved.path))
          throw new Error(
            `Import bypasses the owned TypeScript module: ${args.path} from ${args.importer}`,
          );
      });
    },
  };
}
