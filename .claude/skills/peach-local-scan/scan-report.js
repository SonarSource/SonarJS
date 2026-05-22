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
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const REPORT_VERSION = 1;
const TERMINAL_STATES = new Set(['succeeded', 'skipped', 'failed']);
const USAGE = `Usage:
  node .claude/skills/peach-local-scan/scan-report.js init [--force] <report-path> <peachee-root> <nigel-root> <rebuild-analyzer:true|false> <patch-local-analyzer:true|false> <project>...
  node .claude/skills/peach-local-scan/scan-report.js project-start <report-path> <project> <project-key> <artifact-dir>
  node .claude/skills/peach-local-scan/scan-report.js project-success <report-path> <project> <project-key> <artifact-dir>
  node .claude/skills/peach-local-scan/scan-report.js project-failure <report-path> <project> <project-key> <artifact-dir> <phase> <message>`;

export function initializeScanReport(options, runtime = {}) {
  const reportPath = readRequiredOption(options.reportPath, 'reportPath is required');
  const projects = readProjects(options.projects);
  const writeReport = createWriteReport(runtime);
  const existsSync = runtime.existsSync ?? fs.existsSync;

  if (!options.force && existsSync(reportPath)) {
    throw new Error(`Scan report already exists: ${reportPath}`);
  }

  const timestamp = toTimestamp(runtime.now);
  const artifactRoot = path.dirname(reportPath);
  const report = {
    version: REPORT_VERSION,
    status: 'running',
    createdAt: timestamp,
    updatedAt: timestamp,
    completedAt: null,
    currentProject: null,
    artifactRoot,
    options: {
      nigelRoot: readRequiredOption(options.nigelRoot, 'nigelRoot is required'),
      patchLocalAnalyzer: readBooleanOption(
        options.patchLocalAnalyzer,
        'patchLocalAnalyzer is required',
      ),
      peacheeRoot: readRequiredOption(options.peacheeRoot, 'peacheeRoot is required'),
      rebuildAnalyzer: readBooleanOption(options.rebuildAnalyzer, 'rebuildAnalyzer is required'),
    },
    projectOrder: [...projects],
    progress: {
      completed: 0,
      failed: 0,
      pending: projects.length,
      running: 0,
      skipped: 0,
      succeeded: 0,
      total: projects.length,
    },
    projects: projects.map(project => createProjectRecord(project, artifactRoot)),
  };

  writeReport(reportPath, report);
  return report;
}

export function readScanReport(options, runtime = {}) {
  const reportPath = readRequiredOption(options.reportPath, 'reportPath is required');
  const readFileSync = runtime.readFileSync ?? fs.readFileSync;
  return JSON.parse(readFileSync(reportPath, 'utf-8'));
}

export function markProjectStarted(options, runtime = {}) {
  return updateProject(options, runtime, (report, projectRecord, timestamp) => {
    projectRecord.status = 'running';
    projectRecord.projectKey = readRequiredOption(options.projectKey, 'projectKey is required');
    projectRecord.startedAt = timestamp;
    projectRecord.finishedAt = null;
    projectRecord.durationMs = null;
    projectRecord.scanStatus = 'running';
    projectRecord.ceStatus = null;
    projectRecord.issueFetchStatus = null;
    projectRecord.failure = null;
    projectRecord.issueSummary = null;
    report.currentProject = projectRecord.name;
  });
}

export function markProjectSucceeded(options, runtime = {}) {
  const projectKey = readRequiredOption(options.projectKey, 'projectKey is required');
  const artifactDir = readRequiredOption(options.artifactDir, 'artifactDir is required');
  const readFileSync = runtime.readFileSync ?? fs.readFileSync;

  return updateProject(options, runtime, (report, projectRecord, timestamp) => {
    const issuesPath = path.join(artifactDir, 'issues.json');
    const issueSummary = summarizeIssuesArtifact(readFileSync(issuesPath, 'utf-8'));

    projectRecord.status = 'succeeded';
    projectRecord.projectKey = projectKey;
    projectRecord.finishedAt = timestamp;
    projectRecord.durationMs = readDurationMs(projectRecord.startedAt, timestamp);
    projectRecord.scanStatus = 'succeeded';
    projectRecord.ceStatus = 'succeeded';
    projectRecord.issueFetchStatus = 'succeeded';
    projectRecord.failure = null;
    projectRecord.issueSummary = issueSummary;
    report.currentProject = null;
  });
}

