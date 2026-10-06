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
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { configuration, environmentConfiguration } from '../config.mjs';
import { context } from '../bot.mjs';

const paths = { 'new-results-path': 'generated', 'old-results-path': 'expected' };

test('generic defaults contain no SonarJS-specific URLs or artifact names', () => {
  const actual = configuration(paths);
  assert.equal(actual['sources-repo-url'], '');
  assert.equal(actual['results-artifact-name'], 'ruling-results');
  assert.equal(actual['rspec-base-url'], 'https://sonarsource.github.io/rspec/#/rspec');
});

test('restored and new inputs survive environment handoff, including empty URL/ref', () => {
  const settings = {
    ...paths,
    'sources-path': 'custom/sources',
    'sources-repo-url': '',
    'rspec-base-url': 'https://rules.test',
    'max-inline-snippets': '2',
    'results-artifact-name': 'custom-2',
    'report-workflow': 'other.yml',
    'report-workflow-ref': '',
  };
  const env = Object.fromEntries(
    Object.entries(settings).map(([name, value]) => [
      name.replaceAll('-', '_').toUpperCase(),
      value,
    ]),
  );
  assert.deepEqual(environmentConfiguration(env), configuration(settings));
});

for (const value of [
  null,
  [],
  'not-an-object',
  {},
  { ...paths, 'old-results-path': '../outside' },
  { ...paths, 'new-results-path': 'C:\\outside' },
  { ...paths, 'sources-path': '/outside' },
  { ...paths, 'old-results-path': '.' },
  { ...paths, 'new-results-path': 'expected/actual' },
  { ...paths, 'new-results-path': 'expected' },
  { ...paths, 'max-inline-snippets': 'NaN' },
  { ...paths, 'max-inline-snippets': '0' },
]) {
  test(`invalid configuration is rejected: ${JSON.stringify(value)}`, () =>
    assert.throws(() => configuration(value)));
}

test('artifact handoff uses distinct attempt names while preserving configuration', t => {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'ruling-config-test-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const input = path.join(directory, 'config.json');
  const output = path.join(directory, 'output');
  writeFileSync(input, JSON.stringify({ ...paths, 'results-artifact-name': 'results' }));
  const executable = fileURLToPath(new URL('../config.mjs', import.meta.url));
  for (const attempt of ['1', '2']) {
    execFileSync(process.execPath, [executable, input, '--artifact-attempt'], {
      env: {
        ...process.env,
        RULING_REPORT_CONFIG: '',
        GITHUB_OUTPUT: output,
        GITHUB_RUN_ATTEMPT: attempt,
      },
    });
  }
  const configs = readFileSync(output, 'utf8')
    .trim()
    .split('\n')
    .map(line => JSON.parse(line.slice('config='.length)));
  assert.equal(configs[0]['results-artifact-name'], 'results-1');
  assert.equal(configs[1]['results-artifact-name'], 'results-2');
  assert.equal(configs[1]['old-results-path'], 'expected');
});

test('dispatched config takes precedence over workflow checkout configuration', t => {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'ruling-config-test-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const output = path.join(directory, 'output');
  execFileSync(
    process.execPath,
    [fileURLToPath(new URL('../config.mjs', import.meta.url)), 'missing-caller-config.json'],
    {
      env: { ...process.env, GITHUB_OUTPUT: output, RULING_REPORT_CONFIG: JSON.stringify(paths) },
    },
  );
  assert.deepEqual(
    JSON.parse(readFileSync(output, 'utf8').trim().slice('config='.length)),
    configuration(paths),
  );
});

test('report context retains originating Build identity separately from reporter run', () => {
  const ctx = context({
    GITHUB_RUN_ID: '99',
    GITHUB_RUN_ATTEMPT: '2',
    BUILD_RUN_ID: '42',
    BUILD_RUN_ATTEMPT: '1',
  });
  assert.equal(ctx.runId, '42');
  assert.equal(ctx.runAttempt, '1');
});
