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
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import projects from '../packages/ruling/projects.json' with { type: 'json' };
import { handleAnalyzeProjectRequest } from '../packages/grpc/src/analyze-project-handle-request.js';
import type { AnalyzeProjectProtoRequest } from '../packages/grpc/src/analyze-project-request.js';
import { toAnalyzeProjectUnaryResponse } from '../packages/grpc/src/analyze-project-convert.js';
import { sonarjs as analyzeProjectProto } from '../packages/grpc/src/proto/analyze-project.js';
import * as metas from '../packages/analysis/src/jsts/rules/metas.js';
import type { SonarMeta } from '../packages/analysis/src/jsts/rules/helpers/generate-meta.js';

type AnalyzeProjectUnaryResponse =
  analyzeProjectProto.analyzeproject.v1.IAnalyzeProjectUnaryResponse;
type ProjectAnalysisFileResult = analyzeProjectProto.analyzeproject.v1.IProjectAnalysisFileResult;
type Issue = analyzeProjectProto.analyzeproject.v1.IIssue;
type ParsingError = analyzeProjectProto.analyzeproject.v1.IParsingError;

type RulingProject = {
  name: string;
  folder?: string;
  testDir: string | null;
  exclusions: string | null;
};

type RawJsTsRuleRequest = {
  key: string;
  configurations: Record<string, unknown>[];
  language: 'JS_TS_LANGUAGE_JS' | 'JS_TS_LANGUAGE_TS';
  fileTypeTargets: Array<'FILE_TYPE_MAIN' | 'FILE_TYPE_TEST'>;
  analysisModes: ['ANALYSIS_MODE_DEFAULT'];
  blacklistedExtensions?: string[];
};

type RawAnalyzeProjectRequest = {
  configuration: Record<string, unknown>;
  rules: RawJsTsRuleRequest[];
};

type NormalizedAnalysisOutput = {
  warnings?: string[];
  files: NormalizedFileResult[];
};

type NormalizedFileResult = {
  filePath: string;
  error?: string;
  parsingErrors?: NormalizedParsingError[];
  issues?: NormalizedIssue[];
};

type NormalizedParsingError = {
  message: string;
  code: string;
  language: string;
  line?: number;
  column?: number;
};

type NormalizedIssue = {
  ruleId: string;
  language: string;
  message: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  secondaryLocations?: NormalizedIssueLocation[];
};

type NormalizedIssueLocation = {
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  message?: string;
};

type AnalysisTimings = {
  analyzeMs: number;
  wallMs: number;
};

type TimedAnalysisOutput = {
  analysis: NormalizedAnalysisOutput;
  timings: AnalysisTimings;
};

type NumericSummary = {
  count: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  p95: number;
  stddev: number;
  total: number;
};

type RuntimeSummary = {
  issues: number;
  parsingErrors: number;
  warnings: number;
  files: number;
  analysisMs: NumericSummary;
  wallMs: NumericSummary;
};

type CountDelta = {
  node: number;
  go: number;
  delta: number;
};

type RuleCountDelta = {
  ruleId: string;
  node: number;
  go: number;
  delta: number;
};

type ParitySummary = {
  exactMatch: boolean;
  mismatchedFiles: number;
  issues: CountDelta;
  parsingErrors: CountDelta;
  warnings: CountDelta;
  files: CountDelta;
  differingRules?: RuleCountDelta[];
};

type ProjectBenchmarkResult = {
  project: string;
  baseDir: string;
  sharedRuleKeys: number;
  sharedRuleConfigs: number;
  node: RuntimeSummary;
  go: RuntimeSummary;
  ratios: {
    goVsNodeAnalysisMean: number;
    goVsNodeWallMean: number;
  };
  parity: ParitySummary;
};

type BenchmarkReport = {
  selectedProjects: string[];
  scope: 'implemented' | 'routed';
  sharedRuleKeys: number;
  sharedRuleConfigs: number;
  options: {
    iterations: number;
    warmup: number;
    topRules: number;
  };
  node: RuntimeSummary;
  go: RuntimeSummary;
  ratios: {
    goVsNodeAnalysisTotal: number;
    goVsNodeWallTotal: number;
    medianProjectGoVsNodeAnalysisMean: number;
    medianProjectGoVsNodeWallMean: number;
  };
  parity: {
    exactMatchProjects: number;
    mismatchedProjects: string[];
    totalIssueDelta: number;
  };
  projects: ProjectBenchmarkResult[];
};

