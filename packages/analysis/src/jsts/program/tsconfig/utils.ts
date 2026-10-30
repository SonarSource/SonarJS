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
import { pathIsUnder, pathsEqual } from '../../../common/filesystem.js';
import type ts from 'typescript';
import { basename, join } from 'node:path/posix';
import { warn } from '../../../../../shared/src/helpers/logging.js';
import {
  type NormalizedAbsolutePath,
  normalizePath,
  joinPaths,
  getPathRoot,
} from '../../../../../shared/src/helpers/files.js';
import fs from 'node:fs';

/**
 * Checks if a file path is in the root node_modules directory (used to detect last tsconfig check)
 */
export function isRootNodeModules(file: string) {
  const root = getPathRoot(file as NormalizedAbsolutePath);
  const normalizedFile = normalizePath(file);
  const topNodeModules = normalizePath(join(root, 'node_modules'));
  return pathIsUnder(normalizedFile, topNodeModules);
}

/**
 * Determines if this is the last tsconfig.json check that TypeScript will perform
 * (i.e., tsconfig.json in the root node_modules directory)
 */
export function isLastTsConfigCheck(file: string) {
  return pathsEqual(basename(file), 'tsconfig.json') && isRootNodeModules(file);
}

/**
 * Sanitize project references by resolving directories to tsconfig.json paths
 * Warns about and filters out missing references
 */
export function sanitizeProgramReferences(program: ts.Program): NormalizedAbsolutePath[] {
  return sanitizeReferences(program.getProjectReferences() ?? []);
}

/**
 * Sanitize project references by resolving directories to tsconfig.json paths
 * Warns about and filters out missing references
 */
export function sanitizeReferences(
  references: readonly ts.ProjectReference[],
): NormalizedAbsolutePath[] {
  const sanitized: NormalizedAbsolutePath[] = [];
  for (const reference of references) {
    const sanitizedPath = addTsConfigIfDirectory(reference.path as NormalizedAbsolutePath);
    if (sanitizedPath) {
      sanitized.push(sanitizedPath);
    } else {
      warn(`Skipping missing referenced tsconfig.json: ${reference.path}`);
    }
  }

  return sanitized;
}

/**
 * Adds tsconfig.json to a path if it does not exist
 *
 * @param tsConfig
 */
function addTsConfigIfDirectory(tsConfig: NormalizedAbsolutePath) {
  try {
    if (fs.lstatSync(tsConfig).isDirectory()) {
      return joinPaths(tsConfig, 'tsconfig.json');
    }

    return tsConfig;
  } catch {
    return null;
  }
}
