/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import ts from 'typescript';
import { basename, join } from 'node:path/posix';
import { warn } from '../../../../shared/src/helpers/logging.js';
import { toUnixPath } from '../../../../shared/src/helpers/files.js';
import fs from 'node:fs';

/**
 * Checks if a file path is in the root node_modules directory (used to detect last tsconfig check)
 */
export function isRootNodeModules(file: string) {
  const root = process.platform === 'win32' ? file.slice(0, file.indexOf(':') + 1) : '/';
  const normalizedFile = toUnixPath(file);
  const topNodeModules = toUnixPath(join(root, 'node_modules'));
  return normalizedFile.startsWith(topNodeModules);
}

/**
 * Determines if this is the last tsconfig.json check that TypeScript will perform
 * (i.e., tsconfig.json in root node_modules directory)
 */
export function isLastTsConfigCheck(file: string) {
  return basename(file) === 'tsconfig.json' && isRootNodeModules(file);
}

/**
 * Sanitize project references by resolving directories to tsconfig.json paths
 * Warns about and filters out missing references
 */
export function sanitizeProgramReferences(program: ts.Program): string[] {
  return sanitizeReferences(program.getProjectReferences() ?? []);
}

/**
 * Sanitize project references by resolving directories to tsconfig.json paths
 * Warns about and filters out missing references
 */
export function sanitizeReferences(references: readonly ts.ProjectReference[]): string[] {
  const sanitized: string[] = [];
  for (const reference of references) {
    const sanitizedPath = addTsConfigIfDirectory(reference.path);
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
function addTsConfigIfDirectory(tsConfig: string) {
  try {
    if (fs.lstatSync(tsConfig).isDirectory()) {
      return join(tsConfig, 'tsconfig.json');
    }

    return tsConfig;
  } catch {
    return null;
  }
}
