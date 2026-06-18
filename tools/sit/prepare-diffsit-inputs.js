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
import { cp, mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import {
  isMain,
  parseOptionArgs,
  requireOption,
  resolvePathUnder,
  writeJsonFile,
} from './common.js';

const REPORT_FILES = {
  json: 'diffsit-report.json',
  text: 'diffsit-report.txt',
  html: 'diffsit-report.html',
};

const ISSUES_FILE = 'issues.jsonl';

export function loadRules(rulesJson) {
  const rawRules = JSON.parse(rulesJson);
  if (!Array.isArray(rawRules)) {
    throw new Error('rulesJson must be a JSON array');
  }

  const fullRuleKeys = new Set();
  for (const rawRule of rawRules) {
    if (rawRule === null || typeof rawRule !== 'object' || Array.isArray(rawRule)) {
      throw new Error('each rule entry must be an object');
    }
    const rawRepository = rawRule.repository;
    const rawRuleKey = rawRule.ruleKey ?? rawRule.rule_key;
    if (typeof rawRuleKey !== 'string' || rawRuleKey.length === 0) {
      throw new Error('each rule entry must have a non-empty ruleKey');
    }
    if (rawRuleKey.includes(':')) {
      fullRuleKeys.add(normalizeFullRuleKey(rawRuleKey));
      continue;
    }
    if (typeof rawRepository !== 'string' || rawRepository.length === 0) {
      throw new Error('each rule entry must have a non-empty repository');
    }
    fullRuleKeys.add(`${rawRepository.toLowerCase()}:${rawRuleKey.toUpperCase()}`);
  }

  return [...fullRuleKeys].sort();
}

export async function prepareDiffsitInputs({
  rulesJson,
  baseDir,
  targetDir,
  reportsDir,
  manifestOutput,
}) {
  const ruleKeys = loadRules(rulesJson);
  const targetProjects = await listProjectExports(targetDir, 'target');
  const preparedBaseDir = join(dirname(manifestOutput), 'prepared-base');

  await rm(preparedBaseDir, { recursive: true, force: true });
  await mkdir(preparedBaseDir, { recursive: true });

  const baseProjects = await listBaseProjectExports(baseDir);
  for (const [projectName, projectDir] of baseProjects) {
    await copyProjectExport(projectDir, join(preparedBaseDir, projectName));
  }

  for (const [projectName, projectDir] of targetProjects) {
    if (!baseProjects.has(projectName)) {
      await synthesizeEmptyBaseline(projectDir, join(preparedBaseDir, projectName));
    }
  }

  await mkdir(reportsDir, { recursive: true });
  const manifest = {
    runs: [
      {
        name: 'sonarjs',
        rule_keys: ruleKeys,
        rule_filter: ruleKeys.join(','),
        base_dir: preparedBaseDir,
        target_dir: targetDir,
        report_dir: reportsDir,
        reports: Object.fromEntries(
          Object.entries(REPORT_FILES).map(([format, file]) => [format, join(reportsDir, file)]),
        ),
      },
    ],
  };
  await writeJsonFile(manifestOutput, manifest);
  return manifest;
}

async function listProjectExports(root, label) {
  if (!(await isDirectory(root))) {
    throw new Error(`${label} SIT export directory does not exist: ${root}`);
  }

  const entries = await readdir(root, { withFileTypes: true });
  const projectDirs = entries
    .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
    .sort((a, b) => a.name.localeCompare(b.name));
  const missingIssueFiles = [];
  const projects = new Map();
  for (const entry of projectDirs) {
    const projectDir = join(root, entry.name);
    if (!(await isFile(join(projectDir, ISSUES_FILE)))) {
      missingIssueFiles.push(entry.name);
      continue;
    }
    projects.set(entry.name, projectDir);
  }

  if (missingIssueFiles.length > 0) {
    throw new Error(
      `${label} project export(s) missing ${ISSUES_FILE} under ${root}: ${missingIssueFiles.join(', ')}`,
    );
  }
  if (projects.size === 0) {
    throw new Error(`${label} SIT export directory contains no project exports: ${root}`);
  }
  return projects;
}

async function listBaseProjectExports(root) {
  if (!(await isDirectory(root))) {
    return new Map();
  }

  const projects = new Map();
  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries
    .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
    .sort((a, b) => a.name.localeCompare(b.name))) {
    const projectDir = join(root, entry.name);
    if (!(await isFile(join(projectDir, ISSUES_FILE)))) {
      console.warn(
        `Warning: base project export missing ${ISSUES_FILE}, treating as empty baseline: ${projectDir}`,
      );
      continue;
    }
    projects.set(entry.name, projectDir);
  }
  return projects;
}

async function copyProjectExport(source, destination) {
  await rm(destination, { recursive: true, force: true });
  await cp(source, destination, { recursive: true });
}

async function synthesizeEmptyBaseline(targetProjectDir, destination) {
  await rm(destination, { recursive: true, force: true });
  await mkdir(destination, { recursive: true });
  await writeFile(join(destination, ISSUES_FILE), '', 'utf8');
  const metadataPath = join(targetProjectDir, 'metadata.json');
  if (await isFile(metadataPath)) {
    await cp(metadataPath, join(destination, 'metadata.json'));
  }
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

async function isFile(path) {
  try {
    return (await stat(path)).isFile();
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

function normalizeFullRuleKey(ruleKey) {
  const [repository, key] = ruleKey.split(':', 2);
  if (!repository || !key) {
    throw new Error(`invalid rule key: ${ruleKey}`);
  }
  return `${repository.toLowerCase()}:${key.toUpperCase()}`;
}

async function main() {
  const args = parseOptionArgs(process.argv);
  const cwd = process.cwd();
  const manifest = await prepareDiffsitInputs({
    rulesJson: requireOption(args, '--rules-json'),
    baseDir: resolvePathUnder(cwd, requireOption(args, '--base-dir'), '--base-dir'),
    targetDir: resolvePathUnder(cwd, requireOption(args, '--target-dir'), '--target-dir'),
    reportsDir: resolvePathUnder(cwd, requireOption(args, '--reports-dir'), '--reports-dir'),
    manifestOutput: resolvePathUnder(
      cwd,
      requireOption(args, '--manifest-output'),
      '--manifest-output',
    ),
  });
  console.log(`Wrote DiffSIT manifest (${manifest.runs.length} run(s))`);
}

if (isMain(import.meta.url)) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
