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
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  emptyFpsMetrics,
  isMain,
  parseOptionArgs,
  readJsonFile,
  requireOption,
  resolvePathUnder,
  writeJsonFile,
} from './common.js';

export async function loadFpsReportMetrics(reportsDir, outputPrefix) {
  const reportPath = join(reportsDir, `${outputPrefix}_summary.json`);
  let report;
  try {
    report = await readJsonFile(reportPath, 'FPS report');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error(
        `Warning: failed to read FPS report '${reportPath}': ${error.message ?? error}`,
      );
    }
    return emptyFpsMetrics();
  }

  const metrics = report.metrics ?? {};
  const clusters = Array.isArray(report.clusters)
    ? report.clusters.map(cluster => {
        const clusterMetrics = cluster.metrics ?? {};
        return {
          cluster_id: cluster.cluster_id,
          cluster_name: cluster.cluster_name,
          issue_count: clusterMetrics.issue_count,
          cluster_fp_rate: clusterMetrics.cluster_fp_rate,
        };
      })
    : [];

  return {
    issues_analyzed: metrics.total_issues_analyzed,
    false_positive_rate: metrics.false_positive_rate,
    cluster_count: metrics.total_clusters,
    clusters,
  };
}

export async function summarizeFpsTsv({ inputTsv, outputJson, reportsDir, allowedRoot }) {
  const safeInputTsv = resolvePathUnder(allowedRoot, inputTsv, '--input-tsv');
  const safeOutputJson = resolvePathUnder(allowedRoot, outputJson, '--output-json');
  const safeReportsDir = resolvePathUnder(allowedRoot, reportsDir, '--reports-dir');

  const rows = [];
  let input = '';
  try {
    input = await readFile(safeInputTsv, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  for (const rawLine of input.split('\n')) {
    if (rawLine.trim() === '') {
      continue;
    }
    const parts = rawLine.split('\t');
    if (parts.length !== 6) {
      throw new Error(`Invalid row in ${safeInputTsv}: '${rawLine}'`);
    }
    const [ruleKey, outputPrefix, status, exitCode, startedAt, finishedAt] = parts;
    const reportMetrics = await loadFpsReportMetrics(safeReportsDir, outputPrefix);
    rows.push({
      rule_key: ruleKey,
      output_prefix: outputPrefix,
      status,
      exit_code: Number(exitCode),
      started_at: startedAt,
      finished_at: finishedAt,
      ...reportMetrics,
    });
  }

  const payload = {
    total: rows.length,
    failed: rows.filter(row => row.status !== 'success').length,
    results: rows,
  };
  await writeJsonFile(safeOutputJson, payload);
  return payload;
}

async function main() {
  const args = parseOptionArgs(process.argv);
  const cwd = process.cwd();
  const payload = await summarizeFpsTsv({
    inputTsv: requireOption(args, '--input-tsv'),
    outputJson: requireOption(args, '--output-json'),
    reportsDir: requireOption(args, '--reports-dir'),
    allowedRoot: cwd,
  });
  console.log(`Wrote FPS summary (total=${payload.total}, failed=${payload.failed})`);
}

if (isMain(import.meta.url)) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
