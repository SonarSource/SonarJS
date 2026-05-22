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
import test from 'node:test';

import {
  initializeScanReport,
  markProjectFailed,
  markProjectStarted,
  markProjectSucceeded,
  readScanReport,
} from './scan-report.js';

const REPORT_PATH = '/workspace/target/peach-local-scan/scan-report.json';

test('initializeScanReport creates placeholder entries and a readable markdown summary', () => {
  const runtime = createRuntime();

  initializeScanReport(
    {
      reportPath: REPORT_PATH,
      peacheeRoot: '/workspace/peachee-js',
      nigelRoot: '/workspace/nigel',
      rebuildAnalyzer: false,
      patchLocalAnalyzer: true,
      projects: ['alpha', 'beta'],
    },
    runtime,
  );

  const report = readScanReport({ reportPath: REPORT_PATH }, runtime);
  assert.equal(report.status, 'running');
  assert.equal(report.currentProject, null);
  assert.deepEqual(report.projectOrder, ['alpha', 'beta']);
  assert.deepEqual(report.progress, {
    completed: 0,
    failed: 0,
    pending: 2,
    running: 0,
    skipped: 0,
    succeeded: 0,
    total: 2,
  });
  assert.deepEqual(
    report.projects.map(project => project.name),
    ['alpha', 'beta'],
  );
  assert.deepEqual(
    report.projects.map(project => project.status),
    ['pending', 'pending'],
  );
  assert.deepEqual(
    report.projects.map(project => project.artifactDir),
    ['/workspace/target/peach-local-scan/alpha', '/workspace/target/peach-local-scan/beta'],
  );

  const markdown = runtime.files['/workspace/target/peach-local-scan/scan-report.md'];
  assert.match(markdown, /^# Peach Local Scan Report/m);
  assert.match(markdown, /^- Status: `running`$/m);
  assert.match(markdown, /^- Progress: `0\/2` completed, `0` running, `2` pending, `0` failed$/m);
  assert.match(markdown, /\| `alpha` \| `pending` \| - \| - \| - \| - \| - \|/);
  assert.match(markdown, /\| `beta` \| `pending` \| - \| - \| - \| - \| - \|/);
});

test('markProjectSucceeded records generic issue summaries and keeps artifact paths', () => {
  const runtime = createRuntime();

  initializeScanReport(
    {
      reportPath: REPORT_PATH,
      peacheeRoot: '/workspace/peachee-js',
      nigelRoot: '/workspace/nigel',
      rebuildAnalyzer: true,
      patchLocalAnalyzer: false,
      projects: ['gamma'],
    },
    runtime,
  );

  markProjectStarted(
    {
      reportPath: REPORT_PATH,
      project: 'gamma',
      projectKey: 'peach:gamma',
      artifactDir: '/workspace/target/peach-local-scan/gamma',
    },
    runtime,
  );

  runtime.files['/workspace/target/peach-local-scan/gamma/issues.json'] = `${JSON.stringify(
    {
      projectKey: 'peach:gamma',
      total: 4,
      issues: [
        {
          key: 'js-1',
          rule: 'javascript:S100',
          severity: 'MAJOR',
          component: 'peach:gamma:src/index.js',
          project: 'peach:gamma',
          line: 3,
          message: 'js issue',
          type: 'CODE_SMELL',
          status: 'OPEN',
        },
        {
          key: 'ts-1',
          rule: 'javascript:S100',
          severity: 'CRITICAL',
          component: 'peach:gamma:src/types.ts',
          project: 'peach:gamma',
          line: 7,
          message: 'ts issue',
          type: 'BUG',
          status: 'OPEN',
        },
        {
          key: 'mts-1',
          rule: 'javascript:S200',
          severity: 'MAJOR',
          component: 'peach:gamma:src/module.mts',
          project: 'peach:gamma',
          line: 11,
          message: 'module issue',
          type: 'BUG',
          status: 'OPEN',
        },
        {
          key: 'other-1',
          rule: 'javascript:S300',
          severity: 'MINOR',
          component: 'peach:gamma:docs/generated.json',
          project: 'peach:gamma',
          line: 1,
          message: 'other issue',
          type: 'CODE_SMELL',
          status: 'OPEN',
        },
      ],
    },
    null,
    2,
  )}\n`;

  markProjectSucceeded(
    {
      reportPath: REPORT_PATH,
      project: 'gamma',
      projectKey: 'peach:gamma',
      artifactDir: '/workspace/target/peach-local-scan/gamma',
    },
    runtime,
  );

  const report = readScanReport({ reportPath: REPORT_PATH }, runtime);
  assert.equal(report.status, 'completed');
  assert.equal(report.currentProject, null);
  assert.deepEqual(report.progress, {
    completed: 1,
    failed: 0,
    pending: 0,
    running: 0,
    skipped: 0,
    succeeded: 1,
    total: 1,
  });

  const project = report.projects[0];
  assert.equal(project.status, 'succeeded');
  assert.equal(project.projectKey, 'peach:gamma');
  assert.equal(project.scanStatus, 'succeeded');
  assert.equal(project.ceStatus, 'succeeded');
  assert.equal(project.issueFetchStatus, 'succeeded');
  assert.deepEqual(project.issueSummary, {
    total: 4,
    byLanguage: {
      js: 1,
      other: 1,
      total: 4,
      ts: 2,
    },
    byRule: {
      'javascript:S100': 2,
      'javascript:S200': 1,
      'javascript:S300': 1,
    },
    byRuleAndLanguage: {
      'javascript:S100': {
        js: 1,
        other: 0,
        total: 2,
        ts: 1,
      },
      'javascript:S200': {
        js: 0,
        other: 0,
        total: 1,
        ts: 1,
      },
      'javascript:S300': {
        js: 0,
        other: 1,
        total: 1,
        ts: 0,
      },
    },
  });

  const markdown = runtime.files['/workspace/target/peach-local-scan/scan-report.md'];
  assert.match(markdown, /^- Status: `completed`$/m);
  assert.match(markdown, /^- Current Project: `none`$/m);
  assert.match(markdown, /\| `gamma` \| `succeeded` \| 4 \| 1 \| 2 \| 1 \| 1000 ms \|/);
});

test('markProjectFailed keeps the run resumable and preserves failure metadata', () => {
  const runtime = createRuntime();

  initializeScanReport(
    {
      reportPath: REPORT_PATH,
      peacheeRoot: '/workspace/peachee-js',
      nigelRoot: '/workspace/nigel',
      rebuildAnalyzer: false,
      patchLocalAnalyzer: false,
      projects: ['alpha', 'beta'],
    },
    runtime,
  );

  markProjectStarted(
    {
      reportPath: REPORT_PATH,
      project: 'alpha',
      projectKey: 'peach:alpha',
      artifactDir: '/workspace/target/peach-local-scan/alpha',
    },
    runtime,
  );

  markProjectFailed(
    {
      reportPath: REPORT_PATH,
      project: 'alpha',
      projectKey: 'peach:alpha',
      artifactDir: '/workspace/target/peach-local-scan/alpha',
      phase: 'scan',
      message: 'scanner exited with code 1',
    },
    runtime,
  );

  const report = readScanReport({ reportPath: REPORT_PATH }, runtime);
  assert.equal(report.status, 'running');
  assert.equal(report.currentProject, null);
  assert.deepEqual(report.progress, {
    completed: 1,
    failed: 1,
    pending: 1,
    running: 0,
    skipped: 0,
    succeeded: 0,
    total: 2,
  });

  const project = report.projects[0];
  assert.equal(project.status, 'failed');
  assert.equal(project.projectKey, 'peach:alpha');
  assert.equal(project.scanStatus, 'failed');
  assert.equal(project.ceStatus, null);
  assert.equal(project.issueFetchStatus, null);
  assert.deepEqual(project.failure, {
    message: 'scanner exited with code 1',
    phase: 'scan',
  });

  const markdown = runtime.files['/workspace/target/peach-local-scan/scan-report.md'];
  assert.match(markdown, /^- Status: `running`$/m);
  assert.match(markdown, /^- Progress: `1\/2` completed, `0` running, `1` pending, `1` failed$/m);
  assert.match(
    markdown,
    /\| `alpha` \| `failed` \| - \| - \| - \| - \| 1000 ms \| scan: scanner exited with code 1 \|/,
  );
});

function createRuntime() {
  const files = {};
  const directoryWrites = [];
  let tick = 0;

  return {
    files,
    directoryWrites,
    existsSync: filePath => Object.hasOwn(files, filePath),
    mkdirSync: (directoryPath, options) => {
      directoryWrites.push([directoryPath, options]);
    },
    now: () => new Date(`2026-05-22T10:00:0${tick++}Z`),
    readFileSync: (filePath, encoding) => {
      assert.equal(encoding, 'utf-8');
      if (!Object.hasOwn(files, filePath)) {
        throw new Error(`ENOENT: ${filePath}`);
      }
      return files[filePath];
    },
    writeFileSync: (filePath, content, encoding) => {
      assert.equal(encoding, 'utf-8');
      files[filePath] = content;
    },
  };
}
