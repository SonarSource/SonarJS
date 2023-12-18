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
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * This file is in the sonar-javascript-plugin JAR file
 */
const rules = JSON.parse(fs.readFileSync(path.join(__dirname, 'sonarlint-metadata.json'), 'utf8'));

const sonarToEslint: Record<string, string> = {};
const eslintToSonar: Record<string, string> = {};

for (const rule of rules) {
  sonarToEslint[extractSonarId(rule)] = rule.eslintKey;
  eslintToSonar[rule.eslintKey] = extractSonarId(rule);
}

function extractSonarId(rule: any) {
  return rule.ruleKey.split(':')[1];
}

fs.writeFileSync(
  path.join(__dirname, 'sonar-to-eslint-id.json'),
  JSON.stringify(sonarToEslint, null, 2),
);
fs.writeFileSync(
  path.join(__dirname, 'eslint-to-sonar-id.json'),
  JSON.stringify(eslintToSonar, null, 2),
);
