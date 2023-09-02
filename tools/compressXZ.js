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
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

if (process.argv.length < 3) {
  throw new Error('Provide a filename in argv to compress');
}

const filename = process.argv[2];
const script = path.join(__dirname, 'CompressXZ.java');

const pathToDep = path.join('.m2', 'repository', 'org', 'tukaani', 'xz', '1.9', 'xz-1.9.jar');
const dependency = isWindows() ? path.join('%USERPROFILE%', pathToDep) : path.join('~', pathToDep);

execSync(`java -cp ${dependency} ${script} ${filename}`, { stdio: 'inherit' });

function isWindows() {
  return os.platform().startsWith('win');
}
