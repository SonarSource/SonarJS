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
import {
  isMain,
  parseOptionArgs,
  readJsonFile,
  requireOption,
  resolvePathUnder,
  writeJsonFile,
} from './common.js';

const COUNT_KEYS = [
  'projects',
  'base_count',
  'target_count',
  'new',
  'removed',
  'changed',
  'message_changes',
  'secondary_changes',
  'unchanged',
];

export async function summarizeDiffsitReports({ manifest, summaryOutput }) {
  const manifestPayload = await readJsonFile(manifest, 'manifest');
  if (!Array.isArray(manifestPayload.runs)) {
    throw new Error(`manifest must contain a runs array: ${manifest}`);
  }

  const results = [];
  for (const run of manifestPayload.runs) {
    if (run === null || typeof run !== 'object' || Array.isArray(run)) {
      throw new Error(`manifest run entries must be objects: ${manifest}`);
    }
    const reportPath = run.reports?.json;
    if (typeof reportPath !== 'string') {
      throw new Error(`manifest run is missing reports.json: ${manifest}`);
    }
    const report = await readJsonFile(reportPath, 'DiffSIT JSON report');
    const summary = extractSummary(report, reportPath);
    results.push({
      name: run.name ?? run.language ?? 'sonarjs',
      rule_keys: run.rule_keys ?? [],
      rule_filter: run.rule_filter ?? '',
      report_path: reportPath,
      ...summary,
    });
  }

  const payload = {
    total: results.length,
    overall: aggregateResults(results),
    results,
  };
  await writeJsonFile(summaryOutput, payload);
  return payload;
}

function extractSummary(report, reportPath) {
  const rawSummary = report.overall_summary ?? report.summary;
  if (rawSummary === null || typeof rawSummary !== 'object' || Array.isArray(rawSummary)) {
    throw new Error(`DiffSIT report is missing summary data: ${reportPath}`);
  }

  const summary = Object.fromEntries(COUNT_KEYS.map(key => [key, Number(rawSummary[key] ?? 0)]));
  if (!('overall_summary' in report)) {
    summary.projects = 1;
  }
  if (!Array.isArray(rawSummary.only_in_base ?? [])) {
    throw new Error(`DiffSIT report has invalid only_in_base list: ${reportPath}`);
  }
  if (!Array.isArray(rawSummary.only_in_target ?? [])) {
    throw new Error(`DiffSIT report has invalid only_in_target list: ${reportPath}`);
  }
  summary.only_in_base = rawSummary.only_in_base ?? [];
  summary.only_in_target = rawSummary.only_in_target ?? [];
  return summary;
}

function aggregateResults(results) {
  const overall = Object.fromEntries(
    COUNT_KEYS.map(key => [
      key,
      results.reduce((sum, result) => sum + Number(result[key] ?? 0), 0),
    ]),
  );
  overall.only_in_base = results.flatMap(result =>
    result.only_in_base.map(project => ({ run: result.name, project })),
  );
  overall.only_in_target = results.flatMap(result =>
    result.only_in_target.map(project => ({ run: result.name, project })),
  );
  return overall;
}

async function main() {
  const args = parseOptionArgs(process.argv);
  const cwd = process.cwd();
  const payload = await summarizeDiffsitReports({
    manifest: resolvePathUnder(cwd, requireOption(args, '--manifest'), '--manifest'),
    summaryOutput: resolvePathUnder(
      cwd,
      requireOption(args, '--summary-output'),
      '--summary-output',
    ),
  });
  console.log(`Wrote DiffSIT summary (${payload.total} run(s))`);
}

if (isMain(import.meta.url)) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
