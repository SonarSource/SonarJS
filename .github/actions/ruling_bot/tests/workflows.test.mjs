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
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import yaml from 'yaml';
import { inputDefinitions } from '../config.mjs';
import { generatedFiles } from '../generate-config.mjs';
import { rulingConfig } from '../../../ruling-bot.config.mjs';

const workflow = name =>
  yaml.parse(readFileSync(new URL(`../../../workflows/${name}`, import.meta.url), 'utf8'));

test('downstream retries keep the artifact named by the producing ruling job', t => {
  const build = workflow('build.yml');
  const producer = build.jobs.js_ts_ruling;
  const updater = build.jobs.js_ts_ruling_update;
  const naming = producer.steps.find(step => step.id === 'ruling_artifact');
  const output = mkdtempSync(path.join(os.tmpdir(), 'ruling-artifact-test-'));
  t.after(() => rmSync(output, { recursive: true, force: true }));
  let bash = 'bash';
  if (process.platform === 'win32') {
    const gitRoot = path.resolve(
      execFileSync('git', ['--exec-path'], { encoding: 'utf8' }).trim(),
      '../../..',
    );
    bash = ['bin/bash.exe', 'usr/bin/bash.exe']
      .map(file => path.join(gitRoot, file))
      .find(existsSync);
    assert.ok(bash, 'Git Bash is required to execute the Linux artifact naming step');
  }
  for (const attempt of ['1', '2']) {
    const file = path.join(output, `attempt-${attempt}`).replaceAll('\\', '/');
    execFileSync(bash, ['-c', naming.run], {
      env: { ...process.env, GITHUB_RUN_ATTEMPT: attempt, GITHUB_OUTPUT: file },
    });
    assert.equal(
      readFileSync(file, 'utf8').trim(),
      `name=${rulingConfig['results-artifact-name']}-${attempt}`,
    );
  }
  assert.equal(
    producer.outputs['results-artifact-name'],
    '${{ steps.ruling_artifact.outputs.name }}',
  );
  assert.equal(
    producer.steps.find(step => step.id === 'save_ruling').with.name,
    '${{ steps.ruling_artifact.outputs.name }}',
  );
  const download = updater.steps.find(step => step.uses?.startsWith('actions/download-artifact@'));
  const invoke = updater.steps.find(step => step.uses === './.github/actions/ruling_bot');
  assert.equal(download.with.name, '${{ needs.js_ts_ruling.outputs.results-artifact-name }}');
  assert.equal(invoke.with['results-artifact-name'], download.with.name);
  const report = workflow('ruling-diff-comment.yml');
  const reportInvoke = report.jobs['ruling-diff-comment'].steps.find(
    step => step.uses === './.github/actions/ruling_bot/report',
  );
  assert.match(
    reportInvoke.with['results-artifact-name'],
    /^\$\{\{ inputs\.results-artifact-name \|\| /,
  );
});

test('explicit dispatch defaults match the caller and preserve intentionally empty link inputs', () => {
  const build = workflow('build.yml');
  const invoke = build.jobs.js_ts_ruling_update.steps.find(
    step => step.uses === './.github/actions/ruling_bot',
  );
  const report = workflow('ruling-diff-comment.yml');
  const inputs = report.on.workflow_dispatch.inputs;
  assert.equal(Object.keys(inputs).length, 9 + Object.keys(inputDefinitions).length);
  assert.ok(Object.keys(inputs).length <= 25);
  const reportInvoke = report.jobs['ruling-diff-comment'].steps.find(
    step => step.uses === './.github/actions/ruling_bot/report',
  );
  for (const name of Object.keys(inputDefinitions).filter(
    name => name !== 'results-artifact-name',
  )) {
    assert.equal(inputs[name].default, invoke.with[name]);
    assert.equal(
      reportInvoke.with[name],
      "${{ github.event_name == 'pull_request' && '" +
        invoke.with[name] +
        "' || inputs." +
        name +
        ' }}',
    );
  }
});

test('successful report dispatch is recorded in Build metadata only when requested', () => {
  const build = workflow('build.yml');
  const steps = build.jobs.js_ts_ruling_update.steps;
  const record = steps.find(step => step.name === rulingConfig['report-dispatch-step']);
  assert.equal(record.if, "steps.ruling_update.outputs.report-requested == 'true'");
  assert.equal(
    steps.find(step => step.id === 'ruling_update').uses,
    './.github/actions/ruling_bot',
  );
  const action = yaml.parse(readFileSync(new URL('../action.yml', import.meta.url), 'utf8'));
  assert.equal(
    action.outputs['report-requested'].value,
    '${{ steps.ruling_bot.outputs.report-requested }}',
  );
  assert.ok(action.runs.steps.some(step => step.id === 'ruling_bot'));
});

test('report downloads use the validated preflight destination and the tested checkout owns bot code', () => {
  const action = yaml.parse(readFileSync(new URL('../report/action.yml', import.meta.url), 'utf8'));
  const download = action.runs.steps.find(step =>
    step.uses?.startsWith('actions/download-artifact@'),
  );
  assert.equal(download.with.path, '${{ steps.fresh.outputs.results-path }}');
  const report = workflow('ruling-diff-comment.yml');
  const checkouts = report.jobs['ruling-diff-comment'].steps.filter(step =>
    step.uses?.startsWith('actions/checkout@'),
  );
  assert.equal(checkouts.length, 1);
  assert.equal(checkouts[0].with.ref, '${{ inputs.head-sha || github.sha }}');
  assert.equal(checkouts[0].with['fetch-depth'], 2);
  assert.equal(checkouts[0].with.submodules, true);
  assert.equal(checkouts[0].with.path, undefined);
});

test('checked-in configuration consumers are generated from the canonical definitions', () => {
  for (const [name, content] of generatedFiles()) {
    assert.equal(
      readFileSync(new URL(`../../../../${name}`, import.meta.url), 'utf8'),
      content,
      `${name} needs regeneration`,
    );
  }
});

test('changing canonical paths, links, artifact names and generic defaults updates every consumer', () => {
  const config = {
    ...rulingConfig,
    'new-results-path': 'generated-results',
    'old-results-path': 'expectations',
    'sources-repo-url': '',
    'results-artifact-name': 'saved-results',
  };
  const definitions = {
    ...inputDefinitions,
    'max-inline-snippets': { ...inputDefinitions['max-inline-snippets'], default: '4' },
  };
  const files = generatedFiles(config, definitions);
  const build = yaml.parse(files.get('.github/workflows/build.yml'));
  const report = yaml.parse(files.get('.github/workflows/ruling-diff-comment.yml'));
  const caller = build.jobs.js_ts_ruling_update.steps.find(step => step.id === 'ruling_update');
  assert.equal(caller.with['old-results-path'], 'expectations');
  assert.equal(report.on.workflow_dispatch.inputs['old-results-path'].default, 'expectations');
  assert.equal(report.on.workflow_dispatch.inputs['sources-repo-url'].default, '');
  assert.match(
    build.jobs.js_ts_ruling.steps.find(step => step.id === 'ruling_artifact').run,
    /name=saved-results-/,
  );
  assert.ok(build.jobs.js_ts_ruling.steps.some(step => step.with?.path === 'generated-results/'));
  assert.match(
    JSON.parse(files.get('package.json')).scripts['ruling-sync'],
    /generated-results expectations$/,
  );
  for (const name of ['action.yml', 'report/action.yml']) {
    assert.equal(
      yaml.parse(files.get(`.github/actions/ruling_bot/${name}`)).inputs['max-inline-snippets']
        .default,
      '4',
    );
  }
});
