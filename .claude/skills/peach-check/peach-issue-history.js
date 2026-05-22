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
import {
  parseProjectProperties,
  readProjectPropertiesForJob,
} from './peach-project-properties.js';

const DEFAULT_METRIC = 'sonarjs_issue_count';
const DEFAULT_BASELINE_WINDOW = 5;
const DEFAULT_THRESHOLD_PCT = 5;
const DEFAULT_THRESHOLD_ABS = 20;
const DEFAULT_CONCURRENCY = 8;
const DEFAULT_ANALYSES_PAGE_SIZE = 100;
const DEFAULT_ISSUES_PAGE_SIZE = 500;
const DEFAULT_COMPONENTS_PAGE_SIZE = 500;
const DEFAULT_ISSUES_RESULT_WINDOW = 10000;
const DEFAULT_RETRY_ATTEMPTS = 3;
const DEFAULT_COMPONENT_FALLBACK_CONCURRENCY = 8;
const RETRYABLE_STATUS_CODES = new Set([429, 502, 503]);
const WORKFLOW_ONLY_JOBS = new Set(['prepare-project-matrix', 'diff-validation-aggregated']);
export const SUPPORTED_LANGUAGES = Object.freeze(['js', 'ts', 'css', 'web', 'yaml']);
const SUPPORTED_LANGUAGES_QUERY = SUPPORTED_LANGUAGES.join(',');

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
    async ([projectKey, projectSource]) =>
      evaluateProjectHistory(
        {
          apiToken,
          projectKey,
          sourceJobName: projectSource.sourceJobName,
          projectMetadata: projectSource.projectMetadata,
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
    languages: SUPPORTED_LANGUAGES,
    baseline_kind: 'median',
    baseline_window: baselineWindow,
    threshold_pct: thresholdPct,
    threshold_abs: thresholdAbs,
    concurrency,
    analysis_window_start: freshnessWindow.analysisWindowStart,
    analysis_window_end: freshnessWindow.analysisWindowEnd,
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

    const projectMetadata = parseProjectProperties(propertiesContent, job.name);
    const projectKey = projectMetadata.projectKey;
    if (!projectKey) {
      unresolvedRows.set(
        job.name,
        createUnresolvedRow(job.name, 'Missing sonar.projectKey', options.metric, options.baselineWindow),
      );
      continue;
    }

    if (!options.projectSources.has(projectKey) || options.projectSources.get(projectKey) === undefined) {
      options.projectSources.set(projectKey, {
        sourceJobName: job.name,
        projectMetadata,
      });
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
    analysisWindowStart: formatIsoTimestamp(previousDayStart.getTime()),
    analysisWindowEnd: formatIsoTimestamp(referenceTimestamp),
  };
}

function ensureCommitAvailable(peacheeRoot, headSha, execFileSync) {
  try {
    execFileSync('git', ['rev-parse', '--verify', '--quiet', `${headSha}^{commit}`], {
      cwd: peacheeRoot,
      encoding: 'utf-8',
    });
  } catch {
    throw new Error(
      `jobs-json headSha ${headSha} is not available in ${peacheeRoot}. Run: git -C ${peacheeRoot} fetch origin ${headSha}`,
    );
  }
}

async function evaluateProjectHistory(options, runtime) {
  try {
    const analyses = toDatedEntries(await fetchProjectAnalysesWithRetry(options.projectKey, options.apiToken, runtime));

    if (analyses.length === 0) {
      return createErrorRow(options, 'No project analyses found');
    }

    const parsedWindow = parseFreshnessWindow(options.freshnessWindow);
    const currentIndex = findCurrentHistoryIndex(analyses, parsedWindow);
    const latest = analyses[analyses.length - 1];
    const previousAnalysisCount = Math.max(0, analyses.length - 1);
    const historyTruncated = previousAnalysisCount > 0 && previousAnalysisCount < options.baselineWindow;

    if (currentIndex === -1) {
      const latestCounts = await fetchIssueCountsWithRetry(
        options.projectKey,
        [latest],
        options.apiToken,
        runtime,
      );

      return {
        status: 'STALE',
        projectKey: options.projectKey,
        sourceJobName: options.sourceJobName,
        projectMetadata: options.projectMetadata,
        metric: options.metric,
        analysisDate: latest.date,
        currentValue: latestCounts.get(latest.date),
        baselineKind: 'median',
        baselineWindow: options.baselineWindow,
        historyPoints: analyses.length,
        historyTruncated,
        message: 'Latest analysis is outside the freshness window',
      };
    }

    const current = analyses[currentIndex];
    const previousAnalyses = analyses.slice(0, currentIndex);
    const baselineAnalyses = previousAnalyses.slice(-options.baselineWindow);
    const relevantAnalyses = [...baselineAnalyses, current];
    const countsByAnalysisDate = await fetchIssueCountsWithRetry(
      options.projectKey,
      relevantAnalyses,
      options.apiToken,
      runtime,
    );
    const currentValue = countsByAnalysisDate.get(current.date);

    if (currentValue === undefined) {
      throw new Error(`Missing issue count for analysis ${current.date}`);
    }

    const previousValues = baselineAnalyses.map(analysis => countsByAnalysisDate.get(analysis.date));
    if (previousValues.some(value => value === undefined)) {
      throw new Error(`Missing baseline issue counts for ${options.projectKey}`);
    }

    const baselineValue = previousValues.length > 0 ? computeMedian(previousValues) : undefined;
    const currentHistoryPoints = currentIndex + 1;
    const currentHistoryTruncated =
      previousAnalyses.length > 0 && previousAnalyses.length < options.baselineWindow;

    if (previousAnalyses.length < options.baselineWindow) {
      return {
        status: 'INSUFFICIENT_HISTORY',
        projectKey: options.projectKey,
        sourceJobName: options.sourceJobName,
        projectMetadata: options.projectMetadata,
        metric: options.metric,
        analysisDate: current.date,
        currentValue,
        baselineValue,
        baselineKind: 'median',
        baselineWindow: options.baselineWindow,
        historyPoints: currentHistoryPoints,
        historyTruncated: currentHistoryTruncated,
      };
    }

    const dropAbs = (baselineValue ?? 0) - currentValue;
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
      projectMetadata: options.projectMetadata,
      metric: options.metric,
      analysisDate: current.date,
      currentValue,
      baselineValue,
      baselineKind: 'median',
      baselineWindow: options.baselineWindow,
      historyPoints: currentHistoryPoints,
      historyTruncated: currentHistoryTruncated,
      dropAbs,
      dropPct,
    };
  } catch (error) {
    return createErrorRow(options, error instanceof Error ? error.message : String(error));
  }
}

