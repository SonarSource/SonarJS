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

const DEFAULT_METRIC = 'violations';
const DEFAULT_BASELINE_WINDOW = 5;
const DEFAULT_THRESHOLD_PCT = 5;
const DEFAULT_THRESHOLD_ABS = 20;
const DEFAULT_CONCURRENCY = 8;
const DEFAULT_HISTORY_PAGE_SIZE = 100;
const DEFAULT_RETRY_ATTEMPTS = 3;
const RETRYABLE_STATUS_CODES = new Set([429, 502, 503]);
const WORKFLOW_ONLY_JOBS = new Set(['prepare-project-matrix', 'diff-validation-aggregated']);

export async function runIssueHistory(options, runtime = {}) {
  const readFileSync = runtime.readFileSync ?? fs.readFileSync;
  const writeFileSync = runtime.writeFileSync ?? fs.writeFileSync;
  const existsSync = runtime.existsSync ?? fs.existsSync;
  const execFileSync = runtime.execFileSync ?? defaultExecFileSync;
  const apiToken = options.apiToken ?? process.env.PEACH_KEY;

  if (!apiToken) {
    throw new Error('PEACH_KEY is required');
  }

  const metric = DEFAULT_METRIC;
  const baselineWindow = options.baselineWindow ?? readNumberEnv('PEACH_ISSUE_BASELINE_WINDOW', DEFAULT_BASELINE_WINDOW);
  const thresholdPct = options.thresholdPct ?? readNumberEnv('PEACH_ISSUE_DROP_THRESHOLD_PCT', DEFAULT_THRESHOLD_PCT);
  const thresholdAbs = options.thresholdAbs ?? readNumberEnv('PEACH_ISSUE_DROP_MIN_ABS', DEFAULT_THRESHOLD_ABS);
  const concurrency = options.concurrency ?? readIntegerEnv('PEACH_ISSUE_HISTORY_CONCURRENCY', DEFAULT_CONCURRENCY);

  const jobsJsonData = readJobsJsonData(options.jobsJsonPath, readFileSync);
  const projectSources = new Map();
  const unresolvedRows = collectProjectsFromJobsJson(jobsJsonData, options.peacheeRoot, {
    projectSources,
    readFileSync,
    existsSync,
    execFileSync,
    metric,
    baselineWindow,
  });
  const freshnessWindow = resolveFreshnessWindow(jobsJsonData);

  const rows = await mapWithConcurrencyLimit(
    Array.from(projectSources.entries()),
    concurrency,
    async ([projectKey, sourceJobName]) =>
      evaluateProjectHistory(
        {
          apiToken,
          projectKey,
          sourceJobName,
          metric,
          baselineWindow,
          thresholdPct,
          thresholdAbs,
          freshnessWindow,
        },
        runtime,
      ),
  );

  const combinedRows = [...rows, ...unresolvedRows].sort((left, right) =>
    getRowIdentifier(left).localeCompare(getRowIdentifier(right)),
  );
  const report = {
    metric,
    baseline_kind: 'median',
    baseline_window: baselineWindow,
    threshold_pct: thresholdPct,
    threshold_abs: thresholdAbs,
    concurrency,
    analysis_after: freshnessWindow.analysisAfter,
    analysis_before: freshnessWindow.analysisBefore,
    rows: combinedRows.map(toJsonRow),
    summary: summarizeRows(combinedRows),
  };

  writeFileSync(options.outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf-8');
  return report;
}

function readJobsJsonData(jobsJsonPath, readFileSync) {
  const payload = JSON.parse(readFileSync(jobsJsonPath, 'utf-8'));
  const jobs = extractJobs(payload);
  const firstJob = jobs.find(job => readStringField(job.raw, ['headSha', 'head_sha']));

  return {
    jobs,
    metadata: {
      headSha:
        readStringField(payload, ['headSha', 'head_sha']) ??
        (firstJob ? readStringField(firstJob.raw, ['headSha', 'head_sha']) : undefined),
      createdAt: readStringField(payload, ['createdAt', 'created_at']),
      startedAt: readStringField(payload, ['startedAt', 'started_at']),
      updatedAt: readStringField(payload, ['updatedAt', 'updated_at']),
    },
  };
}

function extractJobs(payload) {
  if (Array.isArray(payload)) {
    return payload.flatMap(extractJobs);
  }

  if (!payload || typeof payload !== 'object') {
    return [];
  }

  if (Array.isArray(payload.jobs)) {
    return payload.jobs.flatMap(extractJobs);
  }

  const name = readStringField(payload, ['name']);
  if (!name) {
    return [];
  }

  return [
    {
      raw: payload,
      name,
      conclusion: readStringField(payload, ['conclusion']),
      startedAt: readStringField(payload, ['startedAt', 'started_at']),
      completedAt: readStringField(payload, ['completedAt', 'completed_at']),
    },
  ];
}

function collectProjectsFromJobsJson(jobsJsonData, peacheeRoot, options) {
  const unresolvedRows = new Map();
  const headSha = jobsJsonData.metadata.headSha;

  if (headSha) {
    ensureCommitAvailable(peacheeRoot, headSha, options.execFileSync);
  }

  for (const job of jobsJsonData.jobs) {
    if (WORKFLOW_ONLY_JOBS.has(job.name) || job.conclusion !== 'success') {
      continue;
    }

    const propertiesContent = readProjectPropertiesForJob(peacheeRoot, job.name, headSha, {
      readFileSync: options.readFileSync,
      existsSync: options.existsSync,
      execFileSync: options.execFileSync,
    });

    if (!propertiesContent) {
      unresolvedRows.set(
        job.name,
        createUnresolvedRow(
          job.name,
          headSha ? `Missing sonar-project.properties at ${headSha}` : 'Missing sonar-project.properties',
          options.metric,
          options.baselineWindow,
        ),
      );
      continue;
    }

    const projectKey = extractProjectKeyFromProperties(propertiesContent);
    if (!projectKey) {
      unresolvedRows.set(
        job.name,
        createUnresolvedRow(job.name, 'Missing sonar.projectKey', options.metric, options.baselineWindow),
      );
      continue;
    }

    if (!options.projectSources.has(projectKey) || options.projectSources.get(projectKey) === undefined) {
      options.projectSources.set(projectKey, job.name);
    }
  }

  return Array.from(unresolvedRows.values());
}

function resolveFreshnessWindow(jobsJsonData) {
  const referenceTimestamp = firstDefinedNumber(
    parseTimestamp(jobsJsonData.metadata.updatedAt),
    latestTimestamp(jobsJsonData.jobs.map(job => job.completedAt)),
    parseTimestamp(jobsJsonData.metadata.startedAt),
    latestTimestamp(jobsJsonData.jobs.map(job => job.startedAt)),
    parseTimestamp(jobsJsonData.metadata.createdAt),
  );

  if (referenceTimestamp === undefined) {
    return {};
  }

  const previousDayStart = new Date(referenceTimestamp);
  previousDayStart.setUTCHours(0, 0, 0, 0);
  previousDayStart.setUTCDate(previousDayStart.getUTCDate() - 1);

  return {
    analysisAfter: formatIsoTimestamp(previousDayStart.getTime()),
    analysisBefore: formatIsoTimestamp(referenceTimestamp),
  };
}

function ensureCommitAvailable(peacheeRoot, headSha, execFileSync) {
  try {
    execFileSync('git', ['rev-parse', '--verify', '--quiet', `${headSha}^{commit}`], {
      cwd: peacheeRoot,
      encoding: 'utf-8',
    });
  } catch {
    throw new Error(`jobs-json headSha ${headSha} is not available in ${peacheeRoot}`);
  }
}

function readProjectPropertiesForJob(peacheeRoot, jobName, headSha, runtime) {
  const relativePath = path.posix.join(jobName, 'sonar-project.properties');

  if (headSha) {
    try {
      return runtime.execFileSync('git', ['show', `${headSha}:${relativePath}`], {
        cwd: peacheeRoot,
        encoding: 'utf-8',
      });
    } catch {
      return undefined;
    }
  }

  const propertiesPath = path.join(peacheeRoot, jobName, 'sonar-project.properties');
  if (!runtime.existsSync(propertiesPath)) {
    return undefined;
  }

  return runtime.readFileSync(propertiesPath, 'utf-8');
}

function extractProjectKeyFromProperties(content) {
  const match = /^\s*sonar\.projectKey\s*=\s*(.+)\s*$/m.exec(content);
  return match?.[1]?.trim();
}

async function evaluateProjectHistory(options, runtime) {
  try {
    const history = await fetchMeasureHistoryWithRetry(
      options.projectKey,
      options.metric,
      options.apiToken,
      options.baselineWindow + 1,
      runtime,
    );
    const sortedHistory = toDatedHistory(history);

    if (sortedHistory.length === 0) {
      return createErrorRow(options, 'No measure history found');
    }

    const parsedWindow = parseFreshnessWindow(options.freshnessWindow);
    const currentIndex = findCurrentHistoryIndex(sortedHistory, parsedWindow);

    if (currentIndex === -1) {
      const latest = sortedHistory[sortedHistory.length - 1];
      const previousValues = sortedHistory.slice(0, -1).map(entry => entry.value);
      const historyTruncated = previousValues.length > 0 && previousValues.length < options.baselineWindow;

      return {
        status: 'STALE',
        projectKey: options.projectKey,
        sourceJobName: options.sourceJobName,
        metric: options.metric,
        analysisDate: latest.date,
        currentValue: latest.value,
        baselineKind: 'median',
        baselineWindow: options.baselineWindow,
        historyPoints: sortedHistory.length,
        historyTruncated,
        message: 'Latest analysis is outside the freshness window',
      };
    }

    const current = sortedHistory[currentIndex];
    const previousValues = sortedHistory.slice(0, currentIndex).map(entry => entry.value);
    const baselineSample = previousValues.slice(-options.baselineWindow);
    const baselineValue = baselineSample.length > 0 ? computeMedian(baselineSample) : undefined;
    const historyTruncated = previousValues.length > 0 && previousValues.length < options.baselineWindow;

    if (previousValues.length < options.baselineWindow) {
      return {
        status: 'INSUFFICIENT_HISTORY',
        projectKey: options.projectKey,
        sourceJobName: options.sourceJobName,
        metric: options.metric,
        analysisDate: current.date,
        currentValue: current.value,
        baselineValue,
        baselineKind: 'median',
        baselineWindow: options.baselineWindow,
        historyPoints: currentIndex + 1,
        historyTruncated,
      };
    }

    const dropAbs = (baselineValue ?? 0) - current.value;
    const dropPct = baselineValue && baselineValue > 0 ? (dropAbs / baselineValue) * 100 : 0;
    const clearsPctThreshold = dropPct >= options.thresholdPct;
    const clearsAbsNoiseFloor = dropAbs >= options.thresholdAbs;
    // The absolute threshold is a noise floor, not an alternative trigger.
    const status =
      (baselineValue ?? 0) > 0 && clearsPctThreshold && clearsAbsNoiseFloor ? 'DROP' : 'OK';

    return {
      status,
      projectKey: options.projectKey,
      sourceJobName: options.sourceJobName,
      metric: options.metric,
      analysisDate: current.date,
      currentValue: current.value,
      baselineValue,
      baselineKind: 'median',
      baselineWindow: options.baselineWindow,
      historyPoints: currentIndex + 1,
      historyTruncated: false,
      dropAbs,
      dropPct,
    };
  } catch (error) {
    return createErrorRow(options, error instanceof Error ? error.message : String(error));
  }
}

async function fetchMeasureHistoryWithRetry(projectKey, metric, apiToken, requiredHistoryPoints, runtime) {
  const fetchMeasureHistory = runtime.fetchMeasureHistory ?? defaultFetchMeasureHistory;
  const sleep = runtime.sleep ?? (ms => new Promise(resolve => setTimeout(resolve, ms)));
  const random = runtime.random ?? Math.random;

  for (let attempt = 0; attempt < DEFAULT_RETRY_ATTEMPTS; attempt += 1) {
    try {
      return await fetchMeasureHistory(projectKey, metric, apiToken, requiredHistoryPoints);
    } catch (error) {
      const statusCode = getStatusCode(error);
      const isRetryable = statusCode !== undefined && RETRYABLE_STATUS_CODES.has(statusCode);
      if (!isRetryable || attempt === DEFAULT_RETRY_ATTEMPTS - 1) {
        throw error;
      }

      const delayMs = 100 * 2 ** attempt + Math.floor(random() * 50);
      await sleep(delayMs);
    }
  }

  throw new Error(`Failed to fetch measure history for ${projectKey}`);
}

async function defaultFetchMeasureHistory(projectKey, metric, apiToken, requiredHistoryPoints = DEFAULT_BASELINE_WINDOW + 1) {
  const pageSize = Math.max(DEFAULT_HISTORY_PAGE_SIZE, requiredHistoryPoints);
  const firstPage = await fetchMeasureHistoryPage(projectKey, metric, apiToken, 1, pageSize);

  if (firstPage.total <= firstPage.history.length) {
    return firstPage.history;
  }

  const lastPageIndex = Math.ceil(firstPage.total / pageSize);
  const history = [...firstPage.history];

  // Freshness-window matching can target an older analysis when newer scans exist, so the
  // caller needs the full ordered series rather than only the tail pages.
  // Any later-page failure bubbles to fetchMeasureHistoryWithRetry(), which retries the
  // full pagination pass so every page gets identical retry handling.
  for (let pageIndex = 2; pageIndex <= lastPageIndex; pageIndex += 1) {
    const page = await fetchMeasureHistoryPage(projectKey, metric, apiToken, pageIndex, pageSize);
    history.push(...page.history);
  }

  return history;
}

async function fetchMeasureHistoryPage(projectKey, metric, apiToken, pageIndex, pageSize) {
  const params = new URLSearchParams({
    component: projectKey,
    metrics: metric,
    p: String(pageIndex),
    ps: String(pageSize),
  });
  const response = await fetchPeachJson(`/api/measures/search_history?${params.toString()}`, apiToken);
  const measure = response.measures?.find(entry => entry.metric === metric) ?? response.measures?.[0];

  return {
    total: response.paging?.total ?? measure?.history?.length ?? 0,
    history: (measure?.history ?? [])
      .map(entry => ({
        date: entry.date ?? '',
        value: Number(entry.value),
      }))
      .filter(entry => entry.date.length > 0 && Number.isFinite(entry.value)),
  };
}

async function fetchPeachJson(pathname, apiToken) {
  const response = await fetch(`https://peach.sonarsource.com${pathname}`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${apiToken}:`).toString('base64')}`,
      Accept: 'application/json',
    },
    redirect: 'manual',
  });

  if (response.status === 301 || response.status === 302) {
    throw createRequestError(`Redirect to: ${response.headers.get('location')}. Authentication may have failed.`, response.status);
  }

  if (response.status === 401) {
    throw createRequestError('Authentication failed. Check your PEACH_KEY token.', response.status);
  }

  if (response.status === 403) {
    throw createRequestError('Access denied. You may not have permission to access this resource.', response.status);
  }

  if (response.status >= 400) {
    throw createRequestError(`API request failed with status ${response.status}: ${await response.text()}`, response.status);
  }

  try {
    return await response.json();
  } catch {
    throw createRequestError('Failed to parse JSON response from Peach.');
  }
}

