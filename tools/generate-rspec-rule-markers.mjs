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
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK_MODE = process.argv.includes('--check');
const RULE_KEY_PATTERN = /^S\d+$/;
const CSS_RULE_KEY_PATTERN = /sqKey\s*:\s*['"](S\d+)['"]/g;
const PARSER_RULE_KEY = 'S2260';
const COMPATIBLE_LANGUAGE_ORDER = ['js', 'ts'];

const JSTS_RULES_FOLDER = join(ROOT_DIR, 'packages', 'analysis', 'src', 'jsts', 'rules');
const CSS_METADATA_FILE = join(
  ROOT_DIR,
  'packages',
  'analysis',
  'src',
  'css',
  'rules',
  'metadata.ts',
);
const MARKERS_ROOT = join(ROOT_DIR, 'rspec-rule-markers');
const JS_MARKERS_FOLDER = join(MARKERS_ROOT, 'javascript');
const CSS_MARKERS_FOLDER = join(MARKERS_ROOT, 'css');

const localRuleDataRoot = join(ROOT_DIR, 'resources', 'rule-data');
const ruleDataRoots = [
  localRuleDataRoot,
  // Useful after a sync or build: full generated metadata should override checked-in markers.
  join(ROOT_DIR, 'sonar-plugin', 'javascript-checks', 'src', 'main', 'resources'),
];

const changedFiles = [];
const checkFailures = [];

await syncMarkers(JS_MARKERS_FOLDER, await jstsMarkers(), 'JavaScript/TypeScript');
await syncMarkers(CSS_MARKERS_FOLDER, await cssMarkers(), 'CSS');

if (CHECK_MODE && checkFailures.length > 0) {
  console.error(
    [
      'RSPEC rule marker files are out of date. Run `npm run generate-rspec-rule-markers`.',
      ...checkFailures.map(file => `  ${file}`),
    ].join('\n'),
  );
  process.exit(1);
}

if (changedFiles.length > 0) {
  console.log(`Updated ${changedFiles.length} RSPEC rule marker file(s).`);
}

async function jstsMarkers() {
  const ruleKeys = await listRuleDirectories(JSTS_RULES_FOLDER);
  addUnique(ruleKeys, PARSER_RULE_KEY);
  ruleKeys.sort(sortRuleKeys);

  return new Map(
    await Promise.all(
      ruleKeys.map(async ruleKey => [
        `${ruleKey}.json`,
        stringifyMarker(await createJstsMarker(ruleKey)),
      ]),
    ),
  );
}

async function cssMarkers() {
  const metadata = await readFile(CSS_METADATA_FILE, 'utf-8');
  const ruleKeys = [...metadata.matchAll(CSS_RULE_KEY_PATTERN)].map(match => match[1]);
  addUnique(ruleKeys, PARSER_RULE_KEY);
  ruleKeys.sort(sortRuleKeys);

  return new Map(ruleKeys.map(ruleKey => [`${ruleKey}.json`, stringifyMarker({})]));
}

async function listRuleDirectories(path) {
  const entries = await readdir(path, { withFileTypes: true });
  return entries
    .filter(entry => entry.isDirectory() && RULE_KEY_PATTERN.test(entry.name))
    .map(entry => entry.name);
}

async function createJstsMarker(ruleKey) {
  const compatibleLanguages = await readCompatibleLanguages(ruleKey);
  if (compatibleLanguages !== undefined) {
    return { compatibleLanguages };
  }

  if (ruleKey === PARSER_RULE_KEY) {
    return { compatibleLanguages: ['js', 'ts'] };
  }

  throw new Error(
    `Could not find compatibleLanguages for ${ruleKey}. Run \`npm run generate-meta\` first.`,
  );
}

async function readCompatibleLanguages(ruleKey) {
  const candidates = [
    ...ruleDataRoots.flatMap(root => [
      join(root, 'javascript', `${ruleKey}.json`),
      join(root, 'org', 'sonar', 'l10n', 'javascript', 'rules', 'javascript', `${ruleKey}.json`),
    ]),
    join(JS_MARKERS_FOLDER, `${ruleKey}.json`),
  ];

  for (const candidate of candidates) {
    const marker = await readJson(candidate);
    const compatibleLanguages = normalizeCompatibleLanguages(marker?.compatibleLanguages);
    if (compatibleLanguages !== undefined) {
      return compatibleLanguages;
    }
  }

  return undefined;
}

async function readJson(path) {
  if (!existsSync(path)) {
    return undefined;
  }
  try {
    return JSON.parse(await readFile(path, 'utf-8'));
  } catch (error) {
    throw new Error(`Failed to parse ${path}: ${error.message}`);
  }
}

function normalizeCompatibleLanguages(value) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const languages = [];
  for (const language of value) {
    if (typeof language !== 'string') {
      return undefined;
    }
    const normalized = language.toLowerCase();
    if (!COMPATIBLE_LANGUAGE_ORDER.includes(normalized)) {
      return undefined;
    }
    addUnique(languages, normalized);
  }

  if (languages.length === 0) {
    return undefined;
  }

  return languages.sort(
    (left, right) =>
      COMPATIBLE_LANGUAGE_ORDER.indexOf(left) - COMPATIBLE_LANGUAGE_ORDER.indexOf(right),
  );
}

async function syncMarkers(folder, expectedMarkers, language) {
  await mkdir(folder, { recursive: true });
  const existingMarkerFiles = (await readdir(folder)).filter(fileName =>
    /^S\d+\.json$/.test(fileName),
  );
  const expectedFileNames = new Set(expectedMarkers.keys());

  for (const [fileName, expectedContent] of expectedMarkers.entries()) {
    const filePath = join(folder, fileName);
    const existingContent = existsSync(filePath) ? await readFile(filePath, 'utf-8') : undefined;
    if (existingContent === expectedContent) {
      continue;
    }
    if (CHECK_MODE) {
      checkFailures.push(filePath);
      continue;
    }
    await writeFile(filePath, expectedContent);
    changedFiles.push(filePath);
  }

  for (const fileName of existingMarkerFiles) {
    if (expectedFileNames.has(fileName)) {
      continue;
    }
    const filePath = join(folder, fileName);
    if (CHECK_MODE) {
      checkFailures.push(filePath);
      continue;
    }
    await rm(filePath);
    changedFiles.push(filePath);
  }

  console.log(`${language}: ${expectedMarkers.size} RSPEC rule marker(s)`);
}

function stringifyMarker(marker) {
  if (Array.isArray(marker.compatibleLanguages) && Object.keys(marker).length === 1) {
    const compatibleLanguages = marker.compatibleLanguages
      .map(language => `"${language}"`)
      .join(', ');
    return `{\n  "compatibleLanguages": [${compatibleLanguages}]\n}\n`;
  }

  return `${JSON.stringify(marker, null, 2)}\n`;
}

function addUnique(values, value) {
  if (!values.includes(value)) {
    values.push(value);
  }
}

function sortRuleKeys(left, right) {
  return Number.parseInt(left.slice(1), 10) - Number.parseInt(right.slice(1), 10);
}
