/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
/**
 * Syncs RSPEC rule metadata from the SonarSource/rspec repository.
 *
 * Usage:
 *   tsx tools/sync-rspec.ts --language javascript|css [--rspec-path <path>]
 *
 * If --rspec-path is not provided, the script looks for a clone at resources/rspec.
 * If that doesn't exist, it clones the repo automatically (requires GITHUB_TOKEN).
 * If the clone already exists, it fetches the latest changes first.
 *
 * For each rule that has a <language>/metadata.json in the rspec repo, merges
 * the parent metadata.json with the language-specific overrides and writes the
 * result to resources/rule-data/<language>/<rule>.json.
 */
import { readdirSync, readFileSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { parseArgs } from 'node:util';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const DEFAULT_RSPEC_PATH = join(ROOT_DIR, 'resources', 'rspec');
const RSPEC_REPO_SSH = 'git@github.com:SonarSource/rspec.git';
const RSPEC_BRANCH = 'dogfood-automerge';

const { values } = parseArgs({
  options: {
    'rspec-path': { type: 'string' },
    language: { type: 'string' },
  },
  strict: true,
});

const language = values['language'] as string | undefined;

if (!language || !['javascript', 'css'].includes(language)) {
  console.error('Error: --language must be "javascript" or "css"');
  process.exit(1);
}

const explicitPath = values['rspec-path'] as string | undefined;
const rspecPath = resolve(explicitPath ?? DEFAULT_RSPEC_PATH);
const isManagedClone = !explicitPath;

if (!existsSync(join(rspecPath, 'rules'))) {
  if (!isManagedClone) {
    console.error(`Error: rspec repo not found at ${rspecPath}`);
    process.exit(1);
  }
  console.log(`Cloning rspec repo (sparse, rules/ only) to ${rspecPath}...`);
  const token = process.env.GITHUB_TOKEN;
  const repoUrl = token
    ? `https://x-access-token:${token}@github.com/SonarSource/rspec.git`
    : RSPEC_REPO_SSH;
  mkdirSync(rspecPath, { recursive: true });
  execSync(
    `git clone --depth 1 --filter=blob:none --sparse --branch ${RSPEC_BRANCH} ${repoUrl} ${rspecPath}`,
    { stdio: 'inherit' },
  );
  execSync('git sparse-checkout set rules', { cwd: rspecPath, stdio: 'inherit' });
} else if (isManagedClone) {
  // Only auto-fetch for the managed clone, not user-provided paths
  console.log(`Fetching latest changes in ${rspecPath}...`);
  try {
    execSync(`git fetch --depth 1 origin ${RSPEC_BRANCH} && git reset --hard FETCH_HEAD`, {
      cwd: rspecPath,
      stdio: 'inherit',
    });
  } catch {
    console.warn('Warning: Failed to fetch latest changes, using existing data');
  }
}

const rulesDir = join(rspecPath, 'rules');
const outputDir = join(ROOT_DIR, 'resources', 'rule-data', language);

// Clean and recreate output directory
rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });

const ruleRegex = /^S\d+$/;
const ruleDirs = readdirSync(rulesDir).filter(name => ruleRegex.test(name));

let count = 0;

for (const ruleName of ruleDirs) {
  const languageMetadataPath = join(rulesDir, ruleName, language, 'metadata.json');
  let languageMetadata: Record<string, unknown>;
  try {
    languageMetadata = JSON.parse(readFileSync(languageMetadataPath, 'utf-8'));
  } catch {
    // Rule doesn't have this language — skip
    continue;
  }

  const parentMetadataPath = join(rulesDir, ruleName, 'metadata.json');
  let parentMetadata: Record<string, unknown>;
  try {
    parentMetadata = JSON.parse(readFileSync(parentMetadataPath, 'utf-8'));
  } catch {
    console.warn(`Warning: No parent metadata.json for ${ruleName}, skipping`);
    continue;
  }

  const merged = { ...parentMetadata, ...languageMetadata };
  const outputPath = join(outputDir, `${ruleName}.json`);
  writeFileSync(outputPath, JSON.stringify(merged, null, 2) + '\n');
  count++;
}

console.log(`Synced ${count} ${language} rules to ${outputDir}`);
