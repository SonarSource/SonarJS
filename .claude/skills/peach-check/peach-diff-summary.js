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

const SONARJS_RULE_REPOSITORIES = new Set(['javascript', 'typescript', 'css', 'Web', 'web', 'yaml']);

export async function runDiffSummary(options, runtime = {}) {
  const readFileSync = runtime.readFileSync ?? fs.readFileSync;
  const writeFileSync = runtime.writeFileSync ?? fs.writeFileSync;

  if (!options.aggregatedSarifPath) {
    throw new Error('aggregatedSarifPath is required');
  }
  if (!options.outputPath) {
    throw new Error('outputPath is required');
  }

  const sarif = JSON.parse(readFileSync(options.aggregatedSarifPath, 'utf-8'));
  const runs = Array.isArray(sarif.runs) ? sarif.runs : [];
  const rawProjectSummaries = runs
    .map(run => summarizeProjectRun(run))
    .filter(summary => summary.projectKey !== undefined && summary.totalResults > 0)
    .sort(compareProjectSummaries);
  const allResults = rawProjectSummaries.flatMap(summary => summary.results);
  const sonarjsResults = allResults.filter(isSonarjsResult);
  const nonSonarjsResults = allResults.filter(result => !isSonarjsResult(result));
  const projectSummaries = rawProjectSummaries.map(summary => ({
      project_key: summary.projectKey,
      new_issues: summary.newIssues,
      absent_issues: summary.absentIssues,
      new_issues_on_unchanged_files: summary.newIssuesOnUnchangedFiles,
      absent_issues_on_unchanged_files: summary.absentIssuesOnUnchangedFiles,
      new_by_rule: summary.newByRule,
      absent_by_rule: summary.absentByRule,
      new_file_status_counts: summary.newFileStatusCounts,
      absent_file_status_counts: summary.absentFileStatusCounts,
      non_sonarjs_results: summary.nonSonarjsResults,
      non_sonarjs_by_rule_repository: summary.nonSonarjsByRuleRepository,
    }));
  const changedProjectsFromLog = options.diffAppLogPath
    ? parseChangedProjectsFromLog(readFileSync(options.diffAppLogPath, 'utf-8'))
    : [];

  const report = {
    aggregated_sarif_path: options.aggregatedSarifPath,
    diff_app_log_path: options.diffAppLogPath,
    changed_projects_from_log: changedProjectsFromLog,
    changed_projects_total_from_log: changedProjectsFromLog.length,
    rule_repositories: countByObject(allResults, result => getRuleRepository(result.ruleId)),
    sonarjs_summary: {
      projects_with_changes: countProjects(rawProjectSummaries, summary => summary.newIssues + summary.absentIssues > 0),
      projects_with_new_issues: countProjects(rawProjectSummaries, summary => summary.newIssues > 0),
      projects_with_absent_issues: countProjects(rawProjectSummaries, summary => summary.absentIssues > 0),
      new_issues: countByState(sonarjsResults, 'new'),
      absent_issues: countByState(sonarjsResults, 'absent'),
      new_issues_on_unchanged_files: countByStateAndFileStatus(sonarjsResults, 'new', 'UNCHANGED'),
      absent_issues_on_unchanged_files: countByStateAndFileStatus(sonarjsResults, 'absent', 'UNCHANGED'),
      new_by_rule: countByObject(
        sonarjsResults.filter(result => getBaselineState(result) === 'new'),
        result => result.ruleId ?? 'unknown',
      ),
      absent_by_rule: countByObject(
        sonarjsResults.filter(result => getBaselineState(result) === 'absent'),
        result => result.ruleId ?? 'unknown',
      ),
      new_file_status_counts: countByObject(
        sonarjsResults.filter(result => getBaselineState(result) === 'new'),
        result => getFileStatus(result),
      ),
      absent_file_status_counts: countByObject(
        sonarjsResults.filter(result => getBaselineState(result) === 'absent'),
        result => getFileStatus(result),
      ),
    },
    non_sonarjs_summary: {
      projects_with_changes: countProjects(rawProjectSummaries, summary => summary.nonSonarjsResults > 0),
      results: nonSonarjsResults.length,
      by_rule_repository: countByObject(nonSonarjsResults, result => getRuleRepository(result.ruleId)),
    },
    projects: projectSummaries,
  };

  writeFileSync(options.outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf-8');
  return report;
}

function summarizeProjectRun(run) {
  const projectKey = readProjectKey(run);
  const results = Array.isArray(run?.results) ? run.results : [];
  const sonarjsResults = results.filter(isSonarjsResult);
  const nonSonarjsResults = results.filter(result => !isSonarjsResult(result));

  return {
    projectKey,
    totalResults: results.length,
    results,
    newIssues: countByState(sonarjsResults, 'new'),
    absentIssues: countByState(sonarjsResults, 'absent'),
    newIssuesOnUnchangedFiles: countByStateAndFileStatus(sonarjsResults, 'new', 'UNCHANGED'),
    absentIssuesOnUnchangedFiles: countByStateAndFileStatus(sonarjsResults, 'absent', 'UNCHANGED'),
    newByRule: countByObject(
      sonarjsResults.filter(result => getBaselineState(result) === 'new'),
      result => result.ruleId ?? 'unknown',
    ),
    absentByRule: countByObject(
      sonarjsResults.filter(result => getBaselineState(result) === 'absent'),
      result => result.ruleId ?? 'unknown',
    ),
    newFileStatusCounts: countByObject(
      sonarjsResults.filter(result => getBaselineState(result) === 'new'),
      result => getFileStatus(result),
    ),
    absentFileStatusCounts: countByObject(
      sonarjsResults.filter(result => getBaselineState(result) === 'absent'),
      result => getFileStatus(result),
    ),
    nonSonarjsResults: nonSonarjsResults.length,
    nonSonarjsByRuleRepository: countByObject(
      nonSonarjsResults,
      result => getRuleRepository(result.ruleId),
    ),
  };
}

function compareProjectSummaries(left, right) {
  const leftSonarjsChanges = left.newIssues + left.absentIssues;
  const rightSonarjsChanges = right.newIssues + right.absentIssues;
  if (rightSonarjsChanges !== leftSonarjsChanges) {
    return rightSonarjsChanges - leftSonarjsChanges;
  }

  if (right.nonSonarjsResults !== left.nonSonarjsResults) {
    return right.nonSonarjsResults - left.nonSonarjsResults;
  }

  return String(left.projectKey).localeCompare(String(right.projectKey));
}

function countProjects(projectSummaries, predicate) {
  return projectSummaries.filter(predicate).length;
}

function countByState(results, state) {
  return results.filter(result => getBaselineState(result) === state).length;
}

function countByStateAndFileStatus(results, state, fileStatus) {
  return results.filter(
    result => getBaselineState(result) === state && getFileStatus(result) === fileStatus,
  ).length;
}

function countByObject(items, keySelector) {
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

function parseChangedProjectsFromLog(logContent) {
  const matches = Array.from(
    logContent.matchAll(/The difference is found for projects:\s*([^\n\r]+)/gu),
    match => match[1],
  );
  const projectList = matches.at(-1);
  if (!projectList) {
    return [];
  }

  return projectList
    .split(',')
    .map(project => project.trim())
    .filter(project => project.length > 0);
}

function readProjectKey(run) {
  if (typeof run?.properties?.project === 'string' && run.properties.project.length > 0) {
    return run.properties.project;
  }

  return undefined;
}

function isSonarjsResult(result) {
  return SONARJS_RULE_REPOSITORIES.has(getRuleRepository(result.ruleId));
}

function getRuleRepository(ruleId) {
  if (typeof ruleId !== 'string' || ruleId.length === 0) {
    return 'unknown';
  }

  const separatorIndex = ruleId.indexOf(':');
  if (separatorIndex === -1) {
    return ruleId;
  }

  return ruleId.slice(0, separatorIndex);
}

function getBaselineState(result) {
  return typeof result?.baselineState === 'string' && result.baselineState.length > 0
    ? result.baselineState
    : 'unspecified';
}

function getFileStatus(result) {
  return typeof result?.properties?.fileStatus === 'string' && result.properties.fileStatus.length > 0
    ? result.properties.fileStatus
    : 'UNKNOWN';
}

export async function main(argv = process.argv.slice(2), runtime = {}) {
  if (argv.length < 2 || argv.length > 3) {
    throw new Error(
      'Usage: node .claude/skills/peach-check/peach-diff-summary.js <aggregated-sarif.json> <output.json> [diff-app.log]',
    );
  }

  const [aggregatedSarifPath, outputPath, diffAppLogPath] = argv;
  const log = runtime.log ?? (message => console.error(message));
  const runDiffSummaryFn = runtime.runDiffSummary ?? runDiffSummary;

  log(`peach-diff-summary: starting ${aggregatedSarifPath} -> ${outputPath}`);
  await runDiffSummaryFn(
    {
      aggregatedSarifPath,
      outputPath,
      diffAppLogPath,
    },
    runtime,
  );
  log(`peach-diff-summary: wrote ${outputPath}`);
}

const entrypoint = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === entrypoint) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