export function markProjectFailed(options, runtime = {}) {
  const projectKey = readRequiredOption(options.projectKey, 'projectKey is required');
  const phase = readRequiredOption(options.phase, 'phase is required');
  const message = readRequiredOption(options.message, 'message is required');

  return updateProject(options, runtime, (report, projectRecord, timestamp) => {
    projectRecord.status = 'failed';
    projectRecord.projectKey = projectKey;
    projectRecord.finishedAt = timestamp;
    projectRecord.durationMs = readDurationMs(projectRecord.startedAt, timestamp);
    projectRecord.failure = { phase, message };
    projectRecord.issueSummary = null;
    projectRecord.scanStatus =
      phase === 'scan' ? 'failed' : phase === 'ce' || phase === 'issue-fetch' ? 'succeeded' : null;
    projectRecord.ceStatus =
      phase === 'ce' ? 'failed' : phase === 'issue-fetch' ? 'succeeded' : null;
    projectRecord.issueFetchStatus = phase === 'issue-fetch' ? 'failed' : null;
    report.currentProject = null;
  });
}

export function summarizeIssuesArtifact(text) {
  const payload = JSON.parse(text);
  const issues = Array.isArray(payload?.issues) ? payload.issues : [];
  const byRuleBuckets = new Map();
  const byLanguage = createLanguageCounts();

  for (const issue of issues) {
    const rule = String(issue?.rule ?? '');
    const language = classifyIssueLanguage(issue);
    byLanguage[language] += 1;
    byLanguage.total += 1;

    if (!byRuleBuckets.has(rule)) {
      byRuleBuckets.set(rule, createLanguageCounts());
    }
    const languageCounts = byRuleBuckets.get(rule);
    languageCounts[language] += 1;
    languageCounts.total += 1;
  }

  const sortedRules = [...byRuleBuckets.keys()].sort();
  const byRule = {};
  const byRuleAndLanguage = {};
  for (const rule of sortedRules) {
    const counts = byRuleBuckets.get(rule);
    byRule[rule] = counts.total;
    byRuleAndLanguage[rule] = counts;
  }

  return {
    total: issues.length,
    byLanguage,
    byRule,
    byRuleAndLanguage,
  };
}

function updateProject(options, runtime, mutateProject) {
  const reportPath = readRequiredOption(options.reportPath, 'reportPath is required');
  const project = readRequiredOption(options.project, 'project is required');
  const artifactDir = readRequiredOption(options.artifactDir, 'artifactDir is required');
  const writeReport = createWriteReport(runtime);
  const report = readScanReport({ reportPath }, runtime);
  const projectRecord = findProject(report, project);
  const timestamp = toTimestamp(runtime.now);

  projectRecord.artifactDir = artifactDir;
  projectRecord.scanLogPath = path.join(artifactDir, 'scan.log');
  projectRecord.issuesPath = path.join(artifactDir, 'issues.json');
  projectRecord.reportTaskPath = path.join(artifactDir, 'report-task.txt');
  projectRecord.installLogPath = path.join(artifactDir, 'install.log');

  mutateProject(report, projectRecord, timestamp);
  report.updatedAt = timestamp;
  updateReportStatus(report, timestamp);
  writeReport(reportPath, report);
  return report;
}

function createWriteReport(runtime) {
  const mkdirSync = runtime.mkdirSync ?? fs.mkdirSync;
  const writeFileSync = runtime.writeFileSync ?? fs.writeFileSync;

  return (reportPath, report) => {
    const reportDirectory = path.dirname(reportPath);
    mkdirSync(reportDirectory, { recursive: true });
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf-8');
    writeFileSync(markdownPathFor(reportPath), `${renderScanReportMarkdown(report)}\n`, 'utf-8');
  };
}

