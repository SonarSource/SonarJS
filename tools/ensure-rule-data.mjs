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
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const statePath = join('resources', 'rule-data-state.json');
const stateVersion = 1;
const stepName = 'generate-rule-data:maven';
const generatedRspecShaPaths = [
  join('sonar-plugin', 'javascript-checks', 'src', 'main', 'resources', 'rspec.sha'),
  join('sonar-plugin', 'css', 'src', 'main', 'resources', 'rspec.sha'),
];
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
  ...generatedRspecShaPaths,
];

const actualState = readRuleDataState();
const preparedRuleData = hasPreparedRuleData();
const rootRspecSha = readRootRspecSha();
const head = gitHead();
const desiredState = {
  version: stateVersion,
  step: stepName,
  head,
  rootRspecSha,
};
const stateIsKnownStale =
  actualState !== undefined &&
  !isCurrentState(actualState, desiredState) &&
  !(head === null && isPreparedStateForUnknownHead(actualState, desiredState));

if (preparedRuleData && isCurrentState(actualState, desiredState)) {
  console.log(`Rule data is already prepared for ${displayHead(head)}`);
  process.exit(0);
}

if (preparedRuleData && head === null && isPreparedStateForUnknownHead(actualState, desiredState)) {
  console.log('Rule data is already prepared; skipping because git HEAD is unavailable');
  process.exit(0);
}

if (stateIsKnownStale && rootRspecSha === null) {
  clearGeneratedRspecShaPins();
}

runNpmScript(stepName);
writeRuleDataState(desiredState);

function hasPreparedRuleData() {
  return (
    preparedRuleDataPaths.every(path => existsSync(path)) &&
    directoryContainsRuleFiles(
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
    ) &&
    directoryContainsRuleFiles(
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
    )
  );
}

function isCurrentState(actual, expected) {
  return (
    actual?.version === expected.version &&
    actual?.step === expected.step &&
    actual?.head === expected.head &&
    actual?.rootRspecSha === expected.rootRspecSha
  );
}

function isPreparedStateForUnknownHead(actual, expected) {
  return (
    actual?.version === expected.version &&
    actual?.step === expected.step &&
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

function clearGeneratedRspecShaPins() {
  for (const path of generatedRspecShaPaths) {
    rmSync(path, { force: true });
  }
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
  if (result.error !== undefined || result.status !== 0) {
    return null;
  }
  return result.stdout.trim();
}

function directoryContainsRuleFiles(path) {
  return readdirSync(path, { withFileTypes: true }).some(
    entry => entry.isFile() && (entry.name.endsWith('.json') || entry.name.endsWith('.html')),
  );
}

function displayHead(head) {
  return head ?? 'an unknown head';
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
