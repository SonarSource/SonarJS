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
  migrateLegacyScanReport,
  readScanReport,
  writeAnalyzerState,
} from './scan-report.js';

const ARTIFACT_ROOT = '/workspace/target/peach-local-scan';
const REPORT_PATH = '/workspace/target/peach-local-scan/peach-local-scan.json';

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
  assert.equal(report.analyzerState, null);

  const markdown = runtime.files['/workspace/target/peach-local-scan/peach-local-scan.md'];
  assert.match(markdown, /^# Peach Local Scan Report/m);
  assert.match(markdown, /^- Status: `running`$/m);
  assert.match(markdown, /^- Progress: `0\/2` completed, `0` running, `2` pending, `0` failed$/m);
  assert.match(markdown, /^- Analyzer Snapshot: `none`$/m);
  assert.match(markdown, /\| `alpha` \| `pending` \| - \| - \| - \| - \| - \|/);
  assert.match(markdown, /\| `beta` \| `pending` \| - \| - \| - \| - \| - \|/);
});

test('writeAnalyzerState stores snapshot metadata in the main report', () => {
  const runtime = createRuntime();

  initializeScanReport(
    {
      reportPath: REPORT_PATH,
      peacheeRoot: '/workspace/peachee-js',
      nigelRoot: '/workspace/nigel',
      rebuildAnalyzer: false,
      patchLocalAnalyzer: true,
      projects: ['alpha'],
    },
    runtime,
  );

  writeAnalyzerState(
    {
      reportPath: REPORT_PATH,
      stateDir: '/workspace/target/peach-local-scan/sonarqube-analyzer-state',
      container: {
        id: 'container-id',
        image: 'image-sha',
        createdAt: '2026-05-22T10:00:00.000Z',
        startedAt: '2026-05-22T10:00:01.000Z',
      },
      entries: [
        {
          kind: 'builtin',
          originalPath: '/opt/sonarqube/lib/extensions/sonar-javascript-plugin.jar',
          backupName: '00-builtin.jar',
        },
      ],
    },
    runtime,
  );

  const report = readScanReport({ reportPath: REPORT_PATH }, runtime);
  assert.deepEqual(report.analyzerState, {
    stateDir: '/workspace/target/peach-local-scan/sonarqube-analyzer-state',
    container: {
      id: 'container-id',
      image: 'image-sha',
      createdAt: '2026-05-22T10:00:00.000Z',
      startedAt: '2026-05-22T10:00:01.000Z',
    },
    entries: [
      {
        kind: 'builtin',
        originalPath: '/opt/sonarqube/lib/extensions/sonar-javascript-plugin.jar',
        backupName: '00-builtin.jar',
      },
    ],
  });

  const markdown = runtime.files['/workspace/target/peach-local-scan/peach-local-scan.md'];
  assert.match(markdown, /^- Analyzer Snapshot: `1 entry for container-id`$/m);
  assert.match(
    markdown,
    /See `peach-local-scan.json` for per-project artifact paths and rule summaries\./,
  );
});

test('markdown footer follows the report filename', () => {
  const runtime = createRuntime();
  const legacyReportPath = '/workspace/target/peach-local-scan/scan-report.json';

  initializeScanReport(
    {
      reportPath: legacyReportPath,
      peacheeRoot: '/workspace/peachee-js',
      nigelRoot: '/workspace/nigel',
      rebuildAnalyzer: false,
      patchLocalAnalyzer: false,
      projects: ['alpha'],
    },
    runtime,
  );

  const markdown = runtime.files['/workspace/target/peach-local-scan/scan-report.md'];
  assert.match(
    markdown,
    /See `scan-report.json` for per-project artifact paths and rule summaries\./,
  );
});