type SharedRuleCatalog = {
  keys: string[];
  rules: RawJsTsRuleRequest[];
};

type MeasuredProject = {
  result: ProjectBenchmarkResult;
  nodeAnalysisSamples: number[];
  nodeWallSamples: number[];
  goAnalysisSamples: number[];
  goWallSamples: number[];
};

type GoBenchmarkCliOutput = {
  analysis: NormalizedAnalysisOutput;
  timings: {
    analyzeMs: number;
  };
};

const currentFile = fileURLToPath(import.meta.url);
const toolsDir = dirname(currentFile);
const repoRoot = resolve(toolsDir, '..');
const rulingSourcesRoot = join(repoRoot, 'its', 'sources');
const goServerDir = join(repoRoot, 'server-go', 'sonar-server');
const benchmarkTmpDir = join(tmpdir(), 'sonarjs-jsts-go-benchmark');
const goCliBinaryPath = join(
  benchmarkTmpDir,
  process.platform === 'win32' ? 'sonar-server.exe' : 'sonar-server',
);
const { AnalysisLanguage, ParsingErrorCode } = analyzeProjectProto.analyzeproject.v1;
const DEFAULT_EXCLUSIONS = ['**/.*', '**/*.d.ts'];
const ruleMetas = metas as unknown as Record<string, SonarMeta>;

let goBinaryPathPromise: Promise<string> | undefined;
let goSupportedRuleKeysPromise: Promise<Set<string>> | undefined;
let productRoutedRuleKeysPromise: Promise<Set<string>> | undefined;
const sharedRuleCatalogPromises = new Map<'implemented' | 'routed', Promise<SharedRuleCatalog>>();

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  if (!command || command === '--help' || command === '-h') {
    printUsage();
    return;
  }

  switch (command) {
    case 'list':
      await listProjects();
      return;
    case 'benchmark': {
      const options = parseBenchmarkOptions(rest);
      const selectedProjects = resolveSelectedProjects(options.projects, options.all);
      const catalog = await loadSharedRuleCatalog(options.scope);
      const measuredProjects: MeasuredProject[] = [];
      for (const project of selectedProjects) {
        measuredProjects.push(await benchmarkProject(project, catalog, options));
      }

      const report = buildBenchmarkReport(measuredProjects, catalog, options);
      printJSON(report, options.pretty);
      return;
    }
    default:
      throw new Error(`Unknown command ${command}`);
  }
}

function parseBenchmarkOptions(args: string[]) {
  const { values } = parseArgs({
    args,
    allowPositionals: false,
    options: {
      project: { type: 'string', multiple: true },
      all: { type: 'boolean', default: false },
      iterations: { type: 'string', default: '3' },
      warmup: { type: 'string', default: '1' },
      'top-rules': { type: 'string', default: '20' },
      scope: { type: 'string', default: 'routed' },
      pretty: { type: 'string', default: 'true' },
    },
  });

  return {
    projects: values.project ?? [],
    all: values.all,
    iterations: parsePositiveInteger(values.iterations, '--iterations'),
    warmup: parseNonNegativeInteger(values.warmup, '--warmup'),
    topRules: parsePositiveInteger(values['top-rules'], '--top-rules'),
    scope: parseScope(values.scope),
    pretty: parseBooleanOption(values.pretty, '--pretty'),
  };
}

async function listProjects() {
  for (const project of [...(projects as RulingProject[])].sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    console.log(`${project.name}\t${resolveProjectBaseDir(project)}`);
  }
}

function resolveSelectedProjects(projectNames: string[], all: boolean): RulingProject[] {
  const availableProjects = new Map(
    (projects as RulingProject[]).map(project => [project.name.toLowerCase(), project]),
  );
  if (all) {
    return [...availableProjects.values()].sort((left, right) =>
      left.name.localeCompare(right.name),
    );
  }

  if (projectNames.length === 0) {
    throw new Error('benchmark requires --project <name> (repeatable) or --all.');
  }

  return projectNames.map(projectName => {
    const resolved = availableProjects.get(projectName.toLowerCase());
    if (!resolved) {
      throw new Error(`Unknown ruling project ${projectName}.`);
    }
    return resolved;
  });
}

