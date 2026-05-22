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
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const DEFAULT_HOST = 'http://localhost:9000';
const DEFAULT_PAGE_SIZE = 500;
const DEFAULT_CE_POLL_INTERVAL_MS = 2000;
const DEFAULT_CE_TIMEOUT_MS = 10 * 60 * 1000;
const MAX_ISSUE_SEARCH_RESULTS = 10_000;
const MIN_CLI_ARGS = 2;
const MAX_CLI_ARGS = 3;
const ISSUE_SEARCH_PARTITIONS = [
  { facet: 'rules', parameter: 'rules' },
  { facet: 'severities', parameter: 'severities' },
  { facet: 'types', parameter: 'types' },
];
const USAGE =
  'Usage: node .claude/skills/peach-local-scan/fetch-local-issues.js <project-key> <output-path> [report-task-path]';

export async function fetchLocalIssues(options, runtime = {}) {
  const projectKey = readRequiredOption(options.projectKey, 'projectKey is required');
  const outputPath = readRequiredOption(options.outputPath, 'outputPath is required');
  const reportTaskPath = readOptionalOption(options.reportTaskPath);
  const host = normalizeHost(options.host ?? DEFAULT_HOST);
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const cePollIntervalMs = options.cePollIntervalMs ?? DEFAULT_CE_POLL_INTERVAL_MS;
  const ceTimeoutMs = options.ceTimeoutMs ?? DEFAULT_CE_TIMEOUT_MS;
  const tokenFile =
    options.tokenFile ??
    path.join(resolveHomedir(runtime), '.vibe-bot-credentials/.sonarqube/token');
  const fetchImpl = runtime.fetch ?? globalThis.fetch;
  const mkdirSync = runtime.mkdirSync ?? fs.mkdirSync;
  const readdirSync = runtime.readdirSync ?? fs.readdirSync;
  const readFileSync = runtime.readFileSync ?? fs.readFileSync;
  const sleepImpl = runtime.sleep ?? sleep;
  const writeFileSync = runtime.writeFileSync ?? fs.writeFileSync;
  const log = runtime.log ?? console.log;
  const workspaceRoot = reportTaskPath ? resolveWorkspaceRoot(reportTaskPath) : undefined;

  if (typeof fetchImpl !== 'function') {
    throw new TypeError('fetch implementation is required');
  }

  const token = readToken(readFileSync, tokenFile);
  const authorization = `Basic ${Buffer.from(token + ':').toString('base64')}`;

  if (reportTaskPath) {
    await waitForCeCompletion({
      host,
      authorization,
      reportTaskPath,
      fetchImpl,
      readFileSync,
      sleepImpl,
      log,
      pollIntervalMs: cePollIntervalMs,
      timeoutMs: ceTimeoutMs,
    });
  }

  const stableIssues = (
    await fetchIssuePartition(
      {
        authorization,
        fetchImpl,
        host,
        pageSize,
        readdirSync,
        workspaceRoot,
      },
      {
        projects: projectKey,
        resolved: 'false',
      },
    )
  ).toSorted(compareIssues);
  const artifact = {
    projectKey,
    total: stableIssues.length,
    issues: stableIssues,
  };

  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf-8');
  log(`Fetched ${stableIssues.length} raised issues for ${projectKey} into ${outputPath}`);

  return artifact;
}

async function fetchIssuePartition(runtime, filters) {
  const { authorization, fetchImpl, host, pageSize } = runtime;
  const firstPage = await fetchIssuesSearchPage({
    authorization,
    fetchImpl,
    filters,
    host,
    page: 1,
    pageSize,
  });
  const { pageIssues, total } = parseIssueSearchPayload(firstPage);

  if (total > MAX_ISSUE_SEARCH_RESULTS) {
    const partitionFilters = await buildPartitionFilters(runtime, filters, total);
    const partitionedIssues = [];

    for (const nextFilters of partitionFilters) {
      partitionedIssues.push(...(await fetchIssuePartition(runtime, nextFilters)));
    }

    return partitionedIssues;
  }

  const issues = pageIssues.filter(isRaisedIssue).map(projectIssue);
  let rawIssueCount = pageIssues.length;
  let page = 2;

  while (rawIssueCount < total) {
    const payload = await fetchIssuesSearchPage({
      authorization,
      fetchImpl,
      filters,
      host,
      page,
      pageSize,
    });
    const nextPageIssues = parseIssueSearchPayload(payload).pageIssues;
    rawIssueCount += nextPageIssues.length;
    issues.push(...nextPageIssues.filter(isRaisedIssue).map(projectIssue));
    page += 1;
  }

  return issues;
}

