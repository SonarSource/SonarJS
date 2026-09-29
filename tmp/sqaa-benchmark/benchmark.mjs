#!/usr/bin/env node
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
// Resumable CI snapshot and direct SQAA issue-parity benchmark. Node.js 20+, no dependencies.
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile, appendFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const REPOS = new Set(['javascript', 'typescript', 'css']);
const PAGE_SIZE = 500;
const ISSUE_CAP = 10_000;

function parseOptions(argv) {
  const [command, ...values] = argv;
  const args = {
    command,
    file: [],
    rule: [],
    project: [],
    'exclude-file': [],
    'exclude-project': [],
  };
  for (let i = 0; i < values.length; i++) {
    const name = values[i];
    if (!name.startsWith('--') || values[i + 1] == null) {
      throw new Error(`Expected --name value, got ${name ?? '<end>'}`);
    }
    const key = name.slice(2);
    if (
      key === 'file' ||
      key === 'rule' ||
      key === 'project' ||
      key === 'exclude-file' ||
      key === 'exclude-project'
    )
      args[key].push(values[++i]);
    else args[key] = values[++i];
  }
  return args;
}

function required(args, names) {
  for (const name of names) if (!args[name]) throw new Error(`--${name} is required`);
}

function numberOption(args, name, fallback) {
  const value = args[name] == null ? fallback : Number(args[name]);
  if (!Number.isInteger(value) || value < 1)
    throw new Error(`--${name} must be a positive integer`);
  return value;
}

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

async function jsonOrNull(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function atomicJson(file, value) {
  const temporary = `${file}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value)}\n`);
  await rename(temporary, file);
}

async function mapLimit(items, limit, work) {
  let next = 0;
  const failures = [];
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const item = items[next++];
        try {
          await work(item);
        } catch (error) {
          failures.push({ item, error });
        }
      }
    }),
  );
  if (failures.length) {
    throw new Error(`${failures.length} task(s) failed; first: ${failures[0].error.message}`);
  }
}

class Api {
  constructor(baseUrl, token, paceMs = 0) {
    this.baseUrl = baseUrl;
    this.token = token;
    this.paceMs = paceMs;
    this.nextStart = 0;
  }

  async request(path, query = {}, options = {}) {
    const url = new URL(path, this.baseUrl);
    for (const [key, value] of Object.entries(query)) {
      if (value != null) url.searchParams.set(key, String(value));
    }
    const maxAttempts = options.maxAttempts ?? 5;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const start = Math.max(Date.now(), this.nextStart);
      this.nextStart = start + this.paceMs;
      if (start > Date.now()) await delay(start - Date.now());
      let response;
      try {
        response = await fetch(url, {
          method: options.method ?? 'GET',
          headers: {
            Authorization: `Bearer ${this.token}`,
            ...(options.body == null ? {} : { 'Content-Type': 'application/json' }),
          },
          body: options.body == null ? undefined : JSON.stringify(options.body),
          signal: AbortSignal.timeout(options.timeoutMs ?? 120_000),
        });
      } catch (error) {
        if (attempt === maxAttempts - 1) throw new Error(`Network request failed (${error.name})`);
        await delay(1000 * (attempt + 1));
        continue;
      }
      if (response.ok) {
        const data = options.raw ? await response.text() : await response.json();
        return options.includeMetadata
          ? {
              data,
              gatewayRequestId: response.headers.get('x-amzn-requestid'),
            }
          : data;
      }
      if (![429, 503, 504].includes(response.status) || attempt === maxAttempts - 1) {
        const error = new Error(`HTTP ${response.status} from ${url.pathname}`);
        error.httpStatus = response.status;
        error.gatewayRequestId = response.headers.get('x-amzn-requestid');
        throw error;
      }
      const retryAfter = Number(response.headers.get('retry-after'));
      await response.arrayBuffer();
      await delay(
        Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : 1000 * (attempt + 1) ** 2,
      );
    }
    throw new Error('Unreachable retry state');
  }
}