async function benchmarkProject(
  project: RulingProject,
  catalog: SharedRuleCatalog,
  options: {
    iterations: number;
    warmup: number;
    topRules: number;
  },
): Promise<MeasuredProject> {
  const rawRequest = createRawAnalyzeProjectRequest(project, catalog);
  const requestPath = await writeRequestFile(project.name, rawRequest);

  const nodeRuns: TimedAnalysisOutput[] = [];
  const goRuns: TimedAnalysisOutput[] = [];

  for (let iteration = 0; iteration < options.warmup; iteration++) {
    if (iteration % 2 === 0) {
      await runNodeDetailed(rawRequest);
      await runGoDetailed(requestPath);
    } else {
      await runGoDetailed(requestPath);
      await runNodeDetailed(rawRequest);
    }
  }

  for (let iteration = 0; iteration < options.iterations; iteration++) {
    if (iteration % 2 === 0) {
      nodeRuns.push(await runNodeDetailed(rawRequest));
      goRuns.push(await runGoDetailed(requestPath));
    } else {
      goRuns.push(await runGoDetailed(requestPath));
      nodeRuns.push(await runNodeDetailed(rawRequest));
    }
  }

  const node = summarizeRuntimeRuns(nodeRuns);
  const go = summarizeRuntimeRuns(goRuns);
  const parity = summarizeParity(nodeRuns[0].analysis, goRuns[0].analysis, options.topRules);

  return {
    result: {
      project: project.name,
      baseDir: resolveProjectBaseDir(project),
      sharedRuleKeys: catalog.keys.length,
      sharedRuleConfigs: catalog.rules.length,
      node,
      go,
      ratios: {
        goVsNodeAnalysisMean: safeRatio(go.analysisMs.mean, node.analysisMs.mean),
        goVsNodeWallMean: safeRatio(go.wallMs.mean, node.wallMs.mean),
      },
      parity,
    },
    nodeAnalysisSamples: nodeRuns.map(run => run.timings.analyzeMs),
    nodeWallSamples: nodeRuns.map(run => run.timings.wallMs),
    goAnalysisSamples: goRuns.map(run => run.timings.analyzeMs),
    goWallSamples: goRuns.map(run => run.timings.wallMs),
  };
}

function buildBenchmarkReport(
  measuredProjects: MeasuredProject[],
  catalog: SharedRuleCatalog,
  options: {
    iterations: number;
    warmup: number;
    topRules: number;
    scope: 'implemented' | 'routed';
  },
): BenchmarkReport {
  const projects = measuredProjects.map(project => project.result);
  const mismatchedProjects = projects
    .filter(project => !project.parity.exactMatch)
    .map(project => project.project);

  return {
    selectedProjects: projects.map(project => project.project),
    scope: options.scope,
    sharedRuleKeys: catalog.keys.length,
    sharedRuleConfigs: catalog.rules.length,
    options: {
      iterations: options.iterations,
      warmup: options.warmup,
      topRules: options.topRules,
    },
    node: aggregateRuntimeResults(
      projects.map(project => project.node),
      measuredProjects.flatMap(project => project.nodeAnalysisSamples),
      measuredProjects.flatMap(project => project.nodeWallSamples),
    ),
    go: aggregateRuntimeResults(
      projects.map(project => project.go),
      measuredProjects.flatMap(project => project.goAnalysisSamples),
      measuredProjects.flatMap(project => project.goWallSamples),
    ),
    ratios: {
      goVsNodeAnalysisTotal: safeRatio(
        measuredProjects
          .flatMap(project => project.goAnalysisSamples)
          .reduce((sum, value) => sum + value, 0),
        measuredProjects
          .flatMap(project => project.nodeAnalysisSamples)
          .reduce((sum, value) => sum + value, 0),
      ),
      goVsNodeWallTotal: safeRatio(
        measuredProjects
          .flatMap(project => project.goWallSamples)
          .reduce((sum, value) => sum + value, 0),
        measuredProjects
          .flatMap(project => project.nodeWallSamples)
          .reduce((sum, value) => sum + value, 0),
      ),
      medianProjectGoVsNodeAnalysisMean: summarizeNumbers(
        projects.map(project => project.ratios.goVsNodeAnalysisMean),
      ).median,
      medianProjectGoVsNodeWallMean: summarizeNumbers(
        projects.map(project => project.ratios.goVsNodeWallMean),
      ).median,
    },
    parity: {
      exactMatchProjects: projects.length - mismatchedProjects.length,
      mismatchedProjects,
      totalIssueDelta: projects.reduce((sum, project) => sum + project.parity.issues.delta, 0),
    },
    projects,
  };
}

