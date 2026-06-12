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
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const rspecShaPaths = [
  'rspec.sha',
  join('sonar-plugin', 'javascript-checks', 'src', 'main', 'resources', 'rspec.sha'),
];

const sharedArgs = ['-q', '-ntp', '-Dskip-nodejs', '-DskipTests'];

const bootstrapArgs = [
  ...sharedArgs,
  '-pl',
  'sonar-plugin/api',
  '-am',
  'install',
];

const generateArgs = [
  ...sharedArgs,
  '-pl',
  'sonar-plugin/javascript-checks',
  '-am',
  '-Drule.data.build.phase=generate-resources',
];

const rspecSha = readRspecSha();
if (rspecSha !== undefined) {
  generateArgs.push(`-Drspec.sha=${rspecSha.sha}`);
  console.log(`Using pinned RSPEC SHA ${rspecSha.sha} from ${rspecSha.path}`);
}

generateArgs.push('generate-resources');

const command = process.platform === 'win32' ? 'mvn.cmd' : 'mvn';
runMaven(bootstrapArgs);
runMaven(generateArgs);

function readRspecSha() {
  for (const path of rspecShaPaths) {
    if (existsSync(path)) {
      const sha = readFileSync(path, 'utf-8').trim();
      if (sha.length > 0) {
        return { path, sha };
      }
    }
  }
  return undefined;
}

function runMaven(args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });

  if (result.error !== undefined) {
    console.error(result.error);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
