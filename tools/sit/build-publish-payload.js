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
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import {
  appendGithubOutput,
  isMain,
  parseOptionArgs,
  readJsonFile,
  requireOption,
  resolvePathUnder,
  writeJsonFile,
} from './common.js';

export const COMMENT_MARKER = '<!-- sit-pr-fps-summary -->';

export function formatRate(value) {
  if (value === null || value === undefined) {
    return 'n/a';
  }
  return `${Number(value).toFixed(1)}%`;
}

export function formatCount(value) {
  if (value === null || value === undefined) {
    return 'n/a';
  }
  return String(value);
}

export function sanitizeClusterName(value) {
  return String(value || '(unnamed cluster)')
    .replaceAll('|', '\\|')
    .replaceAll('\n', ' ')
    .trim();
}

export function resolveWorkflowOutcome(hasRules, sitResult, diffsitResult, fpsResult) {
  if (!hasRules) {
    return {
      state: 'success',
      description: 'No supported SonarJS rule changes detected',
      workflowStatus: 'Skipped (no changed supported rules)',
    };
  }
  if (sitResult !== 'success') {
    return { state: 'failure', description: 'SIT export failed', workflowStatus: 'Failed' };
  }
  if (diffsitResult !== 'success') {
    return { state: 'failure', description: 'DiffSIT failed', workflowStatus: 'Failed' };
  }
  if (fpsResult !== 'success') {
    return {
      state: 'failure',
      description: 'FPS failed for one or more rules',
      workflowStatus: 'Failed',
    };
  }
  return {
    state: 'success',
    description: 'SIT/FPS/DiffSIT completed successfully',
    workflowStatus: 'Success',
  };
}

export function buildCommentLines(context, workflowStatus) {
  const lines = [
    COMMENT_MARKER,
    '',
    '## SIT/FPS PR Automation',
    '',
    `- Status: **${workflowStatus}**`,
    `- Workflow run: ${context.runUrl}`,
    `- Plugin version: \`${context.pluginVersion || 'n/a'}\``,
    `- Languages: \`${context.languages.length > 0 ? context.languages.join(', ') : 'none'}\``,
    `- Changed rules: \`${context.fullRuleKeys.length > 0 ? context.fullRuleKeys.join(', ') : 'none'}\``,
  ];

  if (context.hasRules) {
    lines.push(
      `- SIT artifacts: ${[
        renderArtifactLink('sit-export-target', context.artifactLinks),
        renderArtifactLink('sit-export-baseline', context.artifactLinks),
      ].join(', ')}`,
      `- FPS artifacts: ${[
        renderArtifactLink('fps-reports', context.artifactLinks),
        renderArtifactLink('fps-run-summary', context.artifactLinks),
      ].join(', ')}`,
      `- DiffSIT artifacts: ${[
        renderArtifactLink('diffsit-reports', context.artifactLinks),
        renderArtifactLink('diffsit-run-summary', context.artifactLinks),
      ].join(', ')}`,
    );
  } else {
    lines.push('- SIT artifacts: `not produced`');
    lines.push('- FPS artifacts: `not produced`');
    lines.push('- DiffSIT artifacts: `not produced`');
  }

  if (context.fpsSummary?.results?.length > 0) {
    lines.push(...renderRuleSections(context.fpsSummary.results));
  }
  if (context.diffsitSummary?.overall) {
    lines.push(...renderDiffsitSummary(context.diffsitSummary));
  }
  return lines;
}