function ciQuery(organization, more = {}) {
  return { issueStatuses: 'OPEN,CONFIRMED', additionalFields: '_all', organization, ...more };
}

async function componentChildren(api, component) {
  const children = [];
  for (let page = 1; ; page++) {
    const result = await api.request('/api/components/tree', {
      component,
      qualifiers: 'DIR,FIL,UTS',
      strategy: 'children',
      p: page,
      ps: PAGE_SIZE,
    });
    children.push(...(result.components ?? []).map(child => child.key));
    if (page * PAGE_SIZE >= (result.paging?.total ?? 0)) return children;
  }
}

async function issuesForComponents(api, organization, components) {
  const query = { componentKeys: components.join(','), ps: PAGE_SIZE };
  const first = await api.request('/api/issues/search', ciQuery(organization, { ...query, p: 1 }));
  const total = first.paging?.total ?? first.total;
  if (!Number.isInteger(total)) throw new Error('Issue search response has no total');
  if (total >= ISSUE_CAP) {
    let partitions;
    if (components.length > 1) {
      const middle = Math.floor(components.length / 2);
      partitions = [components.slice(0, middle), components.slice(middle)];
    } else {
      const children = await componentChildren(api, components[0]);
      if (!children.length) throw new Error(`Cannot split capped component ${components[0]}`);
      partitions = children.map(child => [child]);
    }
    const issueMap = new Map();
    const qualifiers = {};
    for (const partition of partitions) {
      const result = await issuesForComponents(api, organization, partition);
      Object.assign(qualifiers, result.qualifiers);
      for (const issue of result.issues) {
        issueMap.set(issue.key, issue);
      }
    }
    return { issues: [...issueMap.values()], qualifiers };
  }
  const issues = [...(first.issues ?? [])];
  const qualifiers = Object.fromEntries(
    (first.components ?? [])
      .filter(component => ['FIL', 'UTS'].includes(component.qualifier))
      .map(component => [component.key, component.qualifier]),
  );
  for (let page = 2; (page - 1) * PAGE_SIZE < total; page++) {
    const result = await api.request(
      '/api/issues/search',
      ciQuery(organization, { ...query, p: page }),
    );
    issues.push(...(result.issues ?? []));
    for (const component of result.components ?? []) {
      if (['FIL', 'UTS'].includes(component.qualifier))
        qualifiers[component.key] = component.qualifier;
    }
  }
  if (issues.length !== total)
    throw new Error(`Issue pagination incomplete: ${issues.length}/${total}`);
  return { issues, qualifiers };
}

async function latestAnalysis(api, project) {
  const result = await api.request('/api/project_analyses/search', { project, ps: 1 });
  const analysis = result.analyses?.[0];
  if (!analysis?.key) throw new Error(`No analysis found for ${project}`);
  return { key: analysis.key, revision: analysis.revision ?? null, date: analysis.date ?? null };
}

async function mainBranchId(api, project) {
  const result = await api.request('/api/project_branches/list', { project });
  const branch = result.branches?.find(item => item.isMain);
  if (!branch?.branchId) throw new Error(`No main branch ID for ${project}`);
  return branch.branchId;
}

function issueProject(issue, projects) {
  return issue.project ?? projects.find(project => issue.component?.startsWith(`${project}:`));
}

