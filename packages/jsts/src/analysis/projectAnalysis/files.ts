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

import { JsTsFiles } from './projectAnalysis.js';

const UNINITIALIZED_ERROR = 'Files cache have not been initialized';

let files: JsTsFiles | undefined;

export function filesInitialized() {
  return typeof files !== 'undefined';
}

export function clearTSConfigs() {
  files = undefined;
}

export function getFilesCount() {
  if (!files) {
    throw new Error(UNINITIALIZED_ERROR);
  }
  return Object.keys(files).length;
}

export function getFiles() {
  if (!files) {
    throw new Error(UNINITIALIZED_ERROR);
  }
  return files;
}

export function setFiles(newFiles: JsTsFiles) {
  files = newFiles;
}
