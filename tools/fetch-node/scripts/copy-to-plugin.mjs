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
import fse from 'fs-extra';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { RUNTIMES_DIR, TARGET_DIR } from './directories.mjs';
import NODE_DISTROS from '../node-distros.mjs';

/**
 * Copies tools/fetch-node/downloads/runtimes
 * to
 * sonar-plugin/sonar-javascript-plugin/target/classes
 */

for (const distro of NODE_DISTROS) {
  const sourceDir = path.join(RUNTIMES_DIR, distro.id);
  const filename = fs.readdirSync(sourceDir).filter(filename => filename.endsWith('.xz'))[0];
  const targetDir = path.join(TARGET_DIR, distro.id);
  fse.mkdirpSync(targetDir);
  const sourceFilename = path.join(sourceDir, filename);
  const targetFilename = path.join(targetDir, filename);
  console.log(`Copying ${sourceFilename} to ${targetFilename}`);
  fse.copySync(sourceFilename, targetFilename);
}