export function sampleFiles(projectRecords, limitPerRule, rules, fileSelectors) {
  const issuesByRule = new Map();
  const allIssuesByComponent = new Map();
  const projectByComponent = new Map();
  for (const record of projectRecords) {
    for (const issue of record.issues) {
      if (!REPOS.has(issue.rule?.split(':', 1)[0])) continue;
      if (!issue.component?.startsWith(`${record.project}:`)) continue;
      if (!allIssuesByComponent.has(issue.component)) allIssuesByComponent.set(issue.component, []);
      allIssuesByComponent.get(issue.component).push(issue);
      projectByComponent.set(issue.component, record.project);
      if (rules.length && !rules.includes(issue.rule)) continue;
      if (!issuesByRule.has(issue.rule)) issuesByRule.set(issue.rule, []);
      issuesByRule.get(issue.rule).push(issue);
    }
  }
  const selected = new Set();
  for (const [rule, issues] of fileSelectors.length ? [] : issuesByRule) {
    let remaining = limitPerRule;
    const byProject = new Map();
    for (const issue of issues) {
      const project = projectByComponent.get(issue.component);
      if (!byProject.has(project)) byProject.set(project, []);
      byProject.get(project).push(issue);
    }
    const projects = [...byProject.keys()].sort((a, b) =>
      hash(`${rule}:${a}`).localeCompare(hash(`${rule}:${b}`)),
    );
    for (const list of byProject.values()) list.sort((a, b) => a.key.localeCompare(b.key));
    for (let round = 0; ; round++) {
      let picked = false;
      for (const project of projects) {
        const issue = byProject.get(project)[round];
        if (!issue) continue;
        selected.add(issue.component);
        picked = true;
        if (--remaining === 0) break;
      }
      if (!picked || remaining === 0) break;
    }
  }
  for (const selector of fileSelectors) {
    const matches = projectRecords.flatMap(record => {
      if (selector.startsWith(`${record.project}:`))
        return [{ component: selector, project: record.project }];
      return [...allIssuesByComponent.keys()]
        .filter(
          component =>
            component.startsWith(`${record.project}:`) && component.endsWith(`:${selector}`),
        )
        .map(component => ({ component, project: record.project }));
    });
    if (matches.length !== 1)
      throw new Error(`File selector ${selector} matched ${matches.length} components`);
    selected.add(matches[0].component);
    projectByComponent.set(matches[0].component, matches[0].project);
    if (!allIssuesByComponent.has(matches[0].component))
      allIssuesByComponent.set(matches[0].component, []);
  }
  return { selected: [...selected].sort(), allIssuesByComponent, projectByComponent };
}

function filePath(project, component) {
  if (!component.startsWith(`${project}:`))
    throw new Error(`Component is outside project ${project}`);
  return component.slice(project.length + 1);
}

async function fileSnapshot(api, projectRecord, component, issues, file) {
  const existing = await jsonOrNull(file);
  if (existing) {
    if (existing.analysisKey !== projectRecord.analysis.key) {
      throw new Error(`Stale file checkpoint for ${component}; start a new output directory`);
    }
    return;
  }
  const issueScopes = new Set(
    issues.map(issue => issue.scope).filter(scope => scope === 'MAIN' || scope === 'TEST'),
  );
  const scopeFromIssues = issueScopes.size === 1 ? [...issueScopes][0] : null;
  const knownQualifier = projectRecord.qualifiers?.[component];
  const knownScope = knownQualifier === 'UTS' ? 'TEST' : knownQualifier === 'FIL' ? 'MAIN' : null;
  const [source, details] = await Promise.all([
    api.request('/api/sources/raw', { key: component }, { raw: true }),
    scopeFromIssues || knownScope
      ? Promise.resolve(null)
      : api.request('/api/components/show', { component }),
  ]);
  const qualifier = details?.component?.qualifier;
  const scope =
    scopeFromIssues ??
    knownScope ??
    (qualifier === 'UTS' ? 'TEST' : qualifier === 'FIL' ? 'MAIN' : null);
  if (!scope) throw new Error(`Unknown file scope for ${component}: ${qualifier ?? '<missing>'}`);
  await atomicJson(file, {
    component,
    project: projectRecord.project,
    path: filePath(projectRecord.project, component),
    analysisKey: projectRecord.analysis.key,
    scope,
    source,
    issues,
  });
}

