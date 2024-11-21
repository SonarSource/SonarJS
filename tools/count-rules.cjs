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
const url = require('node:url');
const path = require('node:path');
const fs = require('node:fs');

const pathToJsTsRules = path.join(
  __dirname,
  '..',
  'sonar-plugin',
  'javascript-checks',
  'src',
  'main',
  'resources',
  'org',
  'sonar',
  'l10n',
  'javascript',
  'rules',
  'javascript',
);
const pathToCssRules = path.join(
  __dirname,
  '..',
  'sonar-plugin',
  'css',
  'src',
  'main',
  'resources',
  'org',
  'sonar',
  'l10n',
  'css',
  'rules',
  'css',
);

const jsTsRules = getJsonFiles(pathToJsTsRules);

const jsRules = jsTsRules.filter(rule => rule.compatibleLanguages.includes('JAVASCRIPT'));
const tsRules = jsTsRules.filter(rule => rule.compatibleLanguages.includes('TYPESCRIPT'));

const cssRules = getJsonFiles(pathToCssRules);

console.log(`JS/TS rules: ${jsTsRules.length}`);
console.log(`JS rules: ${jsRules.length}`);
console.log(`TS rules: ${tsRules.length}`);
console.log(`CSS rules: ${cssRules.length}`);

function getJsonFiles(pathToRules) {
  const filenames = fs.readdirSync(pathToRules);
  return filenames
    .filter(filename => filename.endsWith('.json') && filename.length <= 'S1234.json'.length)
    .map(file => require(path.join(pathToRules, file)));
}
