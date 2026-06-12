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

const DEFAULT_TEST_FILE_EXTENSIONS = ['js', 'mjs', 'cjs', 'jsx', 'vue', 'ts', 'mts', 'cts', 'tsx'];
const SUPPORTED_RULE_PREFIXES = ['javascript:', 'typescript:', 'css:', 'web:', 'yaml:'];
const TEST_ONLY_RULES = new Set([
  'javascript:S1607',
  'javascript:S2187',
  'javascript:S2699',
  'javascript:S5914',
  'javascript:S6426',
  'typescript:S1607',
  'typescript:S2187',
  'typescript:S2699',
  'typescript:S5914',
  'typescript:S6426',
]);

// This is a conservative triage heuristic, not an exhaustive test-file detector.
// Keep the pattern intentionally narrow; if a project does not clearly match,
// fall back to UNCLASSIFIED_DROP rather than growing this into a broad classifier.
const TEST_RELATED_PATH_PATTERN = new RegExp(
  String.raw`\.(?:test|spec|cy)\.(?:${DEFAULT_TEST_FILE_EXTENSIONS.join('|')})$|\.(?:e2e|mock)\.(?:${DEFAULT_TEST_FILE_EXTENSIONS.join('|')})$|(?:^|[\\/])(?:__tests__|__mocks__)[\\/]`,
);