async function capture(args, token) {
  required(args, [
    'server-url',
    'organization',
    'organization-id',
    'projects',
    'out',
    'analyzer-build',
  ]);
  const root = resolve(args.out);
  if (await jsonOrNull(join(root, 'baseline.json'))) {
    throw new Error('This output directory already has a sealed baseline; choose a new directory');
  }
  const manifestProjects = [
    ...new Set(
      (await readFile(args.projects, 'utf8'))
        .split(/\r?\n/)
        .map(value => value.trim())
        .filter(value => value && !value.startsWith('#')),
    ),
  ];
  const directFiles =
    args.file.length &&
    args.file.every(component =>
      manifestProjects.some(project => component.startsWith(`${project}:`)),
    )
      ? args.file
      : null;
  const projects = manifestProjects.filter(
    project =>
      (!args.project.length || args.project.includes(project)) &&
      !args['exclude-project'].includes(project) &&
      (!directFiles || directFiles.some(component => component.startsWith(`${project}:`))),
  );
  if (!projects.length) throw new Error('Project manifest is empty');
  // A full component key is sufficient to probe one file without querying and
  // sampling every issue in a large project such as Kibana.
  if (
    directFiles &&
    directFiles.some(component => !projects.some(project => component.startsWith(`${project}:`)))
  )
    throw new Error('Explicit file is outside the selected projects');
  const api = new Api(args['server-url'], token, numberOption(args, 'pace-ms', 150));
  const concurrency = numberOption(args, 'concurrency', 8);
  const sampleLimit = numberOption(args, 'sample-per-rule', 20);
  await mkdir(join(root, 'projects'), { recursive: true });
  await mkdir(join(root, 'files'), { recursive: true });
  const records = new Map();
  const pending = [];
  await mapLimit(projects, concurrency, async project => {
    const analysis = await latestAnalysis(api, project);
    const checkpoint = join(root, 'projects', `${hash(project)}.json`);
    const existing = await jsonOrNull(checkpoint);
    if (existing) {
      if (existing.analysis.key !== analysis.key) {
        throw new Error(`Analysis changed for ${project}; use a new output directory`);
      }
      records.set(project, existing);
    } else {
      pending.push({ project, analysis, checkpoint });
    }
  });
  console.log(`${records.size} project checkpoints reused; ${pending.length} need CI issues`);
  const batches = [];
  for (let i = 0; i < pending.length; i += 10) batches.push(pending.slice(i, i + 10));
  let completed = 0;
  await mapLimit(batches, concurrency, async batch => {
    const keys = batch.map(item => item.project);
    const { issues, qualifiers } = await issuesForComponents(
      api,
      args.organization,
      directFiles
        ? directFiles.filter(component => keys.some(key => component.startsWith(`${key}:`)))
        : keys,
    );
    const grouped = new Map(keys.map(key => [key, []]));
    for (const issue of issues) {
      if (!REPOS.has(issue.rule?.split(':', 1)[0])) continue;
      const project = issueProject(issue, keys);
      if (!grouped.has(project)) throw new Error(`Issue has an unknown project: ${issue.key}`);
      grouped.get(project).push(issue);
    }
    for (const item of batch) {
      const branchId = await mainBranchId(api, item.project);
      const record = {
        project: item.project,
        analysis: item.analysis,
        branchId,
        issues: grouped.get(item.project),
        qualifiers: Object.fromEntries(
          Object.entries(qualifiers).filter(([component]) =>
            component.startsWith(`${item.project}:`),
          ),
        ),
      };
      await atomicJson(item.checkpoint, record);
      records.set(item.project, record);
    }
    console.log(`CI issue batches: ${++completed}/${batches.length}`);
  });
  const projectRecords = projects.map(project => records.get(project));
  const cohort = sampleFiles(projectRecords, sampleLimit, args.rule, args.file);
  const excludedFiles = new Set(args['exclude-file']);
  for (const component of excludedFiles) {
    if (!cohort.selected.includes(component))
      throw new Error(`Excluded file is not in the selected cohort: ${component}`);
  }
  const selectedFiles = cohort.selected.filter(
    component =>
      !excludedFiles.has(component) &&
      (!args['file-suffix'] || component.endsWith(args['file-suffix'])),
  );
  const byProject = new Map(projectRecords.map(record => [record.project, record]));
  console.log(
    `Selected ${selectedFiles.length} files from ${projects.length} projects (${excludedFiles.size} excluded)`,
  );
  let savedFiles = 0;
  await mapLimit(selectedFiles, concurrency, async component => {
    const project = cohort.projectByComponent.get(component);
    const record = byProject.get(project);
    await fileSnapshot(
      api,
      record,
      component,
      cohort.allIssuesByComponent.get(component),
      join(root, 'files', `${hash(component)}.json`),
    );
    if (++savedFiles % 100 === 0 || savedFiles === selectedFiles.length) {
      console.log(`File snapshots: ${savedFiles}/${selectedFiles.length}`);
    }
  });
  await mapLimit(projectRecords, concurrency, async record => {
    if ((await latestAnalysis(api, record.project)).key !== record.analysis.key) {
      throw new Error(`Analysis changed during capture for ${record.project}; baseline not sealed`);
    }
  });
  await atomicJson(join(root, 'baseline.json'), {
    formatVersion: 1,
    capturedAt: new Date().toISOString(),
    serverUrl: args['server-url'],
    analyzerBuild: args['analyzer-build'],
    organization: args.organization,
    organizationId: args['organization-id'],
    projects: projectRecords.map(({ project, analysis, branchId }) => ({
      project,
      analysis,
      branchId,
    })),
    files: selectedFiles.map(component => ({
      component,
      record: `files/${hash(component)}.json`,
    })),
    selection: {
      samplePerRule: sampleLimit,
      rules: args.rule,
      files: args.file,
      excludedFiles: [...excludedFiles],
      excludedProjects: args['exclude-project'],
      fileSuffix: args['file-suffix'] ?? null,
    },
  });
  console.log(`Sealed immutable baseline: ${join(root, 'baseline.json')}`);
}