function createRequestError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function toDatedHistory(history) {
  return history
    .flatMap(entry => {
      const timestamp = parseTimestamp(entry.date);
      return timestamp === undefined ? [] : [{ ...entry, timestamp }];
    })
    .sort((left, right) => left.timestamp - right.timestamp);
}

function parseFreshnessWindow(window) {
  const analysisAfterTimestamp = parseTimestamp(window.analysisAfter);
  const analysisBeforeTimestamp = parseTimestamp(window.analysisBefore);

  if (
    analysisAfterTimestamp !== undefined &&
    analysisBeforeTimestamp !== undefined &&
    analysisAfterTimestamp > analysisBeforeTimestamp
  ) {
    throw new Error('analysisAfter must be earlier than or equal to analysisBefore');
  }

  return {
    analysisAfterTimestamp,
    analysisBeforeTimestamp,
  };
}

function findCurrentHistoryIndex(history, window) {
  if (window.analysisAfterTimestamp === undefined && window.analysisBeforeTimestamp === undefined) {
    return history.length - 1;
  }

  for (let index = history.length - 1; index >= 0; index -= 1) {
    const point = history[index];
    if (
      (window.analysisAfterTimestamp === undefined || point.timestamp >= window.analysisAfterTimestamp) &&
      (window.analysisBeforeTimestamp === undefined || point.timestamp <= window.analysisBeforeTimestamp)
    ) {
      return index;
    }
  }

  return -1;
}

