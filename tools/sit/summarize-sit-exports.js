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
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import {
  isMain,
  parseOptionArgs,
  readJsonFile,
  requireOption,
  resolvePathUnder,
  writeJsonFile,
} from './common.js';

export async function summarizeSitExports({ baseDir, targetDir, summaryOutput }) {
  const payload = {
    baseline: await summarizeExportDirectory(baseDir, 'baseline'),
    target: await summarizeExportDirectory(targetDir, 'target'),
  };
  await writeJsonFile(summaryOutput, payload);
  return payload;
}

async function summarizeExportDirectory(root, label) {
  if (!(await isDirectory(root))) {
    throw new Error(`${label} SIT export directory does not exist: ${root}`);
  }

  const projects = [];
  for (const entry of (await readdir(root, { withFileTypes: true }))
    .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
    .sort((left, right) => left.name.localeCompare(right.name))) {
    const projectDir = join(root, entry.name);
    const metadataPath = join(projectDir, 'metadata.json');
    const metadata = await readJsonFile(metadataPath, `${label} SIT metadata`);
    const duration = Number(metadata.analysis_duration_ms ?? 0);
    if (!Number.isFinite(duration) || duration < 0) {
      throw new Error(`Invalid analysis_duration_ms in ${metadataPath}`);
    }
    projects.push({
      project_key:
        typeof metadata.project_key === 'string' && metadata.project_key.length > 0
          ? metadata.project_key
          : entry.name,
      analysis_duration_ms: duration,
    });
  }

  const sortedProjects = [...projects].sort(
    (left, right) =>
      right.analysis_duration_ms - left.analysis_duration_ms ||
      left.project_key.localeCompare(right.project_key),
  );
  const totalAnalysisDurationMs = sortedProjects.reduce(
    (sum, project) => sum + project.analysis_duration_ms,
    0,
  );

  return {
    project_count: sortedProjects.length,
    total_analysis_duration_ms: totalAnalysisDurationMs,
    average_analysis_duration_ms:
      sortedProjects.length === 0 ? 0 : Math.round(totalAnalysisDurationMs / sortedProjects.length),
    slowest_projects: sortedProjects.slice(0, 10),
    projects: sortedProjects,
  };
}

async function isDirectory(path) {
  try {
    return (await stat(path)).isDirectory();
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

async function main() {
  const args = parseOptionArgs(process.argv);
  const cwd = process.cwd();
  const payload = await summarizeSitExports({
    baseDir: resolvePathUnder(cwd, requireOption(args, '--base-dir'), '--base-dir'),
    targetDir: resolvePathUnder(cwd, requireOption(args, '--target-dir'), '--target-dir'),
    summaryOutput: resolvePathUnder(
      cwd,
      requireOption(args, '--summary-output'),
      '--summary-output',
    ),
  });
  console.log(
    `Wrote SIT timing summary (baseline=${payload.baseline.project_count}, target=${payload.target.project_count})`,
  );
}

if (isMain(import.meta.url)) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
