/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import configuration from '../packages/typescript/providers.json' with { type: 'json' };
import wasm from 'tsgo-wasm/package.json' with { type: 'json' };
import { prepareNativeAssets } from './prepare-tsgo-provider.mjs';

// Registered reference providers remain executable in the common conformance suite.
prepareNativeAssets();

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const descriptor = configuration.providers['tsgo-wasm'];
const sdkManifest = require.resolve(`${descriptor.sdk}/package.json`);
const sdkRoot = path.dirname(sdkManifest);
const sdk = JSON.parse(fs.readFileSync(sdkManifest, 'utf8'));
const wasmRoot = path.dirname(require.resolve(descriptor.wasmPackage));
if (wasm.name !== descriptor.wasmPackage) throw new Error('Unexpected TSGo WASM distribution');
if (sdk.gitHead !== wasm.buildInfo?.commit)
  throw new Error('TSGo WASM and JavaScript SDK must be built from the same source commit');
const output = path.resolve(root, 'target/tsgo-wasm');
const assets = path.resolve(root, 'packages/typescript', descriptor.libraries);
fs.mkdirSync(assets, { recursive: true });
for (const name of ['tsgo.wasm', 'LICENSE'])
  fs.copyFileSync(path.join(wasmRoot, name), path.join(assets, name));

// Standard declarations are architecture independent. Resolve from this SDK's
// own dependency graph, so an installed native reference SDK cannot supply them.
const sdkRequire = createRequire(sdkManifest);
const platform = `${process.platform}-${process.arch}`;
const platformName = `@typescript/${sdk.name}-${platform}`;
const nativeManifest = sdkRequire.resolve(`${platformName}/package.json`);
const nativeRoot = path.dirname(nativeManifest);
if (JSON.parse(fs.readFileSync(nativeManifest, 'utf8')).version !== sdk.version)
  throw new Error('TSGo WASM declarations and JavaScript SDK versions differ');
for (const name of fs.readdirSync(path.join(nativeRoot, 'lib')))
  if (name.endsWith('.d.ts'))
    fs.copyFileSync(path.join(nativeRoot, 'lib', name), path.join(assets, name));
fs.copyFileSync(path.join(sdkRoot, 'NOTICE.txt'), path.join(assets, 'NOTICE.txt'));
fs.writeFileSync(
  path.join(assets, 'version.json'),
  JSON.stringify(
    {
      version: sdk.version,
      wasmPackageVersion: wasm.version,
      sourceCommit: sdk.gitHead,
    },
    null,
    2,
  ) + '\n',
);

// Retain the Go runtime shipped with the pinned WASM binary, replacing only the
// CLI startup with an exported constructor and an injected filesystem object.
const launcher = fs.readFileSync(path.join(wasmRoot, 'tsgo-wasm'), 'utf8');
const marker = '\nconst go = new Go()';
if (launcher.split(marker).length !== 2 || !launcher.includes("import fs from 'node:fs'"))
  throw new Error('TSGo WASM launcher shape changed; review the Go runtime extraction');
const runtime = launcher
  .slice(0, launcher.indexOf(marker))
  .replace("import fs from 'node:fs'", 'const fs = globalThis.fs')
  .replace('class Go {', 'export class Go {');
await build({
  stdin: { contents: runtime, resolveDir: wasmRoot, sourcefile: 'tsgo-wasm/go-runtime.mjs' },
  outfile: path.join(assets, 'go-runtime.mjs'),
  bundle: true,
  platform: 'node',
  format: 'esm',
});
await build({
  entryPoints: [path.join(root, 'packages/typescript/providers/tsgo-wasm/worker.mjs')],
  outfile: path.join(assets, 'worker.mjs'),
  bundle: true,
  platform: 'node',
  format: 'esm',
});
const result = await build({
  entryPoints: [path.join(root, 'packages/typescript', descriptor.source)],
  outfile: path.join(output, 'provider.mjs'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  metafile: true,
  // The final analyzer bundle determines the deployed asset path.
  external: [],
  plugins: [
    {
      name: 'wasm-sync-transport',
      setup(build) {
        build.onLoad({ filter: /dist[/\\]ast[/\\]scanner\.js$/ }, args => {
          if (!args.path.startsWith(sdkRoot)) return;
          // Reuse the IPC beta's canonical scanner correction. Never maintain a
          // second copy of the patch when the same upstream defect persists.
          const patch = fs.readFileSync(
            path.join(root, 'patches/typescript-go+7.1.0-beta.patch'),
            'utf8',
          );
          const lines = patch
            .slice(patch.indexOf('@@'))
            .split('\n')
            .slice(1)
            .filter(line => /^[ +\-]/.test(line));
          const before = lines
            .filter(line => !line.startsWith('+'))
            .map(line => line.slice(1))
            .join('\n');
          const after = lines
            .filter(line => !line.startsWith('-'))
            .map(line => line.slice(1))
            .join('\n');
          const contents = fs.readFileSync(args.path, 'utf8');
          if (contents.split(before).length !== 2)
            throw new Error('TSGo WASM scanner changed; review the shared scanner correction');
          return { contents: contents.replace(before, after), loader: 'js' };
        });
        build.onResolve({ filter: /^#tsgo-wasm-msgpack$/ }, () => ({
          path: path.join(sdkRoot, 'dist/api/node/msgpack.js'),
        }));
        build.onResolve({ filter: /syncChannel\.js$/ }, args =>
          args.importer.startsWith(sdkRoot)
            ? {
                path: path.join(root, 'packages/typescript/providers/tsgo-wasm/channel.mjs'),
              }
            : undefined,
        );
      },
    },
  ],
});
fs.writeFileSync(
  path.join(output, 'provider-meta.json'),
  JSON.stringify(result.metafile, null, 2) + '\n',
);