function computeMedian(values) {
  const sortedValues = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sortedValues.length / 2);

  if (sortedValues.length % 2 === 1) {
    return sortedValues[middle];
  }

  return (sortedValues[middle - 1] + sortedValues[middle]) / 2;
}

async function mapWithConcurrencyLimit(items, limit, mapper) {
  if (items.length === 0) {
    return [];
  }

  const workerCount = Math.max(1, Math.min(limit, items.length));
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      if (currentIndex >= items.length) {
        return;
      }

      results[currentIndex] = await mapper(items[currentIndex]);
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

function createUnresolvedRow(sourceJobName, message, metric, baselineWindow) {
  return {
    status: 'UNRESOLVED_PROJECT',
    sourceJobName,
    metric,
    baselineKind: 'median',
    baselineWindow,
    historyPoints: 0,
    historyTruncated: false,
    message,
  };
}

function createErrorRow(options, message) {
  return {
    status: 'ERROR',
    projectKey: options.projectKey,
    sourceJobName: options.sourceJobName,
    metric: options.metric,
    baselineKind: 'median',
    baselineWindow: options.baselineWindow,
    historyPoints: 0,
    historyTruncated: false,
    message,
  };
}

function summarizeRows(rows) {
  return rows.reduce((summary, row) => {
    summary[row.status] = (summary[row.status] ?? 0) + 1;
    return summary;
  }, {});
}

function toJsonRow(row) {
  return {
    project_key: row.projectKey,
    metric: row.metric,
    analysis_date: row.analysisDate,
    current_value: row.currentValue,
    baseline_value: row.baselineValue,
    baseline_kind: row.baselineKind,
    baseline_window: row.baselineWindow,
    history_points: row.historyPoints,
    history_truncated: row.historyTruncated,
    drop_abs: row.dropAbs,
    drop_pct: row.dropPct,
    status: row.status,
    source_job_name: row.sourceJobName,
    message: row.message,
  };
}

function getRowIdentifier(row) {
  return row.projectKey ?? row.sourceJobName ?? '';
}

function readStringField(value, keys) {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  for (const key of keys) {
    if (typeof value[key] === 'string') {
      return value[key];
    }
  }

  return undefined;
}

function parseTimestamp(value) {
  if (!value) {
    return undefined;
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? undefined : timestamp;
}

function latestTimestamp(values) {
  return values.reduce((latest, value) => {
    const timestamp = parseTimestamp(value);
    if (timestamp === undefined) {
      return latest;
    }

    return latest === undefined || timestamp > latest ? timestamp : latest;
  }, undefined);
}

function formatIsoTimestamp(timestamp) {
  return new Date(timestamp).toISOString().replace('.000Z', 'Z');
}

function firstDefinedNumber(...values) {
  return values.find(value => value !== undefined);
}

function getStatusCode(error) {
  if (error && typeof error === 'object' && 'statusCode' in error && typeof error.statusCode === 'number') {
    return error.statusCode;
  }

  return undefined;
}

function readNumberEnv(name, fallback) {
  const rawValue = process.env[name];
  if (rawValue === undefined || rawValue === '') {
    return fallback;
  }

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative number`);
  }
  return parsed;
}

function readIntegerEnv(name, fallback) {
  const rawValue = process.env[name];
  if (rawValue === undefined || rawValue === '') {
    return fallback;
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

function defaultExecFileSync(command, args, options = {}) {
  return nodeExecFileSync(command, args, {
    cwd: options.cwd,
    encoding: options.encoding ?? 'utf-8',
    maxBuffer: 10 * 1024 * 1024,
  });
}

export async function main(argv = process.argv.slice(2), runtime = {}) {
  if (argv.length !== 3) {
    throw new Error(
      'Usage: node .claude/skills/peach-check/peach-issue-history.js <project-jobs.json> <peachee-root> <output.json>',
    );
  }

  const [jobsJsonPath, peacheeRoot, outputPath] = argv;
  await runIssueHistory(
    {
      jobsJsonPath,
      peacheeRoot,
      outputPath,
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