function updateReportStatus(report, timestamp) {
  report.progress = computeProgress(report.projects);
  if (report.progress.running > 0 || report.progress.pending > 0) {
    report.status = 'running';
    report.completedAt = null;
    return;
  }

  report.completedAt = timestamp;
  report.status = report.progress.failed > 0 ? 'failed' : 'completed';
}

function computeProgress(projects) {
  const progress = {
    completed: 0,
    failed: 0,
    pending: 0,
    running: 0,
    skipped: 0,
    succeeded: 0,
    total: projects.length,
  };

  for (const project of projects) {
    if (TERMINAL_STATES.has(project.status)) {
      progress.completed += 1;
    }
    if (project.status === 'failed') {
      progress.failed += 1;
    }
    if (project.status === 'pending') {
      progress.pending += 1;
    }
    if (project.status === 'running') {
      progress.running += 1;
    }
    if (project.status === 'skipped') {
      progress.skipped += 1;
    }
    if (project.status === 'succeeded') {
      progress.succeeded += 1;
    }
  }

  return progress;
}

function createProjectRecord(project, artifactRoot) {
  const artifactDir = path.join(artifactRoot, project);
  return {
    name: project,
    status: 'pending',
    projectKey: null,
    startedAt: null,
    finishedAt: null,
    durationMs: null,
    artifactDir,
    scanLogPath: path.join(artifactDir, 'scan.log'),
    issuesPath: path.join(artifactDir, 'issues.json'),
    reportTaskPath: path.join(artifactDir, 'report-task.txt'),
    installLogPath: path.join(artifactDir, 'install.log'),
    scanStatus: null,
    ceStatus: null,
    issueFetchStatus: null,
    failure: null,
    issueSummary: null,
  };
}

function renderScanReportMarkdown(report) {
  const lines = [
    '# Peach Local Scan Report',
    '',
    '- Status: `' + report.status + '`',
    '- Progress: `' +
      `${report.progress.completed}/${report.progress.total}` +
      '` completed, `' +
      report.progress.running +
      '` running, `' +
      report.progress.pending +
      '` pending, `' +
      report.progress.failed +
      '` failed',
    '- Current Project: `' + (report.currentProject ?? 'none') + '`',
    '- Created: `' + report.createdAt + '`',
    '- Updated: `' + report.updatedAt + '`',
    '- Artifact Root: `' + report.artifactRoot + '`',
    '- Peachee Root: `' + report.options.peacheeRoot + '`',
    '- Nigel Root: `' + report.options.nigelRoot + '`',
    '- Rebuild Analyzer: `' + String(report.options.rebuildAnalyzer) + '`',
    '- Patch Local Analyzer: `' + String(report.options.patchLocalAnalyzer) + '`',
    '',
    '## Projects',
    '',
    '| Project | Status | Issues | JS | TS | Other | Duration | Failure |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |',
  ];

  for (const project of report.projects) {
    const issueSummary = project.issueSummary ?? {};
    const byLanguage = issueSummary.byLanguage ?? {};
    const failure = project.failure ? `${project.failure.phase}: ${project.failure.message}` : '-';
    lines.push(
      '| `' +
        project.name +
        '` | `' +
        project.status +
        '` | ' +
        formatCount(issueSummary.total) +
        ' | ' +
        formatCount(byLanguage.js) +
        ' | ' +
        formatCount(byLanguage.ts) +
        ' | ' +
        formatCount(byLanguage.other) +
        ' | ' +
        formatDuration(project.durationMs) +
        ' | ' +
        failure +
        ' |',
    );
  }

  lines.push('');
  lines.push('See `scan-report.json` for per-project artifact paths and rule summaries.');
  return lines.join('\n');
}

function classifyIssueLanguage(issue) {
  const filePath = extractIssuePath(issue);
  const extension = path.extname(filePath).toLowerCase();

  if (['.js', '.jsx', '.cjs', '.mjs'].includes(extension)) {
    return 'js';
  }
  if (['.ts', '.tsx', '.cts', '.mts'].includes(extension)) {
    return 'ts';
  }
  return 'other';
}

