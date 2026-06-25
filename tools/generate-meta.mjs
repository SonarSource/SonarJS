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
import { spawnSync } from 'node:child_process';

const command =
  process.env.npm_execpath === undefined
    ? process.platform === 'win32'
      ? 'npm.cmd'
      : 'npm'
    : process.execPath;
const commandArgumentsPrefix =
  process.env.npm_execpath === undefined ? [] : [process.env.npm_execpath];
const shouldUseShell = process.platform === 'win32' && command.toLowerCase().endsWith('.cmd');
const scripts = ['ensure-rule-data', 'generate-meta:raw'];

for (const script of scripts) {
  const result = spawnSync(command, [...commandArgumentsPrefix, 'run', script], {
    shell: shouldUseShell,
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