async function fetchProjectAnalysesWithRetry(projectKey, apiToken, runtime) {
  const fetchProjectAnalyses = runtime.fetchProjectAnalyses ?? defaultFetchProjectAnalyses;
  return retryPeachRequest(() => fetchProjectAnalyses(projectKey, apiToken), runtime);
}

async function fetchIssueCountsWithRetry(projectKey, analyses, apiToken, runtime) {
  const fetchIssueCounts = runtime.fetchIssueCounts ?? defaultFetchIssueCounts;
  return retryPeachRequest(() => fetchIssueCounts(projectKey, analyses, apiToken), runtime);
}

async function retryPeachRequest(request, runtime) {
  const sleep = runtime.sleep ?? (ms => new Promise(resolve => setTimeout(resolve, ms)));
  const random = runtime.random ?? Math.random;

  for (let attempt = 0; attempt < DEFAULT_RETRY_ATTEMPTS; attempt += 1) {
    try {
      return await request();
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

  throw new Error('Peach request retry loop exhausted');
}

async function defaultFetchProjectAnalyses(projectKey, apiToken) {
  const analyses = [];

  for (let pageIndex = 1; ; pageIndex += 1) {
    const page = await fetchProjectAnalysesPage(projectKey, apiToken, pageIndex, DEFAULT_ANALYSES_PAGE_SIZE);
    analyses.push(
      ...(page.analyses ?? [])
        .map(entry => ({
          date: entry.date ?? '',
        }))
        .filter(entry => entry.date.length > 0),
    );

    const total = page.paging?.total ?? analyses.length;
    if (pageIndex * DEFAULT_ANALYSES_PAGE_SIZE >= total) {
      break;
    }
  }

  return analyses;
}

async function fetchProjectAnalysesPage(projectKey, apiToken, pageIndex, pageSize) {
  const params = new URLSearchParams({
    project: projectKey,
    p: String(pageIndex),
    ps: String(pageSize),
  });

  return fetchPeachJson(`/api/project_analyses/search?${params.toString()}`, apiToken);
}

async function defaultFetchIssueCounts(projectKey, analyses, apiToken) {
  const targetAnalyses = toDatedEntries(analyses);
  if (targetAnalyses.length === 0) {
    return new Map();
  }

  const oldestAnalysisTimestamp = targetAnalyses[0].timestamp;
  const latestAnalysisTimestamp = targetAnalyses[targetAnalyses.length - 1].timestamp;
  const createdBefore = formatExclusiveIsoTimestamp(latestAnalysisTimestamp);
  const openIssues = await fetchOpenIssues(projectKey, apiToken, createdBefore);
  const resolvedIssues = await fetchResolvedIssues(
    projectKey,
    apiToken,
    oldestAnalysisTimestamp,
    createdBefore,
  );
  const countsByAnalysisDate = new Map();
  const sortedOpenIssues = [...openIssues].sort(
    (left, right) => left.creationTimestamp - right.creationTimestamp,
  );
  let openIssueIndex = 0;

  for (const analysis of targetAnalyses) {
    while (
      openIssueIndex < sortedOpenIssues.length &&
      sortedOpenIssues[openIssueIndex].creationTimestamp <= analysis.timestamp
    ) {
      openIssueIndex += 1;
    }

    let count = openIssueIndex;
    for (const issue of resolvedIssues) {
      if (issue.creationTimestamp <= analysis.timestamp && issue.closeTimestamp > analysis.timestamp) {
        count += 1;
      }
    }

    countsByAnalysisDate.set(analysis.date, count);
  }

  return countsByAnalysisDate;
}

async function fetchOpenIssues(projectKey, apiToken, createdBefore) {
  return fetchIssuesForComponent(
    projectKey,
    apiToken,
    {
      resolved: 'false',
      createdBefore,
      s: 'CREATION_DATE',
      asc: 'true',
    },
    normalizeOpenIssues,
  );
}

async function fetchResolvedIssues(projectKey, apiToken, oldestAnalysisTimestamp, createdBefore) {
  return fetchIssuesForComponent(
    projectKey,
    apiToken,
    {
      resolved: 'true',
      createdBefore,
      s: 'CREATION_DATE',
      asc: 'true',
    },
    issues => normalizeResolvedIssues(issues, oldestAnalysisTimestamp),
  );
}

async function fetchIssuesForComponent(componentKey, apiToken, params, normalizePage) {
  const firstResponse = await fetchIssuesPage(apiToken, {
    components: componentKey,
    ...params,
    p: '1',
    ps: String(DEFAULT_ISSUES_PAGE_SIZE),
  });
  const total = firstResponse.paging?.total ?? (firstResponse.issues ?? []).length;

  if (total > DEFAULT_ISSUES_RESULT_WINDOW) {
    const splitRanges = splitIssueSearchByCreationDate(params, firstResponse.issues ?? []);
    if (splitRanges) {
      const [olderRangeParams, newerRangeParams] = splitRanges;
      const [olderIssues, newerIssues] = await Promise.all([
        fetchIssuesForComponent(componentKey, apiToken, olderRangeParams, normalizePage),
        fetchIssuesForComponent(componentKey, apiToken, newerRangeParams, normalizePage),
      ]);

      return [...olderIssues, ...newerIssues];
    }

    const { directories, files } = await fetchDirectChildComponents(componentKey, apiToken);
    if (directories.length === 0 && files.length === 0) {
      throw new Error(`Issue search exceeded ${DEFAULT_ISSUES_RESULT_WINDOW} results for leaf component ${componentKey}`);
    }

    const nestedIssues = await mapWithConcurrencyLimit(
      [...files, ...directories],
      DEFAULT_COMPONENT_FALLBACK_CONCURRENCY,
      component => fetchIssuesForComponent(component.key, apiToken, params, normalizePage),
    );

    return nestedIssues.flat();
  }

  const normalizedIssues = [...normalizePage(firstResponse.issues ?? [])];

  if (DEFAULT_ISSUES_PAGE_SIZE >= total) {
    return normalizedIssues;
  }

  for (let pageIndex = 2; ; pageIndex += 1) {
    const response = await fetchIssuesPage(apiToken, {
      components: componentKey,
      ...params,
      p: String(pageIndex),
      ps: String(DEFAULT_ISSUES_PAGE_SIZE),
    });
    normalizedIssues.push(...normalizePage(response.issues ?? []));

    if (pageIndex * DEFAULT_ISSUES_PAGE_SIZE >= total) {
      return normalizedIssues;
    }
  }
}

function splitIssueSearchByCreationDate(params, issues) {
  const createdBeforeTimestamp = parseTimestamp(params.createdBefore);
  const earliestIssueTimestamp = earliestCreationTimestamp(issues);
  if (createdBeforeTimestamp === undefined || earliestIssueTimestamp === undefined) {
    return undefined;
  }

  const createdAfterTimestamp = parseTimestamp(params.createdAfter);
  const lowerBoundTimestamp = Math.max(createdAfterTimestamp ?? earliestIssueTimestamp, earliestIssueTimestamp);
  const splitTimestamp = computeCreationDateSplitTimestamp(lowerBoundTimestamp, createdBeforeTimestamp);
  if (splitTimestamp === undefined) {
    return undefined;
  }

  const splitBoundary = formatPeachDateTime(splitTimestamp);
  return [
    {
      ...params,
      createdBefore: splitBoundary,
    },
    {
      ...params,
      createdAfter: splitBoundary,
    },
  ];
}

function earliestCreationTimestamp(issues) {
  return (issues ?? []).reduce((earliest, issue) => {
    const timestamp = parseTimestamp(issue.creationDate);
    if (timestamp === undefined) {
      return earliest;
    }

    return earliest === undefined || timestamp < earliest ? timestamp : earliest;
  }, undefined);
}

function computeCreationDateSplitTimestamp(lowerBoundTimestamp, upperBoundTimestamp) {
  const lowerBoundSecond = floorToSecond(lowerBoundTimestamp);
  const upperBoundSecond = floorToSecond(upperBoundTimestamp);

  if (upperBoundSecond - lowerBoundSecond < 2000) {
    return undefined;
  }

  const midpoint = lowerBoundSecond + Math.floor((upperBoundSecond - lowerBoundSecond) / 2);
  const splitTimestamp = roundUpToNextSecond(midpoint - 1);

  return splitTimestamp > lowerBoundSecond && splitTimestamp < upperBoundSecond ? splitTimestamp : undefined;
}

async function fetchDirectChildComponents(componentKey, apiToken) {
  const [directories, files] = await Promise.all([
    fetchChildComponents(componentKey, 'DIR', apiToken),
    fetchChildComponents(componentKey, 'FIL', apiToken),
  ]);

  return { directories, files };
}

async function fetchChildComponents(componentKey, qualifiers, apiToken) {
  const components = [];

  for (let pageIndex = 1; ; pageIndex += 1) {
    const response = await fetchComponentsTreePage(componentKey, qualifiers, apiToken, pageIndex);
    components.push(...(response.components ?? []));

    const total = response.paging?.total ?? components.length;
    if (pageIndex * DEFAULT_COMPONENTS_PAGE_SIZE >= total) {
      return components;
    }
  }
}

async function fetchComponentsTreePage(componentKey, qualifiers, apiToken, pageIndex) {
  const query = new URLSearchParams({
    component: componentKey,
    qualifiers,
    strategy: 'children',
    p: String(pageIndex),
    ps: String(DEFAULT_COMPONENTS_PAGE_SIZE),
  });

  return fetchPeachJson(`/api/components/tree?${query.toString()}`, apiToken);
}

async function fetchIssuesPage(apiToken, params) {
  const query = new URLSearchParams({
    languages: SUPPORTED_LANGUAGES_QUERY,
    ...params,
  });

  return fetchPeachJson(`/api/issues/search?${query.toString()}`, apiToken);
}

function normalizeOpenIssues(issues) {
  return (issues ?? []).flatMap(issue => {
    const creationTimestamp = parseTimestamp(issue.creationDate);
    return creationTimestamp === undefined
      ? []
      : [
          {
            creationTimestamp,
          },
        ];
  });
}

function normalizeResolvedIssues(issues, oldestAnalysisTimestamp) {
  return (issues ?? []).flatMap(issue => {
    const creationTimestamp = parseTimestamp(issue.creationDate);
    const closeTimestamp = parseTimestamp(issue.closeDate);

    if (creationTimestamp === undefined || closeTimestamp === undefined) {
      return [];
    }

    if (closeTimestamp <= oldestAnalysisTimestamp) {
      return [];
    }

    return [
      {
        creationTimestamp,
        closeTimestamp,
      },
    ];
  });
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

function toDatedEntries(entries) {
  return entries
    .flatMap(entry => {
      const timestamp = parseTimestamp(entry.date);
      return timestamp === undefined ? [] : [{ ...entry, timestamp }];
    })
    .sort((left, right) => left.timestamp - right.timestamp);
}

function parseFreshnessWindow(window) {
  const analysisWindowStartTimestamp = parseTimestamp(
    window.analysisWindowStart ?? window.analysisAfter,
  );
  const analysisWindowEndTimestamp = parseTimestamp(
    window.analysisWindowEnd ?? window.analysisBefore,
  );

  if (
    analysisWindowStartTimestamp !== undefined &&
    analysisWindowEndTimestamp !== undefined &&
    analysisWindowStartTimestamp > analysisWindowEndTimestamp
  ) {
    throw new Error('analysisWindowStart must be earlier than or equal to analysisWindowEnd');
  }

  return {
    analysisWindowStartTimestamp,
    analysisWindowEndTimestamp,
  };
}

function findCurrentHistoryIndex(history, window) {
  if (
    window.analysisWindowStartTimestamp === undefined &&
    window.analysisWindowEndTimestamp === undefined
  ) {
    return history.length - 1;
  }

  for (let index = history.length - 1; index >= 0; index -= 1) {
    const point = history[index];
    if (
      (window.analysisWindowStartTimestamp === undefined ||
        point.timestamp >= window.analysisWindowStartTimestamp) &&
      (window.analysisWindowEndTimestamp === undefined ||
        point.timestamp <= window.analysisWindowEndTimestamp)
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
    projectMetadata: {
      projectDir: sourceJobName,
      hasSonarTests: false,
      sonarSources: [],
      sonarTests: [],
    },
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
    projectMetadata: options.projectMetadata,
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
    project_dir: row.projectMetadata?.projectDir,
    has_sonar_tests: row.projectMetadata?.hasSonarTests ?? false,
    sonar_sources: row.projectMetadata?.sonarSources ?? [],
    sonar_tests: row.projectMetadata?.sonarTests ?? [],
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

function formatExclusiveIsoTimestamp(timestamp) {
  return formatPeachDateTime(roundUpToNextSecond(timestamp));
}

function roundUpToNextSecond(timestamp) {
  return Math.floor(timestamp / 1000) * 1000 + 1000;
}

function floorToSecond(timestamp) {
  return Math.floor(timestamp / 1000) * 1000;
}

function formatPeachDateTime(timestamp) {
  return new Date(timestamp).toISOString().replace(/\.\d{3}Z$/, '+0000');
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