async function buildPartitionFilters(runtime, filters, total) {
  for (const partition of ISSUE_SEARCH_PARTITIONS) {
    if (filters[partition.parameter]) {
      continue;
    }

    const payload = await fetchIssuesSearchPage({
      authorization: runtime.authorization,
      fetchImpl: runtime.fetchImpl,
      filters,
      host: runtime.host,
      page: 1,
      pageSize: 1,
      facets: [partition.facet],
    });
    const partitionValues = readFacetValues(payload, partition.facet).filter(
      value =>
        typeof value?.val === 'string' &&
        value.val.length > 0 &&
        Number.isInteger(value.count) &&
        value.count > 0,
    );
    const partitionTotal = partitionValues.reduce((count, value) => count + value.count, 0);

    if (partitionValues.length <= 1 || partitionTotal !== total) {
      continue;
    }

    return partitionValues.map(value => ({
      ...filters,
      [partition.parameter]: value.val,
    }));
  }

  const workspacePartitions = buildWorkspacePartitionFilters(runtime, filters);
  if (workspacePartitions.length > 0) {
    return workspacePartitions;
  }

  throw new Error(
    `Unable to fetch ${total} issues within SonarQube's ${MAX_ISSUE_SEARCH_RESULTS}-result window for ${describeFilters(filters)}`,
  );
}

function buildWorkspacePartitionFilters(runtime, filters) {
  const { readdirSync, workspaceRoot } = runtime;

  if (!workspaceRoot || filters.files || typeof readdirSync !== 'function') {
    return [];
  }

  const scopeDirectory = filters.directories;
  const scopeRoot = scopeDirectory ? path.join(workspaceRoot, scopeDirectory) : workspaceRoot;
  let entries;

  try {
    entries = readdirSync(scopeRoot, { withFileTypes: true });
  } catch {
    return [];
  }

  return entries
    .filter(entry => entry.name !== '.scannerwork' && (entry.isDirectory() || entry.isFile()))
    .toSorted((left, right) => left.name.localeCompare(right.name))
    .map(entry => {
      const relativePath = scopeDirectory
        ? path.posix.join(scopeDirectory, entry.name)
        : entry.name;

      if (entry.isDirectory()) {
        return {
          ...filters,
          directories: relativePath,
        };
      }

      const nextFilters = {
        ...filters,
        files: relativePath,
      };
      delete nextFilters.directories;
      return nextFilters;
    });
}

async function fetchIssuesSearchPage(options) {
  const { authorization, fetchImpl, filters, facets = [], host, page, pageSize } = options;
  const pageUrl = new URL('/api/issues/search', host);

  for (const [key, value] of Object.entries(filters)) {
    if (typeof value === 'string' && value.length > 0) {
      pageUrl.searchParams.set(key, value);
    }
  }

  if (facets.length > 0) {
    pageUrl.searchParams.set('facets', facets.join(','));
  }

  pageUrl.searchParams.set('p', String(page));
  pageUrl.searchParams.set('ps', String(pageSize));

  const response = await fetchImpl(pageUrl, {
    headers: {
      Accept: 'application/json',
      Authorization: authorization,
    },
  });

  return parseJsonResponse(response, pageUrl);
}

function parseIssueSearchPayload(payload) {
  const pageIssues = Array.isArray(payload?.issues) ? payload.issues : [];

  return {
    pageIssues,
    total: Number.isInteger(payload?.total) ? payload.total : pageIssues.length,
  };
}

function readFacetValues(payload, property) {
  return payload?.facets?.find(facet => facet?.property === property)?.values ?? [];
}

function describeFilters(filters) {
  return Object.entries(filters)
    .map(([key, value]) => `${key}=${value}`)
    .join(', ');
}

function readRequiredOption(value, message) {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }

  throw new Error(message);
}

