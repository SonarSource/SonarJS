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
import {
  combinePaths,
  normalizePath,
  getDirectoryPath,
  isExternalModuleNameRelative,
} from 'tsc-ts-source/packages/tsc-ts/src/compiler/path.ts';
// Classic searches files in ancestor directories, then @types. It does not use
// package directories, exports or index files. Reuse the selected compiler's
// file/extension, paths and symlink machinery instead of loading another SDK.
export function resolveClassic(state) {
  const settings = state.tryLoadModuleUsingOptionalResolutionSettings();
  if (settings !== undefined) return state.createResolvedModuleHandlingSymlink(settings);
  let directory = state.containingDirectory;
  const relative = isExternalModuleNameRelative(state.name);
  for (;;) {
    const file = state.loadModuleFromFile(
      state.extensions,
      normalizePath(combinePaths(directory, state.name)),
    );
    if (file !== undefined) return state.createResolvedModuleHandlingSymlink(file);
    if (relative) break;
    const parent = getDirectoryPath(directory);
    if (parent === directory) break;
    directory = parent;
  }
  return state.createResolvedModuleHandlingSymlink(
    relative ? undefined : state.loadModuleFromNearestNodeModulesDirectory(true),
  );
}