function renderRuleSections(results) {
  const lines = ['', '### FPS per rule', ''];
  for (const result of [...results].sort((a, b) =>
    String(a.rule_key ?? '').localeCompare(String(b.rule_key ?? '')),
  )) {
    const ruleKey = result.rule_key ?? 'unknown';
    const status = result.status ?? 'unknown';
    const issuesAnalyzed = formatCount(result.issues_analyzed);
    const fpRate = formatRate(result.false_positive_rate);
    lines.push(
      `#### \`${ruleKey}\` - \`${status}\` - ${issuesAnalyzed} issues - FP rate ${fpRate}`,
      '',
    );

    const clusters = result.clusters ?? [];
    if (clusters.length === 0) {
      lines.push('No cluster data (FPS failed or report missing).', '');
      continue;
    }

    lines.push('| Cluster | Issues | FP |', '|:--------|-------:|---:|');
    let totalIssues = 0;
    for (const cluster of [...clusters].sort(
      (a, b) => Number(b.cluster_fp_rate ?? 0) - Number(a.cluster_fp_rate ?? 0),
    )) {
      const issueCount = cluster.issue_count;
      if (issueCount !== null && issueCount !== undefined) {
        totalIssues += Number(issueCount);
      }
      lines.push(
        `| ${sanitizeClusterName(cluster.cluster_name)} | ${formatCount(issueCount)} | ${formatRate(
          cluster.cluster_fp_rate,
        )} |`,
      );
    }
    lines.push(`| **Total** | **${totalIssues}** | **${fpRate}** |`, '');
  }
  return lines;
}

function renderDiffsitSummary(summary) {
  const overall = summary.overall ?? {};
  return [
    '',
    '### DiffSIT summary',
    '',
    '| Projects | Base issues | Target issues | New | Changed | Message changes | Secondary changes | Removed | Unchanged |',
    '|---------:|------------:|--------------:|----:|--------:|----------------:|------------------:|--------:|----------:|',
    `| ${formatCount(overall.projects)} | ${formatCount(overall.base_count)} | ${formatCount(
      overall.target_count,
    )} | ${formatCount(overall.new)} | ${formatCount(overall.changed)} | ${formatCount(
      overall.message_changes,
    )} | ${formatCount(overall.secondary_changes)} | ${formatCount(overall.removed)} | ${formatCount(
      overall.unchanged,
    )} |`,
    '',
  ];
}

export function buildRuleStatuses(results, targetUrl) {
  const statuses = [];
  for (const result of results) {
    const ruleKey = result.rule_key;
    if (!ruleKey) {
      continue;
    }
    const state = result.status === 'success' ? 'success' : 'failure';
    const metrics = [];
    if (result.issues_analyzed !== null && result.issues_analyzed !== undefined) {
      metrics.push(`issues=${result.issues_analyzed}`);
    }
    if (result.false_positive_rate !== null && result.false_positive_rate !== undefined) {
      metrics.push(`fp=${Number(result.false_positive_rate).toFixed(1)}%`);
    }
    if (result.cluster_count !== null && result.cluster_count !== undefined) {
      metrics.push(`clusters=${result.cluster_count}`);
    }
    const statusWord = state === 'success' ? 'success' : 'failed';
    const description = truncateDescription(
      `FPS ${statusWord}${metrics.length > 0 ? ` (${metrics.join(', ')})` : ''}`,
    );
    statuses.push({
      context: `sit-fps/${ruleKey}`,
      state,
      description,
      target_url: targetUrl,
    });
  }
  return statuses;
}

export async function loadArtifactLinks(artifactsJsonPath, repository, runId) {
  if (!(await exists(artifactsJsonPath))) {
    return {};
  }
  let payload;
  try {
    payload = await readJsonFile(artifactsJsonPath, 'artifacts JSON');
  } catch {
    return {};
  }

  const links = {};
  for (const artifact of payload.artifacts ?? []) {
    if (artifact.id === undefined || !artifact.name) {
      continue;
    }
    links[artifact.name] =
      `https://github.com/${repository}/actions/runs/${runId}/artifacts/${artifact.id}`;
  }
  return links;
}

function renderArtifactLink(artifactName, artifactLinks) {
  const artifactLink = artifactLinks[artifactName];
  if (!artifactLink) {
    return `\`${artifactName}\` (artifact not found)`;
  }
  return `[\`${artifactName}\`](${artifactLink})`;
}

