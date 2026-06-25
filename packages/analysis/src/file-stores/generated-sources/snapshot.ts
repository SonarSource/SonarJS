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
import type { NormalizedAbsolutePath } from '../../../../shared/src/helpers/files.js';
import type { GeneratedSourceFileMatcher, GeneratedSourceProjectSnapshot } from './contracts.js';
import { isSafeGeneratedSourceChildPath, isSourceFile } from './shared.js';

export function hasFileInSnapshot(
  filePath: NormalizedAbsolutePath,
  projectSnapshot: GeneratedSourceProjectSnapshot,
) {
  return projectSnapshot.preloadedFiles.has(filePath) || projectSnapshot.sourceFiles.has(filePath);
}

export function hasDirectoryInSnapshot(
  directoryPath: NormalizedAbsolutePath,
  projectSnapshot: GeneratedSourceProjectSnapshot,
) {
  return projectSnapshot.directories.has(directoryPath);
}

export function listSourceFilesInSnapshot(
  directory: NormalizedAbsolutePath,
  recursive: boolean,
  sourceFileMatcher: GeneratedSourceFileMatcher | undefined,
  projectSnapshot: GeneratedSourceProjectSnapshot,
) {
  const childPrefix = `${directory}/`;
  const sourceFiles: NormalizedAbsolutePath[] = [];

  for (const filePath of projectSnapshot.sourceFiles) {
    if (!filePath.startsWith(childPrefix)) {
      continue;
    }

    if (!isSafeGeneratedSourceChildPath(filePath, directory)) {
      continue;
    }

    if (!recursive && filePath.slice(childPrefix.length).includes('/')) {
      continue;
    }

    if (isSourceFile(filePath, sourceFileMatcher)) {
      sourceFiles.push(filePath);
    }
  }

  return sourceFiles;
}
