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
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const statePath = join('resources', 'rule-data-state.json');
const stateVersion = 1;
const stepName = 'generate-rule-data:maven';
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
  join('sonar-plugin', 'css', 'src', 'main', 'resources', 'rspec.sha'),
];

const desiredState = {
  version: stateVersion,
  step: stepName,
  head: gitHead(),
  rootRspecSha: readRootRspecSha(),
};

if (hasPreparedRuleData() && isCurrentState(readRuleDataState(), desiredState)) {
  console.log(`Rule data is already prepared for ${desiredState.head}`);
  process.exit(0);
}

runNpmScript(stepName);
writeRuleDataState(desiredState);

function hasPreparedRuleData() {
  return preparedRuleDataPaths.every(path => existsSync(path));
}

function isCurrentState(actual, expected) {
  return (
    actual?.version === expected.version &&
    actual?.step === expected.step &&
    actual?.head === expected.head &&
    actual?.rootRspecSha === expected.rootRspecSha
  );
}

function readRuleDataState() {
  if (!existsSync(statePath)) {
    return undefined;
  }
  try {
    return JSON.parse(readFileSync(statePath, 'utf8'));
  } catch {
    return undefined;
  }
}

function writeRuleDataState(state) {
  mkdirSync(dirname(statePath), { recursive: true });
  writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
}

function readRootRspecSha() {
  if (!existsSync('rspec.sha')) {
    return null;
  }
  const sha = readFileSync('rspec.sha', 'utf8').trim();
  return sha.length === 0 ? null : sha;
}

function gitHead() {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], {
    encoding: 'utf8',
  });
  if (result.error !== undefined) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }
  return result.stdout.trim();
}

function runNpmScript(script) {
  const command =
    process.env.npm_execpath === undefined
      ? process.platform === 'win32'
        ? 'npm.cmd'
        : 'npm'
      : process.execPath;
  const commandArguments =
    process.env.npm_execpath === undefined
      ? ['run', script]
      : [process.env.npm_execpath, 'run', script];
  const shouldUseShell = process.platform === 'win32' && command.toLowerCase().endsWith('.cmd');
  const result = spawnSync(command, commandArguments, {
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