export async function buildPublishPayload(args, appendOutput = appendGithubOutput) {
  const rules = loadRules(args.rulesJson);
  const fpsSummary = await loadOptionalJson(args.fpsSummaryPath);
  const diffsitSummary = await loadOptionalJson(args.diffsitSummaryPath);
  const artifactLinks = await loadArtifactLinks(
    args.artifactsJsonPath,
    args.repository,
    args.runId,
  );
  const context = {
    rules,
    hasRules: rules.length > 0,
    languages: deriveLanguages(rules),
    fullRuleKeys: deriveFullRuleKeys(rules),
    sitResult: args.sitResult || 'skipped',
    diffsitResult: args.diffsitResult || 'skipped',
    fpsResult: args.fpsResult || 'skipped',
    pluginVersion: args.pluginVersion || 'n/a',
    runUrl: args.runUrl,
    fpsSummary,
    diffsitSummary,
    artifactLinks,
  };
  const outcome = resolveWorkflowOutcome(
    context.hasRules,
    context.sitResult,
    context.diffsitResult,
    context.fpsResult,
  );
  await writeComment(args.commentPath, buildCommentLines(context, outcome.workflowStatus));
  await writeJsonFile(
    args.ruleStatusesPath,
    fpsSummary?.results ? buildRuleStatuses(fpsSummary.results, args.runUrl) : [],
  );
  await appendOutput('state', outcome.state);
  await appendOutput('description', outcome.description);
  return { outcome, context };
}

function loadRules(rulesJson) {
  const rawRules = JSON.parse(rulesJson || '[]');
  if (!Array.isArray(rawRules)) {
    throw new Error('rules JSON must be an array');
  }
  return rawRules.map(rule => ({
    repository: String(rule.repository).toLowerCase(),
    language: String(rule.language).toLowerCase(),
    ruleKey: String(rule.ruleKey ?? rule.rule_key).toUpperCase(),
  }));
}

function deriveLanguages(rules) {
  return [...new Set(rules.map(rule => rule.language))].sort();
}

function deriveFullRuleKeys(rules) {
  return [...new Set(rules.map(rule => `${rule.repository}:${rule.ruleKey}`))].sort();
}

async function writeComment(path, lines) {
  await writeJsonOrText(path, `${lines.join('\n').trim()}\n`);
}

async function writeJsonOrText(path, text) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, text, 'utf8');
}

async function loadOptionalJson(path) {
  if (!(await exists(path))) {
    return null;
  }
  return readJsonFile(path);
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

function truncateDescription(description, maxLen = 140) {
  if (description.length <= maxLen) {
    return description;
  }
  return `${description.slice(0, maxLen - 3)}...`;
}

async function main() {
  const options = parseOptionArgs(process.argv);
  const cwd = process.cwd();
  await buildPublishPayload({
    rulesJson: requireOption(options, '--rules-json'),
    sitResult: requireOption(options, '--sit-result'),
    diffsitResult: requireOption(options, '--diffsit-result'),
    fpsResult: requireOption(options, '--fps-result'),
    pluginVersion: options.get('--plugin-version') ?? '',
    runUrl: requireOption(options, '--run-url'),
    repository: requireOption(options, '--repository'),
    runId: requireOption(options, '--run-id'),
    fpsSummaryPath: resolvePathUnder(
      cwd,
      requireOption(options, '--fps-summary-path'),
      '--fps-summary-path',
    ),
    diffsitSummaryPath: resolvePathUnder(
      cwd,
      requireOption(options, '--diffsit-summary-path'),
      '--diffsit-summary-path',
    ),
    artifactsJsonPath: resolvePathUnder(
      cwd,
      requireOption(options, '--artifacts-json-path'),
      '--artifacts-json-path',
    ),
    commentPath: resolvePathUnder(cwd, requireOption(options, '--comment-path'), '--comment-path'),
    ruleStatusesPath: resolvePathUnder(
      cwd,
      requireOption(options, '--rule-statuses-path'),
      '--rule-statuses-path',
    ),
  });
}

if (isMain(import.meta.url)) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
