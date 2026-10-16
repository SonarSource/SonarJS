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
import os from 'node:os';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import test from 'node:test';
import {
  configuration,
  configurationOverrides,
  environmentConfiguration,
  defaults,
  inherit,
  inputDefinitions,
} from '../config.mjs';
import { context } from '../bot.mjs';

const paths = { 'new-results-path': 'generated', 'old-results-path': 'expected' };

test('generic defaults contain no SonarJS-specific URLs or artifact names', () => {
  const actual = configuration(paths);
  assert.equal(actual['sources-repo-url'], '');
  assert.equal(actual['results-artifact-name'], 'ruling-results');
  assert.equal(actual['rspec-base-url'], 'https://sonarsource.github.io/rspec/#/rspec');
});

test('absolute paths inside the caller checkout are forwarded relative to the tested tree', async () => {
  const root = path.resolve('caller-checkout');
  const config = await environmentConfiguration({
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

test('restored and new inputs survive environment handoff, including empty URL/ref', async () => {
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
  env.CONFIG_FILE = '';
  settings['config-file'] = '';
  assert.deepEqual(await environmentConfiguration(env), configuration(settings));
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

test('explicit artifact names pass through unchanged despite the local workflow attempt', async () => {
  const configs = [];
  for (const attempt of ['1', '2']) {
    configs.push(
      await environmentConfiguration({
        GITHUB_RUN_ATTEMPT: '3',
        CONFIG_FILE: '',
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

function repositoryConfig(t, value = paths, file = defaults['config-file']) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'ruling-config-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const destination = path.join(root, file);
  mkdirSync(path.dirname(destination), { recursive: true });
  writeFileSync(destination, `export const rulingConfig = ${JSON.stringify(value)};\n`);
  return root;
}
test('the default repository module supplies settings without YAML overrides', async t => {
  const settings = {
    ...paths,
    'sources-repo-url': 'https://source.test',
    'max-inline-snippets': 3,
  };
  const root = repositoryConfig(t, settings);
  const config = await environmentConfiguration({ RULING_REPOSITORY_PATH: root });
  assert.deepEqual(config, configuration(settings, root));
  assert.deepEqual(configurationOverrides(config), {});
});
test('an absent default module accepts explicit settings and generic defaults', async t => {
  const root = repositoryConfig(t, {}, 'unused.mjs');
  const config = await environmentConfiguration({
    RULING_REPOSITORY_PATH: root,
    NEW_RESULTS_PATH: 'generated',
    OLD_RESULTS_PATH: 'expected',
  });
  assert.equal(config['sources-repo-url'], defaults['sources-repo-url']);
  assert.deepEqual(configurationOverrides(config), paths);
});
test('custom module selection is forwarded and an empty selection disables repository settings', async t => {
  const root = repositoryConfig(
    t,
    { ...paths, 'sources-repo-url': 'https://repo.test' },
    'settings.mjs',
  );
  const selected = await environmentConfiguration({
    RULING_REPOSITORY_PATH: root,
    CONFIG_FILE: 'settings.mjs',
  });
  assert.equal(selected['sources-repo-url'], 'https://repo.test');
  assert.deepEqual(configurationOverrides(selected), { 'config-file': 'settings.mjs' });
  const disabled = await environmentConfiguration({
    RULING_REPOSITORY_PATH: root,
    CONFIG_FILE: '',
    NEW_RESULTS_PATH: 'generated',
    OLD_RESULTS_PATH: 'expected',
  });
  assert.equal(disabled['sources-repo-url'], '');
  assert.equal(configurationOverrides(disabled)['config-file'], '');
});
test('action overrides precede workflow overrides and preserve explicit empty opt-outs', async t => {
  const root = repositoryConfig(t, {
    ...paths,
    'sources-path': 'repo/sources',
    'sources-repo-url': 'https://repo.test',
    'rspec-base-url': 'https://rules.test',
    'report-workflow-ref': 'repo-ref',
    'max-inline-snippets': '2',
  });
  const config = await environmentConfiguration({
    RULING_REPOSITORY_PATH: root,
    RULING_WORKFLOW_INPUTS: JSON.stringify({
      ...Object.fromEntries(Object.keys(inputDefinitions).map(name => [name, inherit])),
      'new-results-path': 'workflow/generated',
      'sources-repo-url': 'https://workflow.test',
      'sources-path': '',
      'rspec-base-url': '',
      'report-workflow-ref': '',
      'max-inline-snippets': defaults['max-inline-snippets'],
      'run-id': '42',
    }),
    SOURCES_REPO_URL: '',
    OLD_RESULTS_PATH: 'action/expected',
    SOURCES_PATH: inherit,
  });
  assert.deepEqual(configurationOverrides(config), {
    'new-results-path': 'workflow/generated',
    'old-results-path': 'action/expected',
    'sources-path': '',
    'sources-repo-url': '',
    'rspec-base-url': '',
    'report-workflow-ref': '',
    'max-inline-snippets': defaults['max-inline-snippets'],
  });
  const received = await environmentConfiguration({
    RULING_REPOSITORY_PATH: root,
    RULING_WORKFLOW_INPUTS: JSON.stringify(configurationOverrides(config)),
  });
  assert.deepEqual(received, config);
});
test('a custom module can export a default object', async t => {
  const root = repositoryConfig(t);
  writeFileSync(path.join(root, 'default.mjs'), `export default ${JSON.stringify(paths)};`);
  const config = await environmentConfiguration({
    RULING_REPOSITORY_PATH: root,
    CONFIG_FILE: 'default.mjs',
  });
  assert.equal(config['new-results-path'], 'generated');
});
test('missing custom modules, escaping paths and invalid input envelopes fail visibly', async t => {
  const root = repositoryConfig(t);
  assert.deepEqual(
    await environmentConfiguration({
      RULING_REPOSITORY_PATH: root,
      RULING_WORKFLOW_INPUTS: 'null',
    }),
    configuration(paths, root),
    'An unavailable workflow input context is equivalent to no overrides',
  );
  await assert.rejects(
    environmentConfiguration({ RULING_REPOSITORY_PATH: root, CONFIG_FILE: 'missing.mjs' }),
    /ENOENT/,
  );
  await assert.rejects(
    environmentConfiguration({ RULING_REPOSITORY_PATH: root, CONFIG_FILE: '../outside.mjs' }),
    /inside the tested repository/,
  );
  for (const value of ['[]', '{']) {
    await assert.rejects(
      environmentConfiguration({ RULING_REPOSITORY_PATH: root, RULING_WORKFLOW_INPUTS: value }),
    );
  }
});
for (const [label, source, error] of [
  [
    'unknown settings',
    `export default ${JSON.stringify({ ...paths, typo: 'value' })};`,
    /Unknown ruling configuration/,
  ],
  ['invalid export', 'export const rulingConfig = [];', /must export/],
  [
    'escaping result paths',
    `export default ${JSON.stringify({ ...paths, 'old-results-path': '../outside' })};`,
    /inside the tested repository/,
  ],
  ['invalid JavaScript', 'export const rulingConfig = {', /SyntaxError/],
]) {
  test(`invalid repository module fails visibly: ${label}`, async t => {
    const root = repositoryConfig(t);
    writeFileSync(path.join(root, defaults['config-file']), source);
    await assert.rejects(environmentConfiguration({ RULING_REPOSITORY_PATH: root }), error);
  });
}

test('a literal path named inherit survives normalization and independent dispatch', async t => {
  const root = repositoryConfig(t);
  const config = await environmentConfiguration({
    RULING_REPOSITORY_PATH: root,
    NEW_RESULTS_PATH: './inherit',
    SOURCES_PATH: './inherit',
  });
  const fields = configurationOverrides(config);
  assert.equal(fields['new-results-path'], './inherit');
  assert.equal(fields['sources-path'], './inherit');
  assert.deepEqual(
    await environmentConfiguration({
      RULING_REPOSITORY_PATH: root,
      RULING_WORKFLOW_INPUTS: JSON.stringify(fields),
    }),
    config,
  );
});
