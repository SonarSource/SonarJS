/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
import { readdir, readFile, stat } from 'fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ESLintConfiguration } from '../packages/jsts/src/rules/helpers/configs.js';

export const ruleRegex = /^S\d+/;
export const DIRNAME = dirname(fileURLToPath(import.meta.url));
export const REPOSITORY_ROOT = join(DIRNAME, '..');
export const TS_TEMPLATES_FOLDER = join(DIRNAME, 'templates', 'ts');
export const JAVA_TEMPLATES_FOLDER = join(DIRNAME, 'templates', 'java');
export const RULES_FOLDER = join(REPOSITORY_ROOT, 'packages', 'jsts', 'src', 'rules');
export const METADATA_FOLDER = join(
  REPOSITORY_ROOT,
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
export const header = await readFile(join(DIRNAME, 'header.ts'), 'utf8');

export const typeMatrix = {
  CODE_SMELL: 'suggestion',
  BUG: 'problem',
  SECURITY_HOTSPOT: 'problem',
  VULNERABILITY: 'problem',
} as const;

type rspecMeta = {
  type: keyof typeof typeMatrix;
  status: 'ready' | 'beta' | 'closed' | 'deprecated' | 'superseded';
  title: string;
  quickfix: 'covered' | undefined;
  tags: string[];
  scope: 'Main' | 'Tests' | 'All';
  compatibleLanguages: ('js' | 'ts')[];
};

// Array sorter for Sonar rule IDs
const getInt = (sonarKey: string) => parseInt(/^S(\d+)/.exec(sonarKey)[1]);
export const sonarKeySorter = (a: string, b: string) => getInt(a) - getInt(b);

export function verifyRuleName(eslintId: string) {
  const re = /^[a-z]+(-[a-z0-9]+)*$/;
  if (!re.exec(eslintId)) {
    throw new Error(`Invalid class name: it should match ${re}, but got "${eslintId}"`);
  }
}

export async function getESLintDefaultConfiguration(
  sonarKey: string,
): Promise<ESLintConfiguration> {
  const configFilePath = join(RULES_FOLDER, sonarKey, 'config.ts');
  const configFileExists = await exists(configFilePath);
  if (!configFileExists) {
    return [];
  }
  const config = await import(pathToFileURL(configFilePath).toString());
  return config.fields;
}

export async function getRspecMeta(
  sonarKey: string,
  defaults: { compatibleLanguages?: ('js' | 'ts')[]; scope?: 'Main' | 'Tests' },
): Promise<rspecMeta> {
  const rspecFile = join(METADATA_FOLDER, `${sonarKey}.json`);
  const rspecFileExists = await exists(rspecFile);
  if (!rspecFileExists) {
    console.log(`RSPEC metadata not found for rule ${sonarKey}.`);
  }
  return rspecFileExists
    ? JSON.parse(await readFile(rspecFile, 'utf-8'))
    : {
        // Dummy data to create compilable new rule metadata
        title: 'Description',
        tags: [],
        type: 'BUG',
        status: 'ready',
        scope: 'Main',
        compatibleLanguages: ['js', 'ts'],
        quickfix: undefined,
        ...defaults,
      };
}

/**
 * Get the metadata for all rules in SonarJS
 */
export async function getAllRulesMetadata() {
  const rulesMetadata = [];
  for (const file of await listRulesDir()) {
    rulesMetadata.push(await getRuleMetadata(file));
  }
  return rulesMetadata;
}

/**
 * Get the metadata for all rules in SonarJS
 */
export async function getRuleMetadata(sonarKey: string) {
  return {
    ...(await import(pathToFileURL(join(RULES_FOLDER, sonarKey, 'meta.js')).toString())),
    sonarKey, // we add this, as we don't track it in the meta.ts as it can be trivially derived
  };
}

/**
 * List all rules in SonarJS
 */
export async function listRulesDir() {
  const files = await readdir(RULES_FOLDER, { withFileTypes: true });
  return files
    .filter(file => ruleRegex.test(file.name) && file.isDirectory())
    .map(file => file.name)
    .sort(sonarKeySorter);
}

async function exists(file: string) {
  return stat(file)
    .then(() => true)
    .catch(() => false);
}