function extractIssuePath(issue) {
  const component = String(issue?.component ?? '');
  const projectKey = String(issue?.project ?? '');
  const prefix = projectKey.length > 0 ? `${projectKey}:` : '';

  if (prefix.length > 0 && component.startsWith(prefix)) {
    return component.slice(prefix.length);
  }

  const separator = component.lastIndexOf(':');
  return separator >= 0 ? component.slice(separator + 1) : component;
}

function createLanguageCounts() {
  return { js: 0, ts: 0, other: 0, total: 0 };
}

function readProjects(projects) {
  if (!Array.isArray(projects) || projects.length === 0) {
    throw new Error('projects must be a non-empty array');
  }

  return projects.map(project => readRequiredOption(project, 'project name is required'));
}

function findProject(report, project) {
  const projectRecord = report.projects.find(candidate => candidate.name === project);
  if (!projectRecord) {
    throw new Error(`Unknown project in scan report: ${project}`);
  }
  return projectRecord;
}

function readRequiredOption(value, message) {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  throw new Error(message);
}

function readBooleanOption(value, message) {
  if (typeof value === 'boolean') {
    return value;
  }
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  throw new Error(message);
}

function readDurationMs(startedAt, finishedAt) {
  if (!startedAt) {
    return null;
  }

  const startedTime = Date.parse(startedAt);
  const finishedTime = Date.parse(finishedAt);
  if (Number.isNaN(startedTime) || Number.isNaN(finishedTime)) {
    return null;
  }
  return Math.max(0, finishedTime - startedTime);
}

function formatCount(value) {
  return Number.isInteger(value) ? String(value) : '-';
}

function formatDuration(durationMs) {
  return Number.isInteger(durationMs) ? `${durationMs} ms` : '-';
}

function markdownPathFor(reportPath) {
  return reportPath.endsWith('.json')
    ? `${reportPath.slice(0, -'.json'.length)}.md`
    : `${reportPath}.md`;
}

function toTimestamp(nowProvider) {
  const value = typeof nowProvider === 'function' ? nowProvider() : new Date();
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'string') {
    return value;
  }
  throw new Error('now provider must return a Date or ISO timestamp string');
}

export async function main(argv = process.argv.slice(2), runtime = {}) {
  const log = runtime.log ?? console.log;

  if (argv.includes('--help') || argv.includes('-h') || argv.length === 0) {
    log(USAGE);
    return;
  }

  const [command, ...rest] = argv;
  switch (command) {
    case 'init': {
      const force = rest[0] === '--force';
      const args = force ? rest.slice(1) : rest;
      if (args.length < 6) {
        throw new Error(USAGE);
      }
      const [reportPath, peacheeRoot, nigelRoot, rebuildAnalyzer, patchLocalAnalyzer, ...projects] =
        args;
      initializeScanReport(
        {
          force,
          nigelRoot,
          patchLocalAnalyzer,
          peacheeRoot,
          projects,
          rebuildAnalyzer,
          reportPath,
        },
        runtime,
      );
      return;
    }
    case 'project-start': {
      if (rest.length !== 4) {
        throw new Error(USAGE);
      }
      const [reportPath, project, projectKey, artifactDir] = rest;
      markProjectStarted({ reportPath, project, projectKey, artifactDir }, runtime);
      return;
    }
    case 'project-success': {
      if (rest.length !== 4) {
        throw new Error(USAGE);
      }
      const [reportPath, project, projectKey, artifactDir] = rest;
      markProjectSucceeded({ reportPath, project, projectKey, artifactDir }, runtime);
      return;
    }
    case 'project-failure': {
      if (rest.length < 6) {
        throw new Error(USAGE);
      }
      const [reportPath, project, projectKey, artifactDir, phase, ...messageParts] = rest;
      markProjectFailed(
        {
          reportPath,
          project,
          projectKey,
          artifactDir,
          phase,
          message: messageParts.join(' '),
        },
        runtime,
      );
      return;
    }
    default:
      throw new Error(USAGE);
  }
}

const entrypoint = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === entrypoint) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