function aggregateRuntimeResults(
  runtimes: RuntimeSummary[],
  analysisSamples: number[],
  wallSamples: number[],
): RuntimeSummary {
  return {
    issues: runtimes.reduce((sum, runtime) => sum + runtime.issues, 0),
    parsingErrors: runtimes.reduce((sum, runtime) => sum + runtime.parsingErrors, 0),
    warnings: runtimes.reduce((sum, runtime) => sum + runtime.warnings, 0),
    files: runtimes.reduce((sum, runtime) => sum + runtime.files, 0),
    analysisMs: summarizeNumbers(analysisSamples),
    wallMs: summarizeNumbers(wallSamples),
  };
}

function createRawAnalyzeProjectRequest(
  project: RulingProject,
  catalog: SharedRuleCatalog,
): RawAnalyzeProjectRequest {
  return {
    configuration: {
      baseDir: resolveProjectBaseDir(project),
      maxFileSize: 4000,
      canAccessFileSystem: true,
      skipAst: true,
      skipNodeModuleLookupOutsideBaseDir: true,
      clearDependenciesCache: true,
      clearTsConfigCache: true,
      tests: project.testDir ? [project.testDir] : undefined,
      testExclusions: project.testDir ? DEFAULT_EXCLUSIONS : undefined,
      exclusions: project.exclusions
        ? DEFAULT_EXCLUSIONS.concat(project.exclusions.split(',').map(value => value.trim()))
        : DEFAULT_EXCLUSIONS,
    },
    rules: catalog.rules,
  };
}

function resolveProjectBaseDir(project: RulingProject): string {
  return resolve(rulingSourcesRoot, project.folder ?? join('projects', project.name));
}

async function writeRequestFile(
  projectName: string,
  request: RawAnalyzeProjectRequest,
): Promise<string> {
  await mkdir(benchmarkTmpDir, { recursive: true });
  const fileName = `${sanitizeFileName(projectName)}.request.json`;
  const requestPath = join(benchmarkTmpDir, fileName);
  await writeFile(requestPath, JSON.stringify(request, null, 2));
  return requestPath;
}

function sanitizeFileName(value: string): string {
  return value.replace(/[^a-z0-9._-]+/gi, '-');
}

async function runNodeDetailed(request: RawAnalyzeProjectRequest): Promise<TimedAnalysisOutput> {
  const wallStart = performance.now();
  const protoRequest = analyzeProjectProto.analyzeproject.v1.AnalyzeProjectRequest.fromObject(
    request,
  ) as AnalyzeProjectProtoRequest;
  const analyzeStart = performance.now();
  const result = await withNodeAnalysisLogsOnStderr(() =>
    handleAnalyzeProjectRequest(
      { type: 'on-analyze-project', data: protoRequest },
      { debugMemory: false },
    ),
  );
  const analyzeMs = performance.now() - analyzeStart;

  if (result.type !== 'success') {
    throw new Error(`${result.reason}: ${result.error.message}`);
  }
  if (!result.result) {
    throw new Error('Node analyze-project returned no result');
  }

  const unary = toAnalyzeProjectUnaryResponse(result.result.output, result.result.pathMap);
  return {
    analysis: normalizeUnaryResponse(unary),
    timings: {
      analyzeMs: roundNumber(analyzeMs),
      wallMs: roundNumber(performance.now() - wallStart),
    },
  };
}

async function runGoDetailed(requestPath: string): Promise<TimedAnalysisOutput> {
  const binaryPath = await ensureGoBinary();
  const wallStart = performance.now();
  const { code, stdout, stderr } = await runProcess(
    binaryPath,
    ['--request', requestPath, '--format', 'benchmark-json', '--pretty=false'],
    goServerDir,
  );
  if (code !== 0) {
    throw new Error(stderr.trim() || `go benchmark runner exited with code ${code}`);
  }
  const output = JSON.parse(stdout) as GoBenchmarkCliOutput;
  return {
    analysis: output.analysis,
    timings: {
      analyzeMs: output.timings.analyzeMs,
      wallMs: roundNumber(performance.now() - wallStart),
    },
  };
}

async function ensureGoBinary(): Promise<string> {
  if (!goBinaryPathPromise) {
    goBinaryPathPromise = buildGoBinary();
  }
  return goBinaryPathPromise;
}

async function buildGoBinary(): Promise<string> {
  await mkdir(benchmarkTmpDir, { recursive: true });
  const { code, stderr } = await runProcess(
    'go',
    ['build', '-o', goCliBinaryPath, '.'],
    goServerDir,
  );
  if (code !== 0) {
    throw new Error(stderr.trim() || `go build exited with code ${code}`);
  }
  return goCliBinaryPath;
}

