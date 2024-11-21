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
import path from 'path';
import fs from 'fs';
import semver from 'semver';

const version = process.versions.node;
if (semver.lt(version, '20.10.0')) {
  console.error('Node.js 20.10.0 or higher is required');
  process.exit(1);
}

const missing = findMissingData();
if (missing.length > 0) {
  console.error(`Missing ${missing} files`);
  console.error(
    'Please run "npm run update-ruling-data" before running "npm run ruling". You can also run "npm run build" or "npm run build:fast"',
  );
  process.exit(1);
}

const TARGET = path.join(import.meta.dirname, '..', 'its', 'sources');
const LINK = path.join(import.meta.dirname, '..', '..', 'sonarjs-ruling-sources');

if (fs.existsSync(LINK)) {
  fs.unlinkSync(LINK);
}
fs.symlinkSync(TARGET, LINK);

function findMissingData() {
  const PATH_TO_RULES = path.join(
    import.meta.dirname,
    '..',
    'packages',
    'ruling',
    'tests',
    'data',
    'rules.json',
  );
  const missing = [];
  if (!fs.existsSync(PATH_TO_RULES)) {
    missing.push(PATH_TO_RULES);
  }
  return missing;
}
