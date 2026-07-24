/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { builtinModules } from 'node:module';
import allowlist from './package-imports.json' with { type: 'json' };
import { parseInlineNPMImport } from './jsts/rules/helpers/dependency-manifests/resolvers/npm-import.js';
import type { DependenciesList } from './jsts/rules/helpers/dependency-manifests/resolvers/types.js';

// Curated from the package-import telemetry canvas: its popularity, current, proposed, and
// runtime cohorts are kept as one deduplicated set, including deprecated-but-valid entries.
const ALLOWLIST = new Set(allowlist);

const RUNTIME_ALLOWLIST = new Set(
  [...ALLOWLIST].filter(
    name => name === 'bun' || name.startsWith('bun:') || name.startsWith('node:'),
  ),
);
const PACKAGE_ALLOWLIST = new Set([...ALLOWLIST].filter(name => !RUNTIME_ALLOWLIST.has(name)));
const NODE_PREFIX_ONLY_BUILTINS = new Set([
  'node:sea',
  'node:sqlite',
  'node:test',
  'node:test/reporters',
]);
const BARE_NODE_BUILTINS = new Map<string, string>();

for (const builtin of builtinModules) {
  const bare = builtin.startsWith('node:') ? builtin.slice('node:'.length) : builtin;
  const canonical = `node:${bare}`;
  if (RUNTIME_ALLOWLIST.has(canonical) && !NODE_PREFIX_ONLY_BUILTINS.has(canonical)) {
    BARE_NODE_BUILTINS.set(bare, canonical);
  }
}

const PACKAGE_NAME_PART = /^[a-z0-9][a-z0-9._~-]*$/;

/**
 * Returns only canonical, allowlisted package and runtime names used by the supplied imports.
 *
 * Ordinary packages must also be exact direct manifest keys. This limits telemetry to known
 * ecosystem names and avoids collecting private package names, local paths, or aliases.
 */
export function collectPackageImports(
  moduleSpecifiers: ReadonlySet<string>,
  dependencies: DependenciesList,
): Set<string> {
  const result = new Set<string>();

  for (const specifier of moduleSpecifiers) {
    if (RUNTIME_ALLOWLIST.has(specifier)) {
      result.add(specifier);
      continue;
    }

    const builtin = BARE_NODE_BUILTINS.get(specifier);
    if (builtin !== undefined) {
      result.add(builtin);
      continue;
    }

    const inlineNpmImport = parseInlineNPMImport(specifier);
    if (inlineNpmImport !== undefined) {
      if (PACKAGE_ALLOWLIST.has(inlineNpmImport.packageName)) {
        result.add(inlineNpmImport.packageName);
      }
      continue;
    }

    const packageName = packageRoot(specifier);
    if (
      packageName !== undefined &&
      PACKAGE_ALLOWLIST.has(packageName) &&
      dependencies.has(packageName)
    ) {
      result.add(packageName);
    }
  }

  return result;
}

function packageRoot(specifier: string): string | undefined {
  if (
    specifier.length === 0 ||
    specifier.startsWith('.') ||
    specifier.startsWith('/') ||
    specifier.startsWith('#') ||
    specifier.includes('\\') ||
    specifier.includes(':')
  ) {
    return undefined;
  }

  const segments = specifier.split('/');
  const rootLength = specifier.startsWith('@') ? 2 : 1;
  const rootSegments = segments.slice(0, rootLength);
  const subpathSegments = segments.slice(rootLength);

  if (
    rootSegments.length !== rootLength ||
    !rootSegments.every((part, index) =>
      PACKAGE_NAME_PART.test(index === 0 && part.startsWith('@') ? part.slice(1) : part),
    ) ||
    subpathSegments.some(part => part === '' || part === '.' || part === '..')
  ) {
    return undefined;
  }

  return rootSegments.join('/');
}
