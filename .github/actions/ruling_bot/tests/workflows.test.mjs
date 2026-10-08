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
    assert.equal(readFileSync(file, 'utf8').trim(), `name=actual_js_ts-${attempt}`);
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
  assert.equal(Object.keys(inputs).length, 18);
  assert.ok(Object.keys(inputs).length <= 25);
  const reportInvoke = report.jobs['ruling-diff-comment'].steps.find(
    step => step.uses === './.github/actions/ruling_bot/report',
  );
  for (const name of [
    'new-results-path',
    'old-results-path',
    'sources-path',
    'sources-repo-url',
    'rspec-base-url',
    'max-inline-snippets',
    'report-workflow',
  ]) {
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
