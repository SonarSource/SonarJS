/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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

const tar = require('tar');

const PACKAGE_FILENAME = 'sonarjs-1.0.0.tgz';
const MAX_FILEPATH = 256;

let longestLength = 0;
let longestFilepath = '';

tar.list({
  file: PACKAGE_FILENAME,
  sync: true,
  onentry: file => {
    if (file.path.length > longestLength) {
      longestLength = file.path.length;
      longestFilepath = file.path;
    }
  },
});

if (longestLength > MAX_FILEPATH) {
  console.log(
    `File length in generated ${PACKAGE_FILENAME} is longer than the accepted ${MAX_FILEPATH} characters`,
  );
  console.log(`File length is too long at ${longestLength} characters in ${longestFilepath}`);
  process.exitCode = 1;
}
