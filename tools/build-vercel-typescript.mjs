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
import { build } from 'esbuild';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
// The source archive's workspace root omits package metadata. Give SBOM tooling
// the actual compiler identity and an immutable version derived from our pin.
const manifestPath = 'node_modules/tsc-ts-source/package.json';
const root = JSON.parse(readFileSync(manifestPath, 'utf8'));
const compiler = JSON.parse(
  readFileSync('node_modules/tsc-ts-source/packages/tsc-ts/package.json', 'utf8'),
);
const dependency = JSON.parse(readFileSync('package.json', 'utf8')).dependencies['tsc-ts-source'];
const revision = /\/([a-f0-9]{40})$/.exec(dependency)?.[1];
if (!revision) throw new Error('The Vercel compiler must be pinned to a source revision');
const identity = { version: `${compiler.version}-git.${revision}`, license: compiler.license };
await writeFile(
  manifestPath,
  JSON.stringify(
    {
      ...root,
      ...identity,
      repository: compiler.repository,
    },
    null,
    2,
  ),
);
// npm ls (and CycloneDX) prefers npm's generated installation inventory over
// package.json. Normalize both installed views from the same upstream identity.
const inventoryPath = 'node_modules/.package-lock.json';
if (existsSync(inventoryPath)) {
  const inventory = JSON.parse(readFileSync(inventoryPath, 'utf8'));
  const installed = inventory.packages?.['node_modules/tsc-ts-source'];
  if (!installed) throw new Error('Missing Vercel source installation inventory');
  Object.assign(installed, identity);
  await writeFile(inventoryPath, JSON.stringify(inventory, null, 2));
}
const result = await build({
  entryPoints: ['packages/typescript/providers/vercel/index.mjs'],
  outfile: 'packages/typescript/providers/vercel/runtime.cjs',
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: 'node22',
  external: ['../classic.cjs', '../../errors.cjs'],
  logLevel: 'warning',
  metafile: true,
  plugins: [
    {
      name: 'unknown-extension-script-kind',
      setup(build) {
        build.onLoad(
          { filter: /tsc-ts-source[/\\]packages[/\\]tsc-ts[/\\]src[/\\]library[/\\]host\.ts$/ },
          ({ path }) => {
            const text = readFileSync(path, 'utf8');
            const before =
              'new ParseOptions(path, ScriptKind.Unknown, externalModuleIndicatorOptions)';
            if (!text.includes(before)) throw new Error('Pinned tsc-ts host patch is stale');
            return {
              contents: text.replace(
                before,
                'new ParseOptions(path, /\\.[cm]?[jt]sx?$/i.test(fileName) ? ScriptKind.Unknown : ScriptKind.TS, externalModuleIndicatorOptions)',
              ),
              loader: 'ts',
            };
          },
        );
        build.onLoad(
          {
            filter:
              /tsc-ts-source[/\\]packages[/\\]tsc-ts[/\\]src[/\\]compiler[/\\]module-resolution\.ts$/,
          },
          ({ path }) => {
            const text = readFileSync(path, 'utf8');
            const before = '    const containingDirectory = getDirectoryPath(containingFile);';
            if (!text.includes(before)) throw new Error('Pinned tsc-ts resolver patch is stale');
            return {
              contents:
                `import { resolveLegacyModule } from ${JSON.stringify(resolve('packages/typescript/providers/vercel/legacyResolution.mjs').replaceAll('\\', '/'))};\n` +
                text.replace(
                  before,
                  '    const legacy = resolveLegacyModule(this, moduleName, containingFile, redirect);\n    if (legacy) return legacy;\n' +
                    before,
                ),
              loader: 'ts',
            };
          },
        );
        build.onLoad(
          {
            filter:
              /tsc-ts-source[/\\]packages[/\\]tsc-ts[/\\]src[/\\]compiler[/\\]checker-source-file\.ts$/,
          },
          ({ path }) => {
            const text = readFileSync(path, 'utf8');
            const before =
              '        checkTypeArgumentConstraintsOfReference(c, node, getTypeFromTypeNode(c, node));';
            if (!text.includes(before)) throw new Error('Pinned tsc-ts heritage patch is stale');
            return {
              contents: text.replace(
                before,
                '{\n' +
                  before +
                  '\n        checkDeprecatedTypeReference(c, node, getTypeFromTypeNode(c, node));\n      }',
              ),
              loader: 'ts',
            };
          },
        );
      },
    },
  ],
});
await mkdir('target', { recursive: true });
await writeFile('target/vercel-typescript-metafile.json', JSON.stringify(result.metafile));
