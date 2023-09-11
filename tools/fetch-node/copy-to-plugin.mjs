/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
import path from 'node:path';
import fs from 'fs-extra';
import { __dirname } from './tools.mjs';

/**
 * Copies tools/fetch-node/downloads/runtimes
 * to
 * targetDir/classes
 */

/**
 * This script accepts a custom target directory
 */
const PARAM_DIR = readTargetDirFromCLI();
const DEFAULT_TARGET_DIR = path.join(
  __dirname,
  '..',
  '..',
  'sonar-plugin',
  'sonar-javascript-plugin',
  'target',
);

let targetDir = PARAM_DIR ?? DEFAULT_TARGET_DIR;
targetDir = path.join(targetDir, 'classes');
fs.mkdirpSync(targetDir);

const SOURCE_DIR = path.join(__dirname, 'downloads', 'runtimes');

console.log(`Copying ${SOURCE_DIR} to ${targetDir}`);
fs.copySync(SOURCE_DIR, targetDir);

/**
 * Reads the first CLI parameter
 * If the path is relative, makes it absolute
 *
 * @returns
 */
function readTargetDirFromCLI() {
  const folder = process.argv.length > 2 ? process.argv[2] : undefined;
  if (!folder) return undefined;

  if (isAbsolutePath(folder)) {
    return folder;
  }

  return path.join(process.cwd(), folder);

  function isAbsolutePath(folder) {
    return folder.startsWith(path.sep);
  }
}