function exactKey(issue, ci) {
  const range = issue.textRange;
  return JSON.stringify([
    issue.rule ?? null,
    issue.message ?? null,
    range?.startLine ?? (ci ? (issue.line ?? null) : null),
    range?.startOffset ?? null,
    range?.endLine ?? null,
    range?.endOffset ?? null,
  ]);
}

export function compareIssues(expected, actual, rules = []) {
  const applies = issue =>
    REPOS.has(issue.rule?.split(':', 1)[0]) && (!rules.length || rules.includes(issue.rule));
  const remaining = new Map();
  for (const issue of actual.filter(applies)) {
    const key = exactKey(issue, false);
    if (!remaining.has(key)) remaining.set(key, []);
    remaining.get(key).push(issue);
  }
  const missing = [];
  let matched = 0;
  const matchedByRule = {};
  for (const issue of expected.filter(applies)) {
    const bucket = remaining.get(exactKey(issue, true));
    if (bucket?.length) {
      bucket.pop();
      matched++;
      matchedByRule[issue.rule] = (matchedByRule[issue.rule] ?? 0) + 1;
    } else missing.push(issue);
  }
  return { matched, matchedByRule, missing, extra: [...remaining.values()].flat() };
}

function percentile(sorted, fraction) {
  return sorted.length ? sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)] : 0;
}

function csv(rows) {
  return `${rows
    .map(row =>
      row
        .map(value => {
          const text = String(value ?? '');
          return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
        })
        .join(','),
    )
    .join('\n')}\n`;
}