export async function runDropForensics(options, runtime = {}) {
  const readFileSync = runtime.readFileSync ?? fs.readFileSync;
  const writeFileSync = runtime.writeFileSync ?? fs.writeFileSync;
  const existsSync = runtime.existsSync ?? fs.existsSync;
  const execFileSync = runtime.execFileSync ?? nodeExecFileSync;

  if (!options.projectKey) {
    throw new Error('projectKey is required');
  }
  if (!options.sourceJobName) {
    throw new Error('sourceJobName is required');
  }
  if (!options.peacheeRoot) {
    throw new Error('peacheeRoot is required');
  }
  if (!options.outputPath) {
    throw new Error('outputPath is required');
  }
  if (!options.sarifPaths || options.sarifPaths.length === 0) {
    throw new Error('At least one SARIF path is required');
  }

  const projectMetadata = resolveProjectMetadata(options, {
    readFileSync,
    existsSync,
    execFileSync,
  });

  const candidates = options.sarifPaths.map(sarifPath =>
    summarizeSarifCandidate(sarifPath, options.projectKey, readFileSync),
  );
  const selectedCandidate =
    candidates.find(candidate => candidate.projectMatched && candidate.supportedResultCount > 0) ??
    candidates.find(candidate => candidate.projectMatched) ??
    candidates[0];

  const report = {
    project_key: options.projectKey,
    source_job_name: options.sourceJobName,
    source_head_sha: options.sourceHeadSha,
    project_metadata: {
      project_dir: projectMetadata.projectDir,
      has_sonar_tests: projectMetadata.hasSonarTests,
      sonar_sources: projectMetadata.sonarSources,
      sonar_tests: projectMetadata.sonarTests,
      resolved: projectMetadata.resolved,
      resolution_status: projectMetadata.resolutionStatus,
      resolution_error: projectMetadata.resolutionError,
    },
    selected_sarif_path: selectedCandidate.sarifPath,
    sarif_candidates: candidates.map(candidate => ({
      sarif_path: candidate.sarifPath,
      project_matched: candidate.projectMatched,
      result_count: candidate.resultCount,
      supported_result_count: candidate.supportedResultCount,
    })),
    counts_by_baseline_state: selectedCandidate.countsByBaselineState,
    test_like_counts_by_baseline_state: selectedCandidate.testLikeCountsByBaselineState,
    non_test_like_counts_by_baseline_state: selectedCandidate.nonTestLikeCountsByBaselineState,
    top_rules_by_baseline_state: selectedCandidate.topRulesByBaselineState,
    top_paths_by_baseline_state: selectedCandidate.topPathsByBaselineState,
    diagnosis: diagnoseDrop(selectedCandidate, projectMetadata),
  };

  writeFileSync(options.outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf-8');
  return report;
}

function summarizeSarifCandidate(sarifPath, projectKey, readFileSync) {
  const sarif = JSON.parse(readFileSync(sarifPath, 'utf-8'));
  const runs = Array.isArray(sarif.runs) ? sarif.runs : [];
  const run = runs.find(candidate => candidate?.properties?.project === projectKey);
  const results = Array.isArray(run?.results) ? run.results : [];
  const supportedResults = results.filter(result => isSupportedResult(result));

  return {
    sarifPath,
    projectMatched: run !== undefined,
    resultCount: results.length,
    supportedResultCount: supportedResults.length,
    countsByBaselineState: countBy(supportedResults, result => normalizeBaselineState(result.baselineState)),
    testLikeCountsByBaselineState: countBy(
      supportedResults.filter(result => isTestLikeResult(result)),
      result => normalizeBaselineState(result.baselineState),
    ),
    nonTestLikeCountsByBaselineState: countBy(
      supportedResults.filter(result => !isTestLikeResult(result)),
      result => normalizeBaselineState(result.baselineState),
    ),
    newRuleIds: collectRuleIdsByBaselineState(supportedResults, 'new'),
    topRulesByBaselineState: summarizeTopRulesByState(supportedResults),
    topPathsByBaselineState: summarizeTopPathsByState(supportedResults),
  };
}

function diagnoseDrop(candidate, projectMetadata) {
  if (!candidate.projectMatched) {
    return {
      id: 'PROJECT_NOT_FOUND_IN_SARIF',
      confidence: 'high',
      reasons: ['The selected SARIF candidates do not contain a run for this project.'],
    };
  }

  if (candidate.resultCount === 0) {
    return {
      id: 'NO_PROJECT_DIFFS',
      confidence: 'high',
      reasons: ['The selected SARIF run contains no differential-validation results for this project.'],
    };
  }

  if (candidate.supportedResultCount === 0) {
    return {
      id: 'UNCLASSIFIED_DROP',
      confidence: 'low',
      reasons: [
        'The selected SARIF run has no supported-language differential results for this project, so it may not explain the DROP.',
      ],
    };
  }

  const onlyTestLikePaths = Object.keys(candidate.nonTestLikeCountsByBaselineState).length === 0;
  const newRuleIds = candidate.newRuleIds;
  const onlyTestRuleAdditions =
    newRuleIds.length === 0 || newRuleIds.every(ruleId => TEST_ONLY_RULES.has(ruleId));

  if (!projectMetadata.resolved) {
    return {
      id: 'UNCLASSIFIED_DROP',
      confidence: 'low',
      reasons: [
        onlyTestLikePaths && onlyTestRuleAdditions
          ? `${projectMetadata.resolutionError ?? 'Project metadata could not be read for this run'}, so test-scope reclassification cannot be confirmed.`
          : (projectMetadata.resolutionError ?? 'Project metadata could not be read for this run.'),
      ],
    };
  }

  if (!projectMetadata.hasSonarTests && onlyTestLikePaths && onlyTestRuleAdditions) {
    return {
      id: 'LIKELY_TEST_SCOPE_RECLASSIFICATION',
      confidence: 'high',
      reasons: [
        'Project does not configure sonar.tests.',
        'All differential-validation results are on test-like paths.',
        'New issues, if any, are limited to test-focused rules.',
      ],
    };
  }

  return {
    id: 'UNCLASSIFIED_DROP',
    confidence: 'low',
    reasons: ['The differential-validation summary does not match any known DROP diagnosis.'],
  };
}

function summarizeTopRulesByState(results) {
  return summarizeByBaselineState(results, result => result.ruleId ?? 'unknown', 'rule_id');
}

function collectRuleIdsByBaselineState(results, baselineState) {
  return Array.from(
    new Set(
      results
        .filter(result => normalizeBaselineState(result.baselineState) === baselineState)
        .map(result => result.ruleId ?? 'unknown'),
    ),
  ).sort();
}

function summarizeTopPathsByState(results) {
  const grouped = new Map();

  for (const result of results) {
    const state = normalizeBaselineState(result.baselineState);
    const pathKey = getResultPath(result) ?? 'unknown';
    const stateGroups = grouped.get(state) ?? new Map();
    const summary = stateGroups.get(pathKey) ?? {
      count: 0,
      rules: new Map(),
    };

    summary.count += 1;
    const ruleId = result.ruleId ?? 'unknown';
    summary.rules.set(ruleId, (summary.rules.get(ruleId) ?? 0) + 1);
    stateGroups.set(pathKey, summary);
    grouped.set(state, stateGroups);
  }

  return Object.fromEntries(
    Array.from(grouped.entries(), ([state, stateGroups]) => [
      state,
      Array.from(stateGroups.entries())
        .map(([pathKey, summary]) => ({
          path: pathKey,
          count: summary.count,
          rules: sortCountEntries(summary.rules, 'rule_id'),
        }))
        .sort(compareCountEntries)
        .slice(0, 10),
    ]),
  );
}

function summarizeByBaselineState(results, keySelector, propertyName) {
  const grouped = new Map();

  for (const result of results) {
    const state = normalizeBaselineState(result.baselineState);
    const stateGroups = grouped.get(state) ?? new Map();
    const key = keySelector(result);
    stateGroups.set(key, (stateGroups.get(key) ?? 0) + 1);
    grouped.set(state, stateGroups);
  }

  return Object.fromEntries(
    Array.from(grouped.entries(), ([state, stateGroups]) => [
      state,
      sortCountEntries(stateGroups, propertyName),
    ]),
  );
}

function sortCountEntries(counts, propertyName) {
  return Array.from(counts.entries())
    .map(([value, count]) => ({
      [propertyName]: value,
      count,
    }))
    .sort(compareCountEntries)
    .slice(0, 10);
}

function compareCountEntries(left, right) {
  if (right.count !== left.count) {
    return right.count - left.count;
  }

  const leftKey = left.rule_id ?? left.path ?? '';
  const rightKey = right.rule_id ?? right.path ?? '';
  return String(leftKey).localeCompare(String(rightKey));
}

function countBy(items, keySelector) {
  const counts = new Map();

  for (const item of items) {
    const key = keySelector(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Object.fromEntries(
    Array.from(counts.entries()).sort(([leftKey], [rightKey]) =>
      String(leftKey).localeCompare(String(rightKey)),
    ),
  );
}

function isTestLikeResult(result) {
  const resultPath = getResultPath(result);
  return resultPath !== undefined && TEST_RELATED_PATH_PATTERN.test(resultPath);
}

function isSupportedResult(result) {
  const ruleId = result?.ruleId;
  return typeof ruleId === 'string' && SUPPORTED_RULE_PREFIXES.some(prefix => ruleId.startsWith(prefix));
}

function getResultPath(result) {
  return result?.locations?.[0]?.physicalLocation?.artifactLocation?.uri;
}

function normalizeBaselineState(baselineState) {
  return typeof baselineState === 'string' && baselineState.length > 0
    ? baselineState
    : 'unspecified';
}

function resolveProjectMetadata(options, runtime) {
  if (options.projectMetadata) {
    return {
      projectKey: options.projectKey,
      projectDir: options.projectMetadata.projectDir ?? options.sourceJobName,
      hasSonarTests: options.projectMetadata.hasSonarTests ?? false,
      sonarSources: options.projectMetadata.sonarSources ?? [],
      sonarTests: options.projectMetadata.sonarTests ?? [],
      resolved: true,
      resolutionStatus: 'resolved',
      resolutionError: undefined,
    };
  }

  if (options.sourceHeadSha && !isCommitAvailable(options.peacheeRoot, options.sourceHeadSha, runtime.execFileSync)) {
    return {
      projectKey: options.projectKey,
      projectDir: options.sourceJobName,
      hasSonarTests: false,
      sonarSources: [],
      sonarTests: [],
      resolved: false,
      resolutionStatus: 'source_head_sha_unavailable',
      resolutionError:
        `Requested source-head-sha ${options.sourceHeadSha} is not available in ${options.peacheeRoot}. Review manually after fetching that commit.`,
    };
  }

  const propertiesContent = readProjectPropertiesForJob(
    options.peacheeRoot,
    options.sourceJobName,
    options.sourceHeadSha,
    runtime,
  );

  if (propertiesContent) {
    return {
      ...parseProjectProperties(propertiesContent, options.sourceJobName),
      resolved: true,
      resolutionStatus: 'resolved',
      resolutionError: undefined,
    };
  }

  return {
    projectKey: options.projectKey,
    projectDir: options.sourceJobName,
    hasSonarTests: false,
    sonarSources: [],
    sonarTests: [],
    resolved: false,
    resolutionStatus: 'missing_project_properties',
    resolutionError: options.sourceHeadSha
      ? `Missing sonar-project.properties at ${options.sourceHeadSha}`
      : 'Missing sonar-project.properties',
  };
}

function isCommitAvailable(peacheeRoot, headSha, execFileSync) {
  try {
    execFileSync('git', ['rev-parse', '--verify', '--quiet', `${headSha}^{commit}`], {
      cwd: peacheeRoot,
      encoding: 'utf-8',
    });
    return true;
  } catch {
    return false;
  }
}

function parseCliArgs(argv) {
  const positional = [];
  let sourceHeadSha;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '--source-head-sha') {
      index += 1;
      if (index >= argv.length) {
        throw new Error('--source-head-sha requires a value');
      }
      sourceHeadSha = argv[index];
      continue;
    }

    if (argument.startsWith('--source-head-sha=')) {
      sourceHeadSha = argument.slice('--source-head-sha='.length);
      continue;
    }

    positional.push(argument);
  }

  return {
    positional,
    sourceHeadSha,
  };
}

export async function main(argv = process.argv.slice(2), runtime = {}) {
  const { positional, sourceHeadSha } = parseCliArgs(argv);

  if (positional.length < 5) {
    throw new Error(
      'Usage: node .claude/skills/peach-check/peach-drop-forensics.js [--source-head-sha <sha>] <project-key> <source-job-name> <peachee-root> <output.json> <sarif.json> [sarif.json ...]',
    );
  }

  const [projectKey, sourceJobName, peacheeRoot, outputPath, ...sarifPaths] = positional;
  await runDropForensics(
    {
      projectKey,
      sourceJobName,
      peacheeRoot,
      outputPath,
      sarifPaths,
      sourceHeadSha,
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