async function loadSharedRuleCatalog(scope: 'implemented' | 'routed'): Promise<SharedRuleCatalog> {
  let promise = sharedRuleCatalogPromises.get(scope);
  if (!promise) {
    promise = buildSharedRuleCatalog(scope);
    sharedRuleCatalogPromises.set(scope, promise);
  }
  return promise;
}

async function buildSharedRuleCatalog(scope: 'implemented' | 'routed'): Promise<SharedRuleCatalog> {
  const supportedRuleKeys =
    scope === 'implemented' ? await loadGoSupportedRuleKeys() : await loadProductRoutedRuleKeys();
  const rules = Object.entries(ruleMetas)
    .filter(([key]) => supportedRuleKeys.has(key))
    .flatMap(([key, meta]) => buildSharedRulesForMeta(key, meta))
    .sort((left, right) => {
      return left.key.localeCompare(right.key) || left.language.localeCompare(right.language);
    });

  return {
    keys: [...new Set(rules.map(rule => rule.key))].sort((left, right) =>
      left.localeCompare(right),
    ),
    rules,
  };
}

function buildSharedRulesForMeta(key: string, meta: SonarMeta): RawJsTsRuleRequest[] {
  return meta.languages.map(language => {
    const rule = {
      key,
      configurations: [] as unknown[],
      language: toProtoLanguage(language),
      fileTypeTargets: [
        meta.scope === 'Tests' ? ('FILE_TYPE_TEST' as const) : ('FILE_TYPE_MAIN' as const),
      ],
      analysisModes: ['ANALYSIS_MODE_DEFAULT'] as ['ANALYSIS_MODE_DEFAULT'],
      blacklistedExtensions:
        meta.blacklistedExtensions && meta.blacklistedExtensions.length > 0
          ? [...meta.blacklistedExtensions]
          : undefined,
    };

    applyRulingConfig(rule);

    return {
      ...rule,
      configurations: rule.configurations.map(configuration => toProtoValue(configuration)),
    };
  });
}

function toProtoLanguage(language: string): 'JS_TS_LANGUAGE_JS' | 'JS_TS_LANGUAGE_TS' {
  switch (language) {
    case 'js':
      return 'JS_TS_LANGUAGE_JS';
    case 'ts':
      return 'JS_TS_LANGUAGE_TS';
    default:
      throw new Error(`Unsupported ruling language ${language}`);
  }
}

function applyRulingConfig(rule: {
  key: string;
  language: 'JS_TS_LANGUAGE_JS' | 'JS_TS_LANGUAGE_TS';
  configurations: unknown[];
}) {
  switch (rule.key) {
    case 'S1451': {
      if (rule.language === 'JS_TS_LANGUAGE_JS') {
        rule.configurations.push({
          headerFormat: String.raw`// Copyright 20\d\d The Closure Library Authors. All Rights Reserved.`,
          isRegularExpression: true,
        });
      } else {
        rule.configurations.push({
          headerFormat: '//.*',
          isRegularExpression: true,
        });
      }
      break;
    }
    case 'S124': {
      rule.configurations.push({
        regularExpression: '.*TODO.*',
        flags: 'i',
      });
      break;
    }
    case 'S1192': {
      if (rule.language === 'JS_TS_LANGUAGE_JS') {
        rule.configurations.push({
          threshold: 4,
        });
      }
      break;
    }
  }
}

