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
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import {
  isMain,
  parseOptionArgs,
  requireOption,
  resolvePathUnder,
  writeJsonFile,
} from './common.js';
import { summarizeFpsTsv } from './summarize-fps-results.js';

const FPS_NO_ISSUES_EXIT_CODE = 2;

export function parseRuleKeys(rulesText) {
  const seen = new Set();
  const ruleKeys = [];
  for (const rawLine of rulesText.split('\n')) {
    const ruleKey = rawLine.trim();
    if (!ruleKey || seen.has(ruleKey)) {
      continue;
    }
    seen.add(ruleKey);
    ruleKeys.push(ruleKey);
  }
  return ruleKeys;
}

export function sanitizeRuleKey(ruleKey) {
  return ruleKey.replaceAll(/[:/]/g, '__');
}

export function resolveRspecRefForRule(ruleKey, rspecRefs) {
  const repository = ruleKey.split(':', 1)[0];
  if (repository === 'javascript' || repository === 'typescript') {
    return rspecRefs.javascript;
  }
  if (repository === 'css') {
    return rspecRefs.css;
  }
  return undefined;
}

export async function runOneRule({
  fpsProjectDir,
  runDir,
  sitInput,
  ruleKey,
  outputPrefix,
  rspecRef,
  runCommand = defaultRunCommand,
}) {
  const command = [
    'uv',
    'run',
    '--project',
    fpsProjectDir,
    'fps',
    '--source',
    'sit',
    '--sit-input',
    sitInput,
    '--limit',
    '1000',
    '--export-json',
    '--output-prefix',
    outputPrefix,
    ruleKey,
  ];

  let completed;
  try {
    completed = runCommand(command, runDir, buildRunEnvironment(rspecRef));
  } catch (error) {
    console.error(`Failed to run FPS for ${ruleKey}: ${error.message ?? error}`);
    return 1;
  }

  if (completed.stdout) {
    process.stdout.write(completed.stdout);
  }
  if (completed.stderr) {
    process.stderr.write(completed.stderr);
  }

  const status = completed.status ?? 1;
  if (status === FPS_NO_ISSUES_EXIT_CODE) {
    await writeEmptyReport(join(runDir, 'reports', `${outputPrefix}_summary.json`));
    return 0;
  }
  return status;
}

export async function writeEmptyReport(reportPath) {
  await writeJsonFile(reportPath, {
    metrics: {
      total_issues_analyzed: 0,
      false_positive_rate: 0.0,
      total_clusters: 0,
    },
    clusters: [],
  });
}

function defaultRunCommand(command, cwd, env) {
  return spawnSync(command[0], command.slice(1), {
    cwd,
    env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function buildRunEnvironment(rspecRef) {
  if (!rspecRef) {
    return process.env;
  }

  return {
    ...process.env,
    RSPEC_GITHUB_BRANCH: rspecRef,
  };
}

function utcNow() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

async function main() {
  const args = parseOptionArgs(process.argv);
  const workspace = requireOption(args, '--workspace');
  const safeWorkspace = resolvePathUnder('/', workspace, '--workspace');
  const fpsProjectDir = join(safeWorkspace, 'dev-tools', 'scripts');
  const sitInput = resolvePathUnder(
    safeWorkspace,
    requireOption(args, '--sit-input'),
    '--sit-input',
  );
  const reportsDir = resolvePathUnder(
    safeWorkspace,
    requireOption(args, '--reports-dir'),
    '--reports-dir',
  );
  const summaryTsv = resolvePathUnder(
    safeWorkspace,
    requireOption(args, '--summary-tsv'),
    '--summary-tsv',
  );
  const summaryJson = resolvePathUnder(
    safeWorkspace,
    requireOption(args, '--summary-json'),
    '--summary-json',
  );
  const runDir = resolvePathUnder(safeWorkspace, dirname(reportsDir), 'run directory');
  const rspecRefs = await loadRspecRefs(safeWorkspace);

  await requireDirectory(fpsProjectDir, 'FPS project directory');
  await requireDirectory(sitInput, 'SIT input directory');

  const ruleKeys = parseRuleKeys(requireOption(args, '--rules-text'));
  await mkdir(runDir, { recursive: true });
  await mkdir(dirname(summaryTsv), { recursive: true });

  const rows = [];
  let hasFailures = false;
  for (const ruleKey of ruleKeys) {
    const outputPrefix = `pr${requireOption(args, '--pr-number')}_${requireOption(
      args,
      '--head-sha',
    ).slice(0, 12)}_${sanitizeRuleKey(ruleKey)}`;
    const startedAt = utcNow();
    const exitCode = await runOneRule({
      fpsProjectDir,
      runDir,
      sitInput,
      ruleKey,
      outputPrefix,
      rspecRef: resolveRspecRefForRule(ruleKey, rspecRefs),
    });
    const finishedAt = utcNow();
    const status = exitCode === 0 ? 'success' : 'failure';
    if (exitCode !== 0) {
      hasFailures = true;
    }
    rows.push([ruleKey, outputPrefix, status, String(exitCode), startedAt, finishedAt].join('\t'));
  }

  await writeFile(summaryTsv, rows.length === 0 ? '' : `${rows.join('\n')}\n`, 'utf8');
  const payload = await summarizeFpsTsv({
    inputTsv: summaryTsv,
    outputJson: summaryJson,
    reportsDir,
    allowedRoot: safeWorkspace,
  });
  console.log(
    `Wrote FPS summary to ${summaryJson} (total=${payload.total}, failed=${payload.failed})`,
  );
  if (hasFailures) {
    throw new Error('One or more FPS runs failed');
  }
}

async function requireDirectory(path, label) {
  try {
    if ((await stat(path)).isDirectory()) {
      return;
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
  throw new Error(`${label} does not exist: ${path}`);
}

async function loadRspecRefs(workspace) {
  return {
    javascript: await readOptionalTrimmedFile(
      join(workspace, 'sonar-plugin', 'javascript-checks', 'src', 'main', 'resources', 'rspec.sha'),
    ),
    css: await readOptionalTrimmedFile(
      join(workspace, 'sonar-plugin', 'css', 'src', 'main', 'resources', 'rspec.sha'),
    ),
  };
}

async function readOptionalTrimmedFile(path) {
  try {
    const value = (await readFile(path, 'utf8')).trim();
    return value === '' ? undefined : value;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return undefined;
    }
    throw error;
  }
}

if (isMain(import.meta.url)) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
