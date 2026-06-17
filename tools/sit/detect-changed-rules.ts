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
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const JSTS_RULE_PATH = /^packages\/analysis\/src\/jsts\/rules\/(S\d+)\/.+$/;
const JSTS_METADATA_PATH =
  /^sonar-plugin\/javascript-checks\/src\/main\/resources\/org\/sonar\/l10n\/javascript\/rules\/javascript\/(S\d+)\.json$/;
const CSS_RULE_PATH = /^packages\/analysis\/src\/css\/rules\/(S\d+)\/.+$/;
const CSS_METADATA_PATH =
  /^sonar-plugin\/css\/src\/main\/resources\/org\/sonar\/l10n\/css\/rules\/css\/(S\d+)\.json$/;

const JSTS_METADATA_DIR =
  'sonar-plugin/javascript-checks/src/main/resources/org/sonar/l10n/javascript/rules/javascript';

export type ChangedFile = {
  status: string;
  path: string;
};

export type ChangedRule = {
  repository: 'javascript' | 'typescript' | 'css';
  language: 'js' | 'ts' | 'css';
  ruleKey: string;
};

type RuleMetadata = {
  compatibleLanguages?: string[];
};

export async function detectChangedRules(
  repoRoot: string,
  changedFiles: ChangedFile[],
): Promise<ChangedRule[]> {
  const rules = new Map<string, ChangedRule>();

  for (const file of changedFiles) {
    if (file.status.startsWith('D')) {
      continue;
    }

    const jstsRuleKey =
      matchRuleKey(file.path, JSTS_RULE_PATH) ?? matchRuleKey(file.path, JSTS_METADATA_PATH);
    if (jstsRuleKey) {
      for (const language of await compatibleLanguages(repoRoot, jstsRuleKey)) {
        if (language === 'js') {
          addRule(rules, { repository: 'javascript', language, ruleKey: jstsRuleKey });
        } else if (language === 'ts') {
          addRule(rules, { repository: 'typescript', language, ruleKey: jstsRuleKey });
        }
      }
      continue;
    }

    const cssRuleKey =
      matchRuleKey(file.path, CSS_RULE_PATH) ?? matchRuleKey(file.path, CSS_METADATA_PATH);
    if (cssRuleKey) {
      addRule(rules, { repository: 'css', language: 'css', ruleKey: cssRuleKey });
    }
  }

  return [...rules.values()].sort((a, b) =>
    [a.repository, a.language, a.ruleKey]
      .join(':')
      .localeCompare([b.repository, b.language, b.ruleKey].join(':')),
  );
}

function matchRuleKey(path: string, pattern: RegExp) {
  return pattern.exec(path)?.[1];
}

async function compatibleLanguages(repoRoot: string, ruleKey: string) {
  const metadataPath = resolve(repoRoot, JSTS_METADATA_DIR, `${ruleKey}.json`);
  const metadata = JSON.parse(await readFile(metadataPath, 'utf8')) as RuleMetadata;
  const languages = metadata.compatibleLanguages ?? [];
  if (!languages.every(language => language === 'js' || language === 'ts')) {
    throw new Error(`${metadataPath} contains unsupported compatibleLanguages`);
  }
  if (languages.length === 0) {
    throw new Error(`${metadataPath} does not define compatibleLanguages`);
  }
  return languages;
}

function addRule(rules: Map<string, ChangedRule>, rule: ChangedRule) {
  rules.set(`${rule.repository}:${rule.ruleKey}`, rule);
}

export function parseNameStatus(output: string): ChangedFile[] {
  return output
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [status, firstPath, secondPath] = line.split('\t');
      return { status, path: secondPath ?? firstPath };
    });
}

function gitChangedFiles(base: string, head: string): ChangedFile[] {
  const result = spawnSync('git', ['diff', '--name-status', '--diff-filter=ACMRD', base, head], {
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || `git diff failed with exit code ${result.status}`);
  }
  return parseNameStatus(result.stdout);
}

async function main() {
  const args = new Map<string, string>();
  for (let i = 2; i < process.argv.length; i += 2) {
    args.set(process.argv[i], process.argv[i + 1]);
  }

  const base = args.get('--base');
  const head = args.get('--head') ?? 'HEAD';
  const repoRoot = args.get('--repo-root') ?? process.cwd();
  if (!base) {
    throw new Error('Missing required --base argument');
  }

  const rules = await detectChangedRules(repoRoot, gitChangedFiles(base, head));
  process.stdout.write(`${JSON.stringify(rules)}\n`);
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? '')) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