async function compare(args, token) {
  required(args, ['baseline', 'sqaa-url', 'out', 'deployment']);
  const baselineBytes = await readFile(args.baseline);
  const baseline = await jsonOrNull(args.baseline);
  if (baseline?.formatVersion !== 1) throw new Error('Missing or incompatible sealed baseline');
  const output = resolve(args.out);
  await mkdir(output, { recursive: true });
  const runManifest = {
    baselineSha256: hash(baselineBytes),
    sqaaUrl: args['sqaa-url'],
    deployment: args.deployment,
  };
  const runFile = join(output, 'run.json');
  const priorRun = await jsonOrNull(runFile);
  if (priorRun && JSON.stringify(priorRun) !== JSON.stringify(runManifest)) {
    throw new Error('Comparison output belongs to a different baseline or deployment');
  }
  if (!priorRun) await atomicJson(runFile, runManifest);
  const resultFile = join(output, 'results.jsonl');
  const completed = new Set();
  try {
    for (const line of (await readFile(resultFile, 'utf8')).split(/\r?\n/).filter(Boolean)) {
      const record = JSON.parse(line);
      if (record.status === 'ok') completed.add(record.component);
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const files = [];
  for (const entry of baseline.files) {
    const file = await jsonOrNull(join(dirname(resolve(args.baseline)), entry.record));
    if (!file) throw new Error(`Missing baseline file snapshot: ${entry.record}`);
    if (args.project.length && !args.project.includes(file.project)) continue;
    if (
      args.file.length &&
      !args.file.some(value => value === file.component || value === file.path)
    )
      continue;
    if (args.rule.length && !file.issues.some(issue => args.rule.includes(issue.rule))) continue;
    if (!completed.has(file.component)) files.push(file);
  }
  const projects = new Map(baseline.projects.map(item => [item.project, item]));
  const api = new Api(args['sqaa-url'], token);
  const concurrency = numberOption(args, 'concurrency', 1);
  let done = 0;
  let writes = Promise.resolve();
  await mapLimit(files, concurrency, async file => {
    const project = projects.get(file.project);
    if (!project) throw new Error(`No project metadata for ${file.project}`);
    const start = performance.now();
    let record;
    try {
      const { data: response, gatewayRequestId } = await api.request(
        '',
        {},
        {
          method: 'POST',
          timeoutMs: numberOption(args, 'timeout-ms', 60_000),
          maxAttempts: 1,
          includeMetadata: true,
          body: {
            organizationId: baseline.organizationId,
            projectKey: file.project,
            branchId: project.branchId,
            analysisDepth: 'DEEP',
            files: [{ path: file.path, content: file.source, scope: file.scope }],
          },
        },
      );
      const durationMs = Math.round(performance.now() - start);
      if (response.errors?.length) {
        record = {
          component: file.component,
          status: response.errors.every(error => error?.code === 'INVALID_CONTEXT')
            ? 'invalid_context'
            : 'analysis_error',
          durationMs,
          analysisId: response.id ?? null,
          gatewayRequestId,
          errors: response.errors,
        };
      } else {
        if (!Array.isArray(response.issues)) {
          throw new Error('SQAA response has no issues array or analysis errors');
        }
        const actual = response.issues.filter(issue => issue.filePath === file.path);
        const differences = compareIssues(file.issues, actual, args.rule);
        record = {
          component: file.component,
          status: 'ok',
          durationMs,
          analysisId: response.id ?? null,
          gatewayRequestId,
          ...differences,
        };
      }
    } catch (error) {
      record = {
        component: file.component,
        status: 'http_error',
        durationMs: Math.round(performance.now() - start),
        error: error.message,
        httpStatus: error.httpStatus ?? null,
        gatewayRequestId: error.gatewayRequestId ?? null,
      };
    }
    // Multiple workers must append records atomically in this single process.
    writes = writes.then(() => appendFile(resultFile, `${JSON.stringify(record)}\n`));
    await writes;
    done++;
    if (done % 25 === 0 || done === files.length)
      console.log(`SQAA requests: ${done}/${files.length}`);
  });
  const results = (await readFile(resultFile, 'utf8'))
    .split(/\r?\n/)
    .filter(Boolean)
    .map(JSON.parse);
  const latest = new Map(results.map(record => [record.component, record]));
  const summary = {
    cohortFiles: baseline.files.length,
    attemptedFiles: latest.size,
    comparedFiles: 0,
    pendingFiles: baseline.files.length - latest.size,
    matched: 0,
    missing: 0,
    extra: 0,
    invalidContexts: 0,
    analysisErrors: 0,
    httpErrors: 0,
    requestDurationMs: 0,
  };
  const ruleMetrics = new Map();
  const timings = [];
  const errors = [
    ['component', 'status', 'codes', 'analysisId', 'gatewayRequestId', 'durationMs', 'message'],
  ];
  const falsePositives = [['rule', 'component', 'line']];
  const perFileTimings = [['component', 'status', 'durationMs']];
  const problemCodes = {};
  const metric = rule => {
    if (!ruleMetrics.has(rule)) ruleMetrics.set(rule, { rule, matched: 0, missing: 0, extra: 0 });
    return ruleMetrics.get(rule);
  };
  for (const result of latest.values()) {
    summary.requestDurationMs += result.durationMs;
    perFileTimings.push([result.component, result.status, result.durationMs]);
    if (result.status === 'ok') {
      summary.comparedFiles++;
      timings.push(result.durationMs);
      summary.matched += result.matched;
      summary.missing += result.missing.length;
      summary.extra += result.extra.length;
      for (const [rule, count] of Object.entries(result.matchedByRule ?? {}))
        metric(rule).matched += count;
      for (const issue of result.missing) metric(issue.rule).missing++;
      for (const issue of result.extra) {
        metric(issue.rule).extra++;
        falsePositives.push([issue.rule, result.component, issue.textRange?.startLine]);
      }
    } else {
      if (result.status === 'invalid_context') summary.invalidContexts++;
      else if (result.status === 'analysis_error') summary.analysisErrors++;
      else summary.httpErrors++;
      const codes = [...new Set((result.errors ?? []).map(error => error?.code).filter(Boolean))];
      for (const code of codes) problemCodes[code] = (problemCodes[code] ?? 0) + 1;
      errors.push([
        result.component,
        result.status,
        codes.join(';'),
        result.analysisId,
        result.gatewayRequestId,
        result.durationMs,
        result.error ?? '',
      ]);
    }
  }
  timings.sort((a, b) => a - b);
  summary.completionCoveragePct = baseline.files.length
    ? Number(((100 * summary.comparedFiles) / baseline.files.length).toFixed(1))
    : 100;
  summary.problemCodes = problemCodes;
  summary.successTimingsMs = {
    average: timings.length ? Math.round(timings.reduce((a, b) => a + b, 0) / timings.length) : 0,
    p50: percentile(timings, 0.5),
    p90: percentile(timings, 0.9),
    p95: percentile(timings, 0.95),
    p99: percentile(timings, 0.99),
    maximum: timings.at(-1) ?? 0,
  };
  const byRule = [...ruleMetrics.values()].sort((a, b) => a.rule.localeCompare(b.rule));
  for (const row of byRule) {
    row.detectionRatePct =
      row.matched + row.missing
        ? Number(((100 * row.matched) / (row.matched + row.missing)).toFixed(1))
        : 100;
    row.falsePositiveRatePct =
      row.matched + row.extra
        ? Number(((100 * row.extra) / (row.matched + row.extra)).toFixed(1))
        : 0;
  }
  await atomicJson(join(output, 'summary.json'), summary);
  await atomicJson(join(output, 'rule_metrics.json'), byRule);
  await writeFile(
    join(output, 'rule_metrics.csv'),
    csv([
      ['rule', 'matched', 'missing', 'extra', 'detectionRatePct', 'falsePositiveRatePct'],
      ...byRule.map(row => [
        row.rule,
        row.matched,
        row.missing,
        row.extra,
        row.detectionRatePct,
        row.falsePositiveRatePct,
      ]),
    ]),
  );
  await writeFile(join(output, 'false_positives.csv'), csv(falsePositives));
  await writeFile(join(output, 'errors.csv'), csv(errors));
  await writeFile(join(output, 'timings.csv'), csv(perFileTimings));
  console.log(JSON.stringify(summary));
}

async function main() {
  const args = parseOptions(process.argv.slice(2));
  if (!['capture', 'compare'].includes(args.command)) {
    throw new Error('Usage: benchmark.mjs capture|compare [--option value ...]');
  }
  const token = process.env[args['token-env'] ?? 'SONAR_TOKEN'];
  if (!token)
    throw new Error(
      `Credential environment variable ${args['token-env'] ?? 'SONAR_TOKEN'} is unset`,
    );
  if (args.command === 'capture') await capture(args, token);
  else await compare(args, token);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
