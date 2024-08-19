/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { getRuntimePaths } from './directories.mjs';
import { NODE_VERSION, VERSION_FILENAME } from '../node-distros.mjs';

/**
 * Copies tools/fetch-node/downloads/runtimes/{distro.id}/node{.exe}.xz
 * to
 * {target_dir}/{distro.id}/node{.exe}.xz
 *
 * Writes the
 * {target_dir}/{distro.id}/version.txt files
 */

const runtimePaths = getRuntimePaths();

runtimePaths.forEach(p => {
  fse.mkdirpSync(p.targetDir);
  console.log(`Copying ${p.sourceFilename} to ${p.targetFilename}`);
  fse.copySync(p.sourceFilename, p.targetFilename);
  fs.writeFileSync(path.join(p.targetDir, VERSION_FILENAME), NODE_VERSION);
});
