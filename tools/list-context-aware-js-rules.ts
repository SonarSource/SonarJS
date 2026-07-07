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
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

type CompatibleLanguage = 'js' | 'ts';
type ModuleType = 'module' | 'commonjs';

type RspecRuleMetadata = {
  title: string;
  tags: string[];
  compatibleLanguages: CompatibleLanguage[];
  extra?: {
    requiredDependency?: string[];
  };
};

export type ContextAwareJsRule = {
  sonarKey: string;
  title: string;
  compatibleLanguages: CompatibleLanguage[];
  requiredDependency: string[];
  requiredEcmaVersion?: number;
  requiredModuleType?: ModuleType;
};

const toolsDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.join(toolsDirectory, '..');
const rulesDirectory = path.join(
  repositoryRoot,
  'packages',
  'analysis',
  'src',
  'jsts',
  'rules',
);
const metadataDirectory = path.join(
  repositoryRoot,
  'sonar-plugin',
  'javascript-checks',
  'src',
  'main',
  'resources',
  'org',
  'sonar',
  'l10n',
  'javascript',
  'rules',
  'javascript',
);
const sonarKeyPattern = /^S\d+$/;
const ecmaVersionTagPattern = /^es20\d\d$/i;
const requiredDependencyPattern =
  /export const requiredDependency = \[(?<values>[\s\S]*?)\](?:\s+as const)?;/;
const stringLiteralPattern = /'([^']+)'|"([^"]+)"/g;

export async function listContextAwareJsRules(): Promise<ContextAwareJsRule[]> {
  const sonarKeys = await listSonarRuleKeys();
  const rules = await Promise.all(
    sonarKeys.map(async sonarKey => {
      const metadata = await readRspecRuleMetadata(sonarKey);
      if (!metadata.compatibleLanguages.includes('js')) {
        return undefined;
      }

      const requiredDependency =
        (await readLocalRequiredDependencyOverride(sonarKey)) ??
        metadata.extra?.requiredDependency ??
        [];
      const requiredEcmaVersion = getRequiredEcmaVersion(metadata.tags);
      const requiredModuleType = getRequiredModuleType(metadata.tags);

      if (
        requiredDependency.length === 0 &&
        requiredEcmaVersion === undefined &&
        requiredModuleType === undefined
      ) {
        return undefined;
      }

      return {
        sonarKey,
        title: metadata.title,
        compatibleLanguages: metadata.compatibleLanguages,
        requiredDependency,
        requiredEcmaVersion,
        requiredModuleType,
      };
    }),
  );

  return rules.filter(rule => rule !== undefined);
}

export function formatContextAwareJsRules(rules: ContextAwareJsRule[]): string {
  return [
    [
      'sonarKey',
      'title',
      'compatibleLanguages',
      'requiredDependency',
      'requiredEcmaVersion',
      'requiredModuleType',
    ].join(','),
    ...rules.map(rule =>
      [
        rule.sonarKey,
        rule.title,
        rule.compatibleLanguages.join('|'),
        rule.requiredDependency.join('|'),
        rule.requiredEcmaVersion?.toString() ?? '',
        rule.requiredModuleType ?? '',
      ]
        .map(toCsvCell)
        .join(','),
    ),
  ].join('\n');
}

async function listSonarRuleKeys() {
  const entries = await readdir(rulesDirectory, { withFileTypes: true });

  return entries
    .filter(entry => entry.isDirectory() && sonarKeyPattern.test(entry.name))
    .map(entry => entry.name)
    .sort((left, right) => Number.parseInt(left.slice(1), 10) - Number.parseInt(right.slice(1), 10));
}

async function readRspecRuleMetadata(sonarKey: string): Promise<RspecRuleMetadata> {
  const metadataPath = path.join(metadataDirectory, `${sonarKey}.json`);
  return JSON.parse(await readFile(metadataPath, 'utf8')) as RspecRuleMetadata;
}

async function readLocalRequiredDependencyOverride(sonarKey: string) {
  const metaPath = path.join(rulesDirectory, sonarKey, 'meta.ts');
  const source = await readFile(metaPath, 'utf8');
  const match = requiredDependencyPattern.exec(source);

  if (!match?.groups?.values) {
    return undefined;
  }

  const dependencies: string[] = [];
  for (const literal of match.groups.values.matchAll(stringLiteralPattern)) {
    dependencies.push(literal[1] ?? literal[2]);
  }
  return dependencies;
}

function getRequiredEcmaVersion(tags: string[]) {
  const ecmaTag = tags.find(tag => ecmaVersionTagPattern.test(tag));
  return ecmaTag ? Number.parseInt(ecmaTag.slice(2), 10) : undefined;
}

function getRequiredModuleType(tags: string[]): ModuleType | undefined {
  const esmOnly = tags.includes('esm-only') || tags.includes('esm_only');
  const cjsOnly = tags.includes('cjs-only') || tags.includes('cjs_only');

  if (esmOnly && cjsOnly) {
    throw new Error(`Rule tags cannot require both ESM and CommonJS`);
  }

  if (esmOnly) {
    return 'module';
  }
  if (cjsOnly) {
    return 'commonjs';
  }
  return undefined;
}

async function main() {
  console.log(formatContextAwareJsRules(await listContextAwareJsRules()));
}

function toCsvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