async function loadGoSupportedRuleKeys(): Promise<Set<string>> {
  if (!goSupportedRuleKeysPromise) {
    goSupportedRuleKeysPromise = (async () => {
      const [rulesSource, batchSource] = await Promise.all([
        readFile(join(goServerDir, 'rules.go'), 'utf8'),
        readFile(join(goServerDir, 'type_service_batch_rules_registration.go'), 'utf8'),
      ]);

      const keys = new Set<string>();
      for (const match of rulesSource.matchAll(/"(?<key>S\d+)"\s*:/g)) {
        if (match.groups?.key) {
          keys.add(match.groups.key);
        }
      }
      for (const match of batchSource.matchAll(/registerTypeServiceBatchRule\("(?<key>S\d+)"/g)) {
        if (match.groups?.key) {
          keys.add(match.groups.key);
        }
      }
      return keys;
    })();
  }

  return goSupportedRuleKeysPromise;
}

async function loadProductRoutedRuleKeys(): Promise<Set<string>> {
  if (!productRoutedRuleKeysPromise) {
    productRoutedRuleKeysPromise = (async () => {
      const javaSource = await readFile(
        join(
          repoRoot,
          'sonar-plugin',
          'sonar-javascript-plugin',
          'src',
          'main',
          'java',
          'org',
          'sonar',
          'plugins',
          'javascript',
          'analysis',
          'JsTsChecks.java',
        ),
        'utf8',
      );
      const routedBlockMatch = javaSource.match(/JSTS_GO_RULES\s*=\s*Set\.of\(([\s\S]*?)\n\s*\);/);
      if (!routedBlockMatch) {
        throw new Error('Could not locate JsTsChecks.JSTS_GO_RULES in JsTsChecks.java');
      }

      const keys = new Set<string>();
      for (const match of routedBlockMatch[1].matchAll(/"(?<key>S\d+)"/g)) {
        if (match.groups?.key) {
          keys.add(match.groups.key);
        }
      }
      return keys;
    })();
  }

  return productRoutedRuleKeysPromise;
}

function summarizeRuntimeRuns(runs: TimedAnalysisOutput[]): RuntimeSummary {
  const first = runs[0].analysis;
  return {
    issues: countIssues(first),
    parsingErrors: countParsingErrors(first),
    warnings: first.warnings?.length ?? 0,
    files: first.files.length,
    analysisMs: summarizeNumbers(runs.map(run => run.timings.analyzeMs)),
    wallMs: summarizeNumbers(runs.map(run => run.timings.wallMs)),
  };
}

function summarizeParity(
  node: NormalizedAnalysisOutput,
  go: NormalizedAnalysisOutput,
  topRules: number,
): ParitySummary {
  const nodeIssueCounts = countIssuesByRule(node);
  const goIssueCounts = countIssuesByRule(go);
  const ruleIds = [...new Set([...nodeIssueCounts.keys(), ...goIssueCounts.keys()])];
  const differingRules = ruleIds
    .map(ruleId => {
      const nodeCount = nodeIssueCounts.get(ruleId) ?? 0;
      const goCount = goIssueCounts.get(ruleId) ?? 0;
      return {
        ruleId,
        node: nodeCount,
        go: goCount,
        delta: goCount - nodeCount,
      };
    })
    .filter(rule => rule.delta !== 0)
    .sort(
      (left, right) =>
        Math.abs(right.delta) - Math.abs(left.delta) || left.ruleId.localeCompare(right.ruleId),
    )
    .slice(0, topRules);

  return {
    exactMatch: JSON.stringify(node) === JSON.stringify(go),
    mismatchedFiles: countMismatchedFiles(node, go),
    issues: countDelta(countIssues(node), countIssues(go)),
    parsingErrors: countDelta(countParsingErrors(node), countParsingErrors(go)),
    warnings: countDelta(node.warnings?.length ?? 0, go.warnings?.length ?? 0),
    files: countDelta(node.files.length, go.files.length),
    differingRules: differingRules.length > 0 ? differingRules : undefined,
  };
}

function countIssues(output: NormalizedAnalysisOutput): number {
  return output.files.reduce((sum, file) => sum + (file.issues?.length ?? 0), 0);
}

function countParsingErrors(output: NormalizedAnalysisOutput): number {
  return output.files.reduce((sum, file) => sum + (file.parsingErrors?.length ?? 0), 0);
}

function countIssuesByRule(output: NormalizedAnalysisOutput): Map<string, number> {
  const counts = new Map<string, number>();
  for (const file of output.files) {
    for (const issue of file.issues ?? []) {
      counts.set(issue.ruleId, (counts.get(issue.ruleId) ?? 0) + 1);
    }
  }
  return counts;
}

function countDelta(node: number, go: number): CountDelta {
  return {
    node,
    go,
    delta: go - node,
  };
}

function countMismatchedFiles(
  node: NormalizedAnalysisOutput,
  go: NormalizedAnalysisOutput,
): number {
  const nodeFiles = new Map(node.files.map(file => [file.filePath, file]));
  const goFiles = new Map(go.files.map(file => [file.filePath, file]));
  const filePaths = [...new Set([...nodeFiles.keys(), ...goFiles.keys()])];

  let mismatches = 0;
  for (const filePath of filePaths) {
    const nodeFile = nodeFiles.get(filePath);
    const goFile = goFiles.get(filePath);
    if (!nodeFile || !goFile || JSON.stringify(nodeFile) !== JSON.stringify(goFile)) {
      mismatches++;
    }
  }
  return mismatches;
}

function summarizeNumbers(values: number[]): NumericSummary {
  if (values.length === 0) {
    return {
      count: 0,
      min: 0,
      max: 0,
      mean: 0,
      median: 0,
      p95: 0,
      stddev: 0,
      total: 0,
    };
  }

  const sorted = [...values].sort((left, right) => left - right);
  const total = sorted.reduce((sum, value) => sum + value, 0);
  const mean = total / sorted.length;
  const variance =
    sorted.reduce((sum, value) => sum + (value - mean) * (value - mean), 0) / sorted.length;

  return {
    count: sorted.length,
    min: roundNumber(sorted[0]),
    max: roundNumber(sorted[sorted.length - 1]),
    mean: roundNumber(mean),
    median: roundNumber(percentile(sorted, 0.5)),
    p95: roundNumber(percentile(sorted, 0.95)),
    stddev: roundNumber(Math.sqrt(variance)),
    total: roundNumber(total),
  };
}

function percentile(sortedValues: number[], fraction: number): number {
  if (sortedValues.length === 1) {
    return sortedValues[0];
  }
  const index = Math.ceil(sortedValues.length * fraction) - 1;
  return sortedValues[Math.min(Math.max(index, 0), sortedValues.length - 1)];
}

function roundNumber(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function safeRatio(numerator: number, denominator: number): number {
  if (denominator === 0) {
    return 0;
  }
  return roundNumber(numerator / denominator);
}

function normalizeUnaryResponse(response: AnalyzeProjectUnaryResponse): NormalizedAnalysisOutput {
  const files = Object.entries(response.files ?? {})
    .map(([filePath, result]) => normalizeFileResult(filePath, result))
    .sort((left, right) => left.filePath.localeCompare(right.filePath));
  const warnings = [...(response.meta?.warnings ?? [])];

  return {
    warnings: warnings.length > 0 ? warnings : undefined,
    files,
  };
}

function normalizeFileResult(
  filePath: string,
  result: ProjectAnalysisFileResult,
): NormalizedFileResult {
  const parsingErrors = (result.parsingErrors ?? [])
    .map(normalizeParsingError)
    .sort(compareNormalizedParsingErrors);
  const issues = (result.issues ?? []).map(normalizeIssue).sort(compareNormalizedIssues);

  return {
    filePath,
    error: result.error ?? undefined,
    parsingErrors: parsingErrors.length > 0 ? parsingErrors : undefined,
    issues: issues.length > 0 ? issues : undefined,
  };
}

function normalizeParsingError(error: ParsingError): NormalizedParsingError {
  return {
    message: error.message ?? '',
    code: normalizeParsingErrorCode(error.code),
    language: normalizeAnalysisLanguage(error.language),
    line: error.line ?? undefined,
    column: error.column ?? undefined,
  };
}

function normalizeIssue(issue: Issue): NormalizedIssue {
  return {
    ruleId: issue.ruleId ?? '',
    language: normalizeAnalysisLanguage(issue.language),
    message: issue.message ?? '',
    line: issue.line ?? 0,
    column: issue.column ?? 0,
    endLine: issue.endLine ?? undefined,
    endColumn: issue.endColumn ?? undefined,
    secondaryLocations: normalizeSecondaryLocations(issue.secondaryLocations),
  };
}

function normalizeSecondaryLocations(
  locations: analyzeProjectProto.analyzeproject.v1.IIssueLocation[] | null | undefined,
): NormalizedIssueLocation[] | undefined {
  if (!locations || locations.length === 0) {
    return undefined;
  }
  return locations.map(location => ({
    line: location.line ?? undefined,
    column: location.column ?? undefined,
    endLine: location.endLine ?? undefined,
    endColumn: location.endColumn ?? undefined,
    message: location.message ?? undefined,
  }));
}

function compareNormalizedParsingErrors(
  left: NormalizedParsingError,
  right: NormalizedParsingError,
): number {
  return (
    left.code.localeCompare(right.code) ||
    compareOptionalNumber(left.line, right.line) ||
    compareOptionalNumber(left.column, right.column) ||
    left.language.localeCompare(right.language) ||
    left.message.localeCompare(right.message)
  );
}

function compareNormalizedIssues(left: NormalizedIssue, right: NormalizedIssue): number {
  return (
    left.ruleId.localeCompare(right.ruleId) ||
    compareOptionalNumber(left.line, right.line) ||
    compareOptionalNumber(left.column, right.column) ||
    compareOptionalNumber(left.endLine, right.endLine) ||
    compareOptionalNumber(left.endColumn, right.endColumn) ||
    left.language.localeCompare(right.language) ||
    left.message.localeCompare(right.message)
  );
}

function compareOptionalNumber(left?: number, right?: number): number {
  if (left == null && right == null) {
    return 0;
  }
  if (left == null) {
    return -1;
  }
  if (right == null) {
    return 1;
  }
  return left - right;
}

function normalizeAnalysisLanguage(
  language: analyzeProjectProto.analyzeproject.v1.AnalysisLanguage | null | undefined,
): string {
  switch (language) {
    case AnalysisLanguage.ANALYSIS_LANGUAGE_JS:
      return 'js';
    case AnalysisLanguage.ANALYSIS_LANGUAGE_TS:
      return 'ts';
    case AnalysisLanguage.ANALYSIS_LANGUAGE_CSS:
      return 'css';
    default:
      return 'ANALYSIS_LANGUAGE_UNSPECIFIED';
  }
}

function normalizeParsingErrorCode(
  code: analyzeProjectProto.analyzeproject.v1.ParsingErrorCode | null | undefined,
): string {
  switch (code) {
    case ParsingErrorCode.PARSING_ERROR_CODE_PARSING:
      return 'PARSING';
    case ParsingErrorCode.PARSING_ERROR_CODE_FAILING_TYPESCRIPT:
      return 'FAILING_TYPESCRIPT';
    case ParsingErrorCode.PARSING_ERROR_CODE_LINTER_INITIALIZATION:
      return 'LINTER_INITIALIZATION';
    default:
      return 'UNSPECIFIED';
  }
}

function toProtoValue(value: unknown): Record<string, unknown> {
  if (value === null) {
    return { nullValue: 0 };
  }
  if (typeof value === 'number') {
    return { numberValue: value };
  }
  if (typeof value === 'string') {
    return { stringValue: value };
  }
  if (typeof value === 'boolean') {
    return { boolValue: value };
  }
  if (Array.isArray(value)) {
    return {
      listValue: {
        values: value.map(entry => toProtoValue(entry)),
      },
    };
  }
  if (isRecord(value)) {
    return {
      structValue: {
        fields: Object.fromEntries(
          Object.entries(value).map(([key, entry]) => [key, toProtoValue(entry)]),
        ),
      },
    };
  }
  return { nullValue: 0 };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parsePositiveInteger(value: string, flagName: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${flagName} must be a positive integer.`);
  }
  return parsed;
}

function parseNonNegativeInteger(value: string, flagName: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${flagName} must be a non-negative integer.`);
  }
  return parsed;
}

function parseBooleanOption(value: string, flagName: string): boolean {
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  throw new Error(`${flagName} must be either "true" or "false".`);
}

function parseScope(value: string): 'implemented' | 'routed' {
  if (value === 'implemented' || value === 'routed') {
    return value;
  }
  throw new Error('--scope must be either "routed" or "implemented".');
}

function printJSON(value: unknown, pretty: boolean) {
  console.log(JSON.stringify(value, null, pretty ? 2 : 0));
}

async function withNodeAnalysisLogsOnStderr<T>(run: () => Promise<T>): Promise<T> {
  const originalLog = console.log;
  console.log = (...args: unknown[]) => {
    console.error(...args);
  };
  try {
    return await run();
  } finally {
    console.log = originalLog;
  }
}

async function runProcess(command: string, args: string[], cwd: string) {
  return await new Promise<{ code: number | null; stdout: string; stderr: string }>(
    (resolvePromise, reject) => {
      const child = spawn(command, args, {
        cwd,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', chunk => {
        stdout += chunk.toString();
      });
      child.stderr.on('data', chunk => {
        stderr += chunk.toString();
      });
      child.on('error', reject);
      child.on('close', code => {
        resolvePromise({ code, stdout, stderr });
      });
    },
  );
}

function printUsage() {
  console.log(`Usage:
  tsx tools/jsts-go-benchmark.ts list
  tsx tools/jsts-go-benchmark.ts benchmark --project <name> [--project <name> ...]
  tsx tools/jsts-go-benchmark.ts benchmark --all

Benchmark options:
  --project    Benchmark dataset name from packages/ruling/projects.json (repeatable)
  --all        Benchmark every dataset listed in packages/ruling/projects.json
  --iterations Number of measured runs per project (default: 3)
  --warmup     Number of warmup runs per project (default: 1)
  --top-rules  Max number of secondary per-rule issue-count diffs to report (default: 20)
  --scope      Shared-rule scope: routed or implemented (default: routed)
  --pretty     Pretty-print JSON output (default: true)
`);
}

main().catch(error => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
