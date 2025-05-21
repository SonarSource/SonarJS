/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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

import type { JsTsFiles } from './projectAnalysis.js';
import { toUnixPath } from '../../rules/index.js';
import { dirname } from 'node:path/posix';

export const UNINITIALIZED_ERROR = 'Files cache has not been initialized. Call loadFiles() first.';

let baseDir: string | undefined;
let files: JsTsFiles | undefined;
let filenames: string[] | undefined;
let paths: Set<string> | undefined;

export function clearFilesCache() {
  files = undefined;
  filenames = undefined;
  paths = undefined;
}

export function fileCacheInitialized(baseDir: string) {
  dirtyCachesIfNeeded(baseDir);
  return typeof files !== 'undefined';
}

export function getFilesCount() {
  if (!filenames) {
    throw new Error(UNINITIALIZED_ERROR);
  }
  return filenames.length;
}

export function getFiles() {
  if (!files) {
    throw new Error(UNINITIALIZED_ERROR);
  }
  return files;
}

export function getFilenames() {
  if (!filenames) {
    throw new Error(UNINITIALIZED_ERROR);
  }
  return filenames;
}

export function getPaths() {
  if (!paths) {
    throw new Error(UNINITIALIZED_ERROR);
  }
  return paths;
}

export function setFiles(newBaseDir: string, newFiles: JsTsFiles) {
  baseDir = newBaseDir;
  files = {};
  filenames = [];
  paths = new Set<string>();
  Object.entries(newFiles).forEach(([rawFilename, file]) => {
    const filename = toUnixPath(rawFilename);
    paths!.add(dirname(filename));
    filenames!.push(filename);
    file.filePath = filename;
    files![filename] = file;
  });
}

function dirtyCachesIfNeeded(currentBaseDir: string) {
  if (currentBaseDir !== baseDir) {
    clearFilesCache();
  }
}
