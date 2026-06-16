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

const rspecShaPath = 'rspec.sha';
const languagePins = [
  {
    language: 'javascript',
    property: 'rspec.javascript.sha',
    paths: [join('sonar-plugin', 'javascript-checks', 'src', 'main', 'resources', 'rspec.sha')],
  },
  {
    language: 'css',
    property: 'rspec.css.sha',
    paths: [join('sonar-plugin', 'css', 'src', 'main', 'resources', 'rspec.sha')],
  },
];

const sharedArgs = ['-q', '-ntp', '-Dskip-nodejs', '-DskipTests'];

const bootstrapArgs = [...sharedArgs, '-pl', 'sonar-plugin/api', '-am', 'install'];

const generateArgs = [
  ...sharedArgs,
  '-pl',
  'sonar-plugin/javascript-checks',
  '-am',
  '-Drule.data.build.phase=generate-resources',
];

const sharedRspecSha = readRspecSha([rspecShaPath]);
for (const pin of languagePins) {
  const rspecSha = sharedRspecSha ?? readRspecSha(pin.paths);
  if (rspecSha !== undefined) {
    generateArgs.push(`-D${pin.property}=${rspecSha.sha}`);
    console.log(`Using pinned ${pin.language} RSPEC SHA ${rspecSha.sha} from ${rspecSha.path}`);
  }
}

generateArgs.push('generate-resources');

const command = process.platform === 'win32' ? 'mvn.cmd' : 'mvn';
const shouldUseShell = process.platform === 'win32' && command.toLowerCase().endsWith('.cmd');
runMaven(bootstrapArgs);
runMaven(generateArgs);

function readRspecSha(paths) {
  for (const path of paths) {
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
  const result = spawnSync(command, args, {
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
