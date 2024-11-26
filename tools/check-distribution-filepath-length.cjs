/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
const tar = require('tar');

const PACKAGE_FILENAME = 'sonarjs-1.0.0.tgz';
const MAX_FILEPATH = 164;

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
