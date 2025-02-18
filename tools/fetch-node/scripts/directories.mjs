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
import * as url from 'node:url';
import * as path from 'node:path';
import fs from 'fs-extra';
import { DISTROS } from '../node-distros.mjs';
// replace __dirname in module
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

/**
 * The local cache for node distributions
 */
export const DOWNLOAD_DIR = path.join(__dirname, '..', 'downloads');

/**
 * Folder where the node runtimes are prepared
 */
export const RUNTIMES_DIR = path.join(__dirname, '..', 'downloads', 'runtimes');

/**
 * Folder where the plugin can use the runtimes and pick them when building JARs
 */
export const TARGET_DIR = path.join(
  __dirname,
  '..',
  '..',
  '..',
  'sonar-plugin',
  'sonar-javascript-plugin',
  'target',
  'node',
);

/**
 * Builds the paths for the Node.js runtimes
 *
 * @returns
 */
export function getRuntimePaths() {
  const runtimeDirectories = [];
  for (const distro of DISTROS) {
    const sourceDir = path.join(RUNTIMES_DIR, distro.id);
    // needed in case the script is run on a clean machine (no cache)
    fs.mkdirpSync(sourceDir);
    const filename = path.basename(distro.binPath + '.xz');
    const sourceFilename = path.join(sourceDir, filename);
    const targetDir = path.join(TARGET_DIR, distro.id);
    const targetFilename = path.join(targetDir, filename);
    runtimeDirectories.push({
      targetDir,
      targetFilename,
      sourceFilename,
    });
  }
  return runtimeDirectories;
}