test('migrateLegacyScanReport converts legacy files and merges analyzer metadata', () => {
  const runtime = createRuntime();
  const legacyReportPath = `${ARTIFACT_ROOT}/scan-report.json`;
  const legacyMarkdownPath = `${ARTIFACT_ROOT}/scan-report.md`;
  const stateDir = `${ARTIFACT_ROOT}/sonarqube-analyzer-state`;

  runtime.files[legacyReportPath] = `${JSON.stringify(
    {
      version: 1,
      status: 'running',
      createdAt: '2026-05-22T10:00:00.000Z',
      updatedAt: '2026-05-22T10:00:00.000Z',
      completedAt: null,
      currentProject: 'alpha',
      artifactRoot: ARTIFACT_ROOT,
      options: {
        nigelRoot: '/workspace/nigel',
        patchLocalAnalyzer: true,
        peacheeRoot: '/workspace/peachee-js',
        rebuildAnalyzer: true,
      },
      projectOrder: ['alpha'],
      progress: {
        completed: 0,
        failed: 0,
        pending: 0,
        running: 1,
        skipped: 0,
        succeeded: 0,
        total: 1,
      },
      projects: [
        {
          name: 'alpha',
          status: 'running',
          projectKey: 'peach:alpha',
          startedAt: '2026-05-22T10:00:00.000Z',
          finishedAt: null,
          durationMs: null,
          artifactDir: `${ARTIFACT_ROOT}/alpha`,
          scanLogPath: `${ARTIFACT_ROOT}/alpha/scan.log`,
          issuesPath: `${ARTIFACT_ROOT}/alpha/issues.json`,
          reportTaskPath: `${ARTIFACT_ROOT}/alpha/report-task.txt`,
          installLogPath: `${ARTIFACT_ROOT}/alpha/install.log`,
          scanStatus: 'running',
          ceStatus: null,
          issueFetchStatus: null,
          failure: null,
          issueSummary: null,
        },
      ],
    },
    null,
    2,
  )}\n`;
  runtime.files[legacyMarkdownPath] = '# Legacy Report\n';
  runtime.files[`${stateDir}/container.txt`] =
    'container-id image-sha 2026-05-22T10:00:00.000Z 2026-05-22T10:00:01.000Z\n';
  runtime.files[`${stateDir}/snapshot.tsv`] =
    'builtin\t/opt/sonarqube/lib/extensions/sonar-javascript-plugin.jar\t00-builtin.jar\n';

  migrateLegacyScanReport({ artifactRoot: ARTIFACT_ROOT }, runtime);

  const report = readScanReport({ reportPath: REPORT_PATH }, runtime);
  assert.equal(report.version, 2);
  assert.deepEqual(report.analyzerState, {
    stateDir,
    container: {
      id: 'container-id',
      image: 'image-sha',
      createdAt: '2026-05-22T10:00:00.000Z',
      startedAt: '2026-05-22T10:00:01.000Z',
    },
    entries: [
      {
        kind: 'builtin',
        originalPath: '/opt/sonarqube/lib/extensions/sonar-javascript-plugin.jar',
        backupName: '00-builtin.jar',
      },
    ],
  });
  assert.equal(runtime.files[legacyReportPath], undefined);
  assert.equal(runtime.files[legacyMarkdownPath], undefined);
  assert.equal(runtime.files[`${stateDir}/container.txt`], undefined);
  assert.equal(runtime.files[`${stateDir}/snapshot.tsv`], undefined);

  const markdown = runtime.files['/workspace/target/peach-local-scan/peach-local-scan.md'];
  assert.match(markdown, /^- Analyzer Snapshot: `1 entry for container-id`$/m);
  assert.match(
    markdown,
    /See `peach-local-scan.json` for per-project artifact paths and rule summaries\./,
  );
});

test('migrateLegacyScanReport rejects partial legacy analyzer metadata', () => {
  const runtime = createRuntime();
  const legacyReportPath = `${ARTIFACT_ROOT}/scan-report.json`;
  const stateDir = `${ARTIFACT_ROOT}/sonarqube-analyzer-state`;

  runtime.files[legacyReportPath] = `${JSON.stringify(
    {
      version: 1,
      status: 'running',
      createdAt: '2026-05-22T10:00:00.000Z',
      updatedAt: '2026-05-22T10:00:00.000Z',
      completedAt: null,
      currentProject: null,
      artifactRoot: ARTIFACT_ROOT,
      options: {
        nigelRoot: '/workspace/nigel',
        patchLocalAnalyzer: true,
        peacheeRoot: '/workspace/peachee-js',
        rebuildAnalyzer: false,
      },
      projectOrder: ['alpha'],
      progress: {
        completed: 0,
        failed: 0,
        pending: 1,
        running: 0,
        skipped: 0,
        succeeded: 0,
        total: 1,
      },
      projects: [],
    },
    null,
    2,
  )}\n`;
  runtime.files[`${stateDir}/snapshot.tsv`] =
    'builtin\t/opt/sonarqube/lib/extensions/sonar-javascript-plugin.jar\t00-builtin.jar\n';

  assert.throws(
    () => migrateLegacyScanReport({ artifactRoot: ARTIFACT_ROOT }, runtime),
    /Legacy analyzer snapshot is incomplete/,
  );
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

  const markdown = runtime.files['/workspace/target/peach-local-scan/peach-local-scan.md'];
  assert.match(markdown, /^- Status: `completed`$/m);
  assert.match(markdown, /^- Current Project: `none`$/m);
  assert.match(markdown, /\| `gamma` \| `succeeded` \| 4 \| 1 \| 2 \| 1 \| 1000 ms \|/);
  assert.match(
    markdown,
    /See `peach-local-scan.json` for per-project artifact paths and rule summaries\./,
  );
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

  const markdown = runtime.files['/workspace/target/peach-local-scan/peach-local-scan.md'];
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
    rmSync: (filePath, options = {}) => {
      if (!Object.hasOwn(files, filePath)) {
        if (options.force) {
          return;
        }
        throw new Error(`ENOENT: ${filePath}`);
      }
      delete files[filePath];
    },
    writeFileSync: (filePath, content, encoding) => {
      assert.equal(encoding, 'utf-8');
      files[filePath] = content;
    },
  };
}
