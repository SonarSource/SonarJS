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
import { readFileSync, cpSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import configuration from '../packages/typescript/providers.json' with { type: 'json' };
import selectProvider from '../packages/typescript/selection.cjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const packageRoot = resolve(root, 'packages/typescript');
const privateSdks = new Set(
  Object.values(configuration.providers).flatMap(provider => provider.sdk ?? []),
);

export function compilerProviderPlugin(provider = selectProvider()) {
  return {
    name: 'single-typescript-contract',
    setup(build) {
      build.initialOptions.define = {
        ...build.initialOptions.define,
        __SONARJS_COMPILER_BUNDLE__: 'true',
      };
      // Dependencies must not resolve nested copies of the compiler SDK.
      build.onResolve({ filter: /^typescript(?:\/|$)/ }, args => {
        if (args.pluginData?.ownedCompiler) return;
        return build.resolve(args.path, {
          resolveDir: root,
          kind: args.kind,
          pluginData: { ownedCompiler: true },
        });
      });
      build.onLoad({ filter: /packages[/\\]typescript[/\\]providers\.json$/ }, () => ({
        contents: JSON.stringify({
          defaultProvider: provider.name,
          providers: { [provider.name]: configuration.providers[provider.name] },
        }),
        loader: 'json',
      }));
      build.onLoad({ filter: /packages[/\\]typescript[/\\]registry\.cjs$/ }, () => ({
        contents: `const selectProvider = require('./selection.cjs');
          module.exports = name => {
            selectProvider(name);
            const loaded = require(${JSON.stringify(provider.module)});
            return loaded.default ?? loaded;
          };`,
        loader: 'js',
      }));
      for (const sdk of privateSdks) {
        const escaped = sdk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        build.onResolve({ filter: new RegExp(`^${escaped}(?:/|$)`) }, args => {
          if (provider.sdk !== sdk || args.importer !== resolve(packageRoot, provider.module)) {
            throw new Error(`Private compiler SDK import outside its provider: ${args.importer}`);
          }
        });
      }
      build.onEnd(result => {
        if (
          result.errors.length ||
          !build.initialOptions.outfile ||
          (!build.initialOptions.write && build.initialOptions.write !== undefined)
        )
          return;
        const destination = dirname(resolve(build.initialOptions.outfile));
        if (provider.bundleLibraries) {
          mkdirSync(destination, { recursive: true });
          cpSync(
            resolve(packageRoot, provider.libraries),
            resolve(destination, provider.libraryDestination ?? ''),
            { recursive: true },
          );
        }
      });
    },
  };
}

export function compilerInputs(provider, inputs) {
  const merged = { ...inputs };
  if (provider.metafile) {
    Object.assign(
      merged,
      JSON.parse(readFileSync(resolve(root, provider.metafile), 'utf8')).inputs,
    );
  }
  for (const sdk of privateSdks) {
    if (
      provider.sdk !== sdk &&
      Object.keys(merged).some(input =>
        input.replaceAll('\\', '/').includes(`node_modules/${sdk}/`),
      )
    ) {
      throw new Error(`The selected compiler bundle contains another provider's SDK: ${sdk}`);
    }
  }
  return merged;
}
