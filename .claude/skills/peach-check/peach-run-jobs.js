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
import { execFileSync as nodeExecFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const DEFAULT_REPO = 'SonarSource/peachee-js';
const DEFAULT_PAGE_SIZE = 100;
const WORKFLOW_ONLY_JOBS = new Set(['prepare-project-matrix', 'diff-validation-aggregated']);

export async function collectRunJobs(options, runtime = {}) {
  const runId = readRunId(options.runId);
  const outputDir = options.outputDir ?? 'target';
  const repo = options.repo ?? DEFAULT_REPO;
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const execFileSync = runtime.execFileSync ?? defaultExecFileSync;
  const mkdirSync = runtime.mkdirSync ?? fs.mkdirSync;
  const writeFileSync = runtime.writeFileSync ?? fs.writeFileSync;

  mkdirSync(outputDir, { recursive: true });

  let pages = fetchPaginatedJobPages(runId, repo, pageSize, execFileSync);
  let mergedJobs = mergeJobPages(pages);

  if (!mergedJobs.countsMatch && mergedJobs.expectedTotal > mergedJobs.totalJobs) {
    pages = fetchJobPagesExplicitly(runId, repo, pageSize, mergedJobs.expectedTotal, execFileSync);
    mergedJobs = mergeJobPages(pages);
  }

  if (!mergedJobs.countsMatch) {
    throw new Error(
      `Expected ${mergedJobs.expectedTotal} jobs for Peach run ${runId}, but collected ${mergedJobs.totalJobs}`,
    );
  }

  const analyzedJobs = mergedJobs.jobs.filter(job => !WORKFLOW_ONLY_JOBS.has(job.name));
  const failedJobs = analyzedJobs.filter(job => job.conclusion === 'failure');
  const projectJobs = analyzedJobs.filter(job => job.conclusion === 'success');
  const excludedWorkflowJobs = mergedJobs.jobs.length - analyzedJobs.length;

  const jobsMergedPath = path.join(outputDir, 'jobs-merged.json');
  const analyzedJobsPath = path.join(outputDir, 'analyzed-jobs.json');
  const exclusionCountsPath = path.join(outputDir, 'exclusion-counts.json');
  const failedJobsPath = path.join(outputDir, 'failed-jobs.json');
  const projectJobsPath = path.join(outputDir, 'project-jobs.json');

  writeJson(writeFileSync, jobsMergedPath, {
    expected_total: mergedJobs.expectedTotal,
    total_jobs: mergedJobs.totalJobs,
    failed_jobs: mergedJobs.failedJobs,
    counts_match: mergedJobs.countsMatch,
    jobs: mergedJobs.jobs,
  });
  writeJson(writeFileSync, analyzedJobsPath, {
    total_jobs: analyzedJobs.length,
    jobs: analyzedJobs,
  });
  writeJson(writeFileSync, exclusionCountsPath, {
    excluded_workflow_jobs: excludedWorkflowJobs,
    excluded_project_jobs: 0,
  });
  writeJson(writeFileSync, failedJobsPath, {
    total_jobs: failedJobs.length,
    jobs: failedJobs,
  });
  writeJson(writeFileSync, projectJobsPath, {
    total_jobs: projectJobs.length,
    jobs: projectJobs,
  });

  return {
    jobsMergedPath,
    analyzedJobsPath,
    exclusionCountsPath,
    failedJobsPath,
    projectJobsPath,
    expectedTotal: mergedJobs.expectedTotal,
    totalJobs: mergedJobs.totalJobs,
  };
}

function readRunId(runId) {
  if (typeof runId === 'string' && runId.length > 0) {
    return runId;
  }

  throw new Error('runId is required');
}

function fetchPaginatedJobPages(runId, repo, pageSize, execFileSync) {
  const output = execFileSync('gh', [
    'api',
    `repos/${repo}/actions/runs/${runId}/jobs?per_page=${pageSize}`,
    '--paginate',
    '--slurp',
  ]);
  const payload = parseJson(output);

  if (!Array.isArray(payload)) {
    throw new Error('Expected paginated gh api output to be a JSON array');
  }

  return payload;
}

function fetchJobPagesExplicitly(runId, repo, pageSize, expectedTotal, execFileSync) {
  const pageCount = Math.max(1, Math.ceil(expectedTotal / pageSize));
  return Array.from({ length: pageCount }, (_, index) => {
    const pageIndex = index + 1;
    const output = execFileSync('gh', [
      'api',
      `repos/${repo}/actions/runs/${runId}/jobs?per_page=${pageSize}&page=${pageIndex}`,
    ]);
    return parseJson(output);
  });
}

function mergeJobPages(pages) {
  const normalizedPages = pages.flatMap(normalizePage);
  const jobs = normalizedPages.flatMap(page => (Array.isArray(page.jobs) ? page.jobs : []));
  const expectedTotal = normalizedPages[0]?.total_count ?? 0;
  const failedJobs = jobs.filter(job => job?.conclusion === 'failure').length;

  return {
    expectedTotal,
    totalJobs: jobs.length,
    failedJobs,
    countsMatch: expectedTotal === jobs.length,
    jobs,
  };
}

function normalizePage(page) {
  if (!page || typeof page !== 'object') {
    return [];
  }

  return [page];
}

function parseJson(raw) {
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Failed to parse gh api JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function writeJson(writeFileSync, filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf-8');
}

function defaultExecFileSync(command, args, options = {}) {
  return nodeExecFileSync(command, args, {
    cwd: options.cwd,
    encoding: options.encoding ?? 'utf-8',
    maxBuffer: 10 * 1024 * 1024,
  });
}

export async function main(argv = process.argv.slice(2), runtime = {}) {
  if (argv.length < 1 || argv.length > 2) {
    throw new Error('Usage: node .claude/skills/peach-check/peach-run-jobs.js <run-id> [output-dir]');
  }

  const [runId, outputDir] = argv;
  await collectRunJobs(
    {
      runId,
      outputDir,
    },
    runtime,
  );
}

const entrypoint = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === entrypoint) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
