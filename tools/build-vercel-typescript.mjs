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
import { mkdir, writeFile, copyFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { resolve } from 'node:path';
import { compilerInputs } from './compiler-provider-plugin.mjs';
import selectProvider from '../packages/typescript/selection.cjs';
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
  external: ['../../errors.cjs'],
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
            filter: /tsc-ts-source[/\\]packages[/\\]tsc-ts[/\\]src[/\\]compiler[/\\]tsconfig\.ts$/,
          },
          ({ path }) => {
            let text = readFileSync(path, 'utf8');
            const before =
              'const extensionsWithJson = getSupportedExtensionsWithJsonIfResolveJsonModule(options);';
            const directoryCall = 'const matched = readDirectory(';
            if (!text.includes(before) || !text.includes(directoryCall))
              throw new Error('Pinned config host patch is stale');
            text = text.replace(
              before,
              'const extensionsWithJson = [...getSupportedExtensionsWithJsonIfResolveJsonModule(options), ...(this.extraFileExtensions ?? []).map(extension => [extension])];',
            );
            text = text.replace(
              directoryCall,
              'const matched = this.readDirectory ? this.readDirectory(basePath, flattenExtensions(extensionsWithJson), specs.validatedExcludeSpecs, includes) : readDirectory(',
            );
            return {
              contents: text + '\nexport { ConfigFileConverter, parseConfigText };',
              loader: 'ts',
            };
          },
        );
        build.onLoad(
          { filter: /tsc-ts-source[/\\]packages[/\\]tsc-ts[/\\]src[/\\]compiler[/\\]options\.ts$/ },
          ({ path }) => {
            const text = readFileSync(path, 'utf8');
            const before =
              'resolution !== undefined &&\n    resolution !== ModuleResolutionKind.Classic &&\n    resolution !== ModuleResolutionKind.Node10';
            if (!text.includes(before)) throw new Error('Pinned legacy options patch is stale');
            return { contents: text.replace(before, 'resolution !== undefined'), loader: 'ts' };
          },
        );
        build.onLoad(
          {
            filter:
              /tsc-ts-source[/\\]packages[/\\]tsc-ts[/\\]src[/\\]compiler[/\\]module-resolution\.ts$/,
          },
          ({ path }) => {
            const text = readFileSync(path, 'utf8');
            const before = 'const result = state.resolveNodeLike();';
            if (!text.includes(before)) throw new Error('Pinned legacy resolver patch is stale');
            return {
              contents:
                `import { resolveClassic } from ${JSON.stringify(resolve('packages/typescript/providers/vercel/legacyResolution.mjs').replaceAll('\\', '/'))};\n` +
                text.replace(
                  before,
                  'const result = kind === ModuleResolutionKind.Classic ? resolveClassic(state) : state.resolveNodeLike();',
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
// Check the new source inputs without merging this provider's previous build metadata.
compilerInputs({ ...selectProvider('vercel'), metafile: undefined }, result.metafile.inputs);
await mkdir('target', { recursive: true });
await writeFile('target/vercel-typescript-metafile.json', JSON.stringify(result.metafile));

// Declaration resources come from the pinned TS7 distribution, independently of TS6.
const require = createRequire(import.meta.url);
const librarySource = join(
  dirname(
    require.resolve(`@typescript/native-preview-${process.platform}-${process.arch}/package.json`),
  ),
  'lib',
);
const libraryTarget = 'packages/typescript/providers/vercel/lib';
await mkdir(libraryTarget, { recursive: true });
for (const file of await readdir(librarySource)) {
  if (/^lib.*\.d\.ts$/.test(file))
    await copyFile(join(librarySource, file), join(libraryTarget, file));
}
