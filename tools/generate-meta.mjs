/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const preparedRuleDataPaths = [
  join(
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
  ),
  join(
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
  ),
  join('sonar-plugin', 'javascript-checks', 'src', 'main', 'resources', 'rspec.sha'),
];
const hasPreparedRuleData = preparedRuleDataPaths.every(path => existsSync(path));

const command =
  process.env.npm_execpath === undefined
    ? process.platform === 'win32'
      ? 'npm.cmd'
      : 'npm'
    : process.execPath;
const commandArgumentsPrefix =
  process.env.npm_execpath === undefined ? [] : [process.env.npm_execpath];
const scripts = hasPreparedRuleData
  ? ['generate-meta:raw']
  : ['generate-rule-data:maven', 'generate-meta:raw'];

for (const script of scripts) {
  const result = spawnSync(command, [...commandArgumentsPrefix, 'run', script], {
    stdio: 'inherit',
  });

  if (result.error !== undefined) {
    console.error(result.error);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