function readOptionalOption(value) {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function resolveHomedir(runtime) {
  return typeof runtime.homedir === 'function' ? runtime.homedir() : os.homedir();
}

function normalizeHost(host) {
  return host.endsWith('/') ? host.slice(0, -1) : host;
}

function resolveWorkspaceRoot(reportTaskPath) {
  return path.dirname(path.dirname(reportTaskPath));
}

function readToken(readFileSync, tokenFile) {
  const token = readFileSync(tokenFile, 'utf-8').trim();
  if (token.length === 0) {
    throw new Error(`SonarQube token file is empty: ${tokenFile}`);
  }
  return token;
}

async function parseJsonResponse(response, url) {
  if (!response?.ok) {
    const status = response?.status ?? 'unknown';
    throw new Error(`Failed to fetch ${url.toString()}: HTTP ${status}`);
  }

  try {
    return await response.json();
  } catch (error) {
    throw new Error(
      `Failed to parse JSON from ${url.toString()}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

async function waitForCeCompletion(options) {
  const {
    host,
    authorization,
    reportTaskPath,
    fetchImpl,
    readFileSync,
    sleepImpl,
    log,
    pollIntervalMs,
    timeoutMs,
  } = options;

  const reportTask = parseReportTask(readFileSync(reportTaskPath, 'utf-8'), reportTaskPath);
  const ceTaskUrl = buildCeTaskUrl(reportTask, host);
  const deadline = Date.now() + timeoutMs;
  let previousStatus;

  while (true) {
    const response = await fetchImpl(ceTaskUrl, {
      headers: {
        Accept: 'application/json',
        Authorization: authorization,
      },
    });
    const payload = await parseJsonResponse(response, ceTaskUrl);
    const task = payload?.task;

    if (!task || typeof task !== 'object') {
      throw new Error(`Unexpected CE task payload from ${ceTaskUrl.toString()}`);
    }

    const status = String(task.status ?? 'UNKNOWN');
    if (status !== previousStatus) {
      log(`CE task ${task.id ?? reportTask.ceTaskId} status: ${status}`);
      previousStatus = status;
    }

    if (status === 'SUCCESS') {
      return task;
    }

    if (status === 'FAILED' || status === 'CANCELED') {
      throw new Error(`CE task ${task.id ?? reportTask.ceTaskId} finished with status ${status}`);
    }

    if (Date.now() >= deadline) {
      throw new Error(
        `Timed out waiting for CE task ${task.id ?? reportTask.ceTaskId} after ${timeoutMs}ms`,
      );
    }

    await sleepImpl(pollIntervalMs);
  }
}

function parseReportTask(text, reportTaskPath) {
  const entries = Object.fromEntries(
    text
      .split(/\r?\n/)
      .filter(Boolean)
      .map(line => {
        const separator = line.indexOf('=');
        if (separator < 0) {
          return [line, ''];
        }
        return [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );

  const ceTaskId = entries.ceTaskId?.trim();
  if (!ceTaskId) {
    throw new Error(`ceTaskId not found in ${reportTaskPath}`);
  }

  return {
    ceTaskId,
    ceTaskUrl: entries.ceTaskUrl?.trim(),
  };
}

function buildCeTaskUrl(reportTask, host) {
  if (reportTask.ceTaskUrl) {
    return new URL(reportTask.ceTaskUrl);
  }

  const url = new URL('/api/ce/task', host);
  url.searchParams.set('id', reportTask.ceTaskId);
  return url;
}

function isRaisedIssue(issue) {
  if (!issue || typeof issue !== 'object') {
    return false;
  }

  return issue.status !== 'RESOLVED' && issue.status !== 'CLOSED' && issue.resolution == null;
}

function projectIssue(issue) {
  return {
    key: issue.key,
    rule: issue.rule,
    severity: issue.severity,
    component: issue.component,
    project: issue.project,
    line: issue.line,
    message: issue.message,
    type: issue.type,
    status: issue.status,
  };
}

function compareIssues(left, right) {
  return (
    compareStrings(left.component, right.component) ||
    compareNumbers(left.line, right.line) ||
    compareStrings(left.rule, right.rule) ||
    compareStrings(left.message, right.message) ||
    compareStrings(left.key, right.key)
  );
}

function compareStrings(left, right) {
  return String(left ?? '').localeCompare(String(right ?? ''));
}

function compareNumbers(left, right) {
  return normalizeNumber(left) - normalizeNumber(right);
}

function normalizeNumber(value) {
  return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function main(argv = process.argv.slice(2), runtime = {}) {
  const log = runtime.log ?? console.log;

  if (argv.includes('--help') || argv.includes('-h')) {
    log(USAGE);
    return;
  }

  if (argv.length !== MIN_CLI_ARGS && argv.length !== MAX_CLI_ARGS) {
    throw new Error(USAGE);
  }

  const [projectKey, outputPath, reportTaskPath] = argv;
  await fetchLocalIssues(
    {
      projectKey,
      outputPath,
      reportTaskPath,
    },
    runtime,
  );
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
