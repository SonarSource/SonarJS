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
import ts from '../classic.cjs';

const caches = new WeakMap();

// TS7 removed Classic/Node10. Retain the TS6 resolver utility for these old
// configurations; parsing, binding and checking the resolved files still use TS7.
export function resolveLegacyModule(resolver, name, file, redirect) {
  const options = redirect?.options ?? resolver.options;
  const kind = ts.getEmitModuleResolutionKind(options);
  if (kind !== ts.ModuleResolutionKind.Classic && kind !== ts.ModuleResolutionKind.Node10) return;
  const source = resolver.host;
  const host = Object.fromEntries(
    [
      'fileExists',
      'directoryExists',
      'readFile',
      'realpath',
      'getDirectories',
      'getCurrentDirectory',
    ].map(key => [key, source[key].bind(source)]),
  );
  const classicOptions = {
    ...options,
    moduleResolution: kind,
    paths: options.paths instanceof Map ? Object.fromEntries(options.paths) : options.paths,
  };
  let cache = caches.get(resolver);
  if (!cache) {
    cache = ts.createModuleResolutionCache(source.getCurrentDirectory(), path =>
      source.useCaseSensitiveFileNames() ? path : path.toLowerCase(),
    );
    caches.set(resolver, cache);
  }
  const resolved = ts.resolveModuleName(name, file, classicOptions, host, cache).resolvedModule;
  return {
    resolvedFileName: '',
    originalPath: '',
    extension: '',
    resolvedUsingTsExtension: false,
    isExternalLibraryImport: false,
    alternateResult: '',
    resolutionDiagnostics: [],
    ...resolved,
    packageId: resolved?.packageId && {
      ...resolved.packageId,
      peerDependencies: resolved.packageId.peerDependencies ?? '',
    },
  };
}
