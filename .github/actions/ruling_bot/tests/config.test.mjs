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
import { fileURLToPath } from 'node:url';
import path from 'node:path';
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

test('absolute paths inside the caller checkout are forwarded relative to the tested tree', () => {
  const root = path.resolve('caller-checkout');
  const config = environmentConfiguration({
    RULING_REPOSITORY_PATH: root,
    NEW_RESULTS_PATH: path.join(root, 'generated'),
    OLD_RESULTS_PATH: path.join(root, 'expected'),
    SOURCES_PATH: path.join(root, 'source-tree'),
  });
  assert.equal(config['new-results-path'], 'generated');
  assert.equal(config['old-results-path'], 'expected');
  assert.equal(config['sources-path'], 'source-tree');
});

test('relative parent segments inside the checkout are normalized without losing snippet options', () => {
  assert.equal(
    configuration({ ...paths, 'new-results-path': 'nested/../generated' })['new-results-path'],
    'generated',
  );
  assert.equal(configuration({ ...paths, 'sources-path': '' })['sources-path'], '');
  assert.equal(configuration({ ...paths, 'sources-path': '.' })['sources-path'], '.');
});

test('absolute paths escaping the checkout are rejected before handoff', () => {
  const root = path.resolve('caller-checkout');
  assert.throws(
    () =>
      configuration({ ...paths, 'old-results-path': path.resolve(root, '..', 'outside') }, root),
    /inside the tested repository/,
  );
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
    'build-workflow': 'custom-build.yml',
    'report-dispatch-step': 'Custom dispatch record',
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
  { ...paths, 'build-workflow': '' },
  { ...paths, 'report-dispatch-step': false },
]) {
  test(`invalid configuration is rejected: ${JSON.stringify(value)}`, () =>
    assert.throws(() => configuration(value)));
}

test('explicit artifact names pass through unchanged despite the local workflow attempt', () => {
  const configs = [];
  for (const attempt of ['1', '2']) {
    configs.push(
      environmentConfiguration({
        GITHUB_RUN_ATTEMPT: '3',
        NEW_RESULTS_PATH: paths['new-results-path'],
        OLD_RESULTS_PATH: paths['old-results-path'],
        RESULTS_ARTIFACT_NAME: `results-${attempt}`,
      }),
    );
  }
  assert.equal(configs[0]['results-artifact-name'], 'results-1');
  assert.equal(configs[1]['results-artifact-name'], 'results-2');
  assert.equal(configs[1]['old-results-path'], 'expected');
});

test('report preflight validates caller paths before GitHub or artifact operations', () => {
  assert.throws(
    () =>
      execFileSync(
        process.execPath,
        [fileURLToPath(new URL('../bot.mjs', import.meta.url)), 'check-report'],
        {
          env: { ...process.env, NEW_RESULTS_PATH: '../outside', OLD_RESULTS_PATH: 'expected' },
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      ),
    /new-results-path must be inside the tested repository/,
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
