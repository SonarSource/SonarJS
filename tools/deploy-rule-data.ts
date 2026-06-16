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
import { execFileSync } from 'node:child_process';
import { listRulesDir } from './helpers.js';
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join as joinNative } from 'node:path';
import { dirname, join, resolve } from 'node:path/posix';
import { cssRulesMeta } from '../packages/analysis/src/css/rules/metadata.js';

const sourceFolder = resolve('resources/rule-data');

const JS_RULE_DATA_FOLDER = join(
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

const CSS_RULE_DATA_FOLDER = join(
  'sonar-plugin',
  'css',
  'src',
  'main',
  'resources',
  'org',
  'sonar',
  'l10n',
  'css',
  'rules',
  'css',
);

const RSPEC_SHA_FILES = {
  javascript: {
    envName: 'RSPEC_JAVASCRIPT_SHA',
    marker: join('resources', 'rule-data', '.synced-sha-javascript'),
    target: join('sonar-plugin', 'javascript-checks', 'src', 'main', 'resources', 'rspec.sha'),
  },
  css: {
    envName: 'RSPEC_CSS_SHA',
    marker: join('resources', 'rule-data', '.synced-sha-css'),
    target: join('sonar-plugin', 'css', 'src', 'main', 'resources', 'rspec.sha'),
  },
} as const;

const jsRuleNames = [...new Set([...(await listRulesDir()), 'S2260'])].sort(sortRuleKeys);
const cssRuleNames = [...new Set([...cssRulesMeta.map(rule => rule.sqKey), 'S2260'])].sort(
  sortRuleKeys,
);

type RuleManifest = {
  defaultQualityProfiles?: Array<string>;
  status?: string;
};

const SONAR_WAY = 'Sonar way';
const SONAR_WAY_PROFILE_FILENAME = 'Sonar_way_profile.json';

type GeneratedProfile = {
  fileName: string;
  name: string;
  ruleKeys: Array<string>;
};

type JsonValue = JsonObject | Array<JsonValue> | boolean | number | string | null;
type JsonObject = {
  [key: string]: JsonValue;
};

const OVERRIDES_FOLDER = resolve('tools/rule-data-overrides');

applyRuleDataOverrides('javascript', join(sourceFolder, 'javascript'));
applyRuleDataOverrides('css', join(sourceFolder, 'css'));

syncRuleData(join(sourceFolder, 'javascript'), JS_RULE_DATA_FOLDER, jsRuleNames);
syncRuleData(join(sourceFolder, 'css'), CSS_RULE_DATA_FOLDER, cssRuleNames);
syncRspecShas();

function applyRuleDataOverrides(language: string, targetFolder: string): void {
  const overrideFolder = join(OVERRIDES_FOLDER, language);
  let entries: string[];
  try {
    entries = readdirSync(overrideFolder);
  } catch {
    return;
  }
  mkdirSync(targetFolder, { recursive: true });
  for (const entry of entries) {
    copyFileSync(join(overrideFolder, entry), join(targetFolder, entry));
  }
  if (entries.length > 0) {
    console.log(`[deploy-rule-data] ${language}: applied ${entries.length} override file(s)`);
  }
}

function syncRuleData(sourceFolder: string, targetFolder: string, ruleNames: string[]) {
  warnOnRulesWithoutImplementation(sourceFolder, ruleNames);
  const existingManifests = new Map(
    ruleNames
      .map(
        ruleName => [ruleName, readJsonIfExists(join(targetFolder, `${ruleName}.json`))] as const,
      )
      .filter(([, manifest]) => manifest !== undefined),
  );

  rmSync(targetFolder, {
    recursive: true,
    force: true,
  });

  mkdirSync(targetFolder, {
    recursive: true,
  });

  const profileRuleKeys = new Map<string, Set<string>>();

  for (const ruleName of ruleNames) {
    const sourceJsonPath = join(sourceFolder, `${ruleName}.json`);
    const targetJsonPath = join(targetFolder, `${ruleName}.json`);
    const existingManifest = existingManifests.get(ruleName);
    const manifest = writeNormalizedManifest(sourceJsonPath, targetJsonPath, existingManifest);
    copyFileSync(join(sourceFolder, `${ruleName}.html`), join(targetFolder, `${ruleName}.html`));

    for (const qualityProfileName of manifest.defaultQualityProfiles ?? []) {
      if (!qualityProfileName) {
        continue;
      }
      const ruleKeys = profileRuleKeys.get(qualityProfileName) ?? new Set<string>();
      ruleKeys.add(ruleName);
      profileRuleKeys.set(qualityProfileName, ruleKeys);
    }
  }

  const generatedProfiles: Array<GeneratedProfile> = [...profileRuleKeys.entries()]
    .sort(([leftName], [rightName]) => leftName.localeCompare(rightName))
    .map(([name, ruleKeys]) => ({
      fileName: profileNameToFileName(name),
      name,
      ruleKeys: [...ruleKeys].sort(),
    }));

  const duplicateFileNames = findDuplicates(generatedProfiles.map(profile => profile.fileName));
  if (duplicateFileNames.length > 0) {
    throw new Error(
      `Generated profile file name collision(s): ${duplicateFileNames.join(', ')} in ${sourceFolder}`,
    );
  }

  const sonarWayProfile = generatedProfiles.find(profile => profile.name === SONAR_WAY);
  if (!sonarWayProfile || sonarWayProfile.fileName !== SONAR_WAY_PROFILE_FILENAME) {
    throw new Error(`Missing required "Sonar way" profile definition in ${sourceFolder}`);
  }

  for (const generatedProfile of generatedProfiles) {
    writeFileSync(
      join(targetFolder, generatedProfile.fileName),
      JSON.stringify({
        name: generatedProfile.name,
        ruleKeys: generatedProfile.ruleKeys,
      }),
    );
  }

  writeFileSync(
    join(targetFolder, 'profiles.json'),
    JSON.stringify(
      generatedProfiles.map(({ fileName, name }) => ({
        fileName,
        name,
      })),
    ),
  );
}

function syncRspecShas() {
  const repositorySha = readRspecRepositorySha();

  for (const paths of Object.values(RSPEC_SHA_FILES)) {
    const sha = readEnvSha(paths.envName) ?? repositorySha ?? readShaIfExists(paths.marker);
    if (sha === undefined) {
      throw new Error(
        `Failed to resolve RSPEC SHA for ${paths.target}: ${paths.envName} is not set and no local RSPEC repository or marker exists`,
      );
    }

    mkdirSync(dirname(paths.marker), {
      recursive: true,
    });
    writeFileSync(paths.marker, `${sha}\n`);

    mkdirSync(dirname(paths.target), {
      recursive: true,
    });
    writeFileSync(paths.target, `${sha}\n`);
  }
}

function readRspecRepositorySha(): string | undefined {
  const sonarUserHome = process.env.SONAR_USER_HOME ?? joinNative(homedir(), '.sonar');
  const rspecRepository = joinNative(sonarUserHome, 'rule-api', 'rspec');

  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: rspecRepository,
      encoding: 'utf-8',
    }).trim();
  } catch {
    return undefined;
  }
}

function readEnvSha(envName: string): string | undefined {
  const value = process.env[envName]?.trim();
  if (value === undefined || value.length === 0 || /^\$\{.+}$/.test(value)) {
    return undefined;
  }
  return value;
}

function readShaIfExists(path: string): string | undefined {
  try {
    const value = readFileSync(path, 'utf-8').trim();
    return value.length === 0 ? undefined : value;
  } catch {
    return undefined;
  }
}

function writeNormalizedManifest(
  sourcePath: string,
  targetPath: string,
  existingManifest: JsonValue | undefined,
): RuleManifest {
  const manifest = JSON.parse(readFileSync(sourcePath, 'utf-8')) as JsonValue;
  const normalizedManifest = reorderJsonLike(manifest, existingManifest);
  writeFileSync(targetPath, `${JSON.stringify(normalizedManifest, null, 2)}\n`);
  return normalizedManifest as RuleManifest;
}

function readJsonIfExists(path: string): JsonValue | undefined {
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as JsonValue;
  } catch {
    return undefined;
  }
}

function reorderJsonLike(value: JsonValue, reference: JsonValue | undefined): JsonValue {
  if (Array.isArray(value)) {
    if (Array.isArray(reference) && isScalarArray(value) && isScalarArray(reference)) {
      return reorderScalarArray(value, reference);
    }
    return value.map((item, index) =>
      reorderJsonLike(item, Array.isArray(reference) ? reference[index] : undefined),
    );
  }

  if (!isJsonObject(value)) {
    return value;
  }

  const orderedObject: JsonObject = {};
  const referenceObject = isJsonObject(reference) ? reference : undefined;

  for (const key of Object.keys(referenceObject ?? {})) {
    if (Object.hasOwn(value, key)) {
      orderedObject[key] = reorderJsonLike(value[key], referenceObject?.[key]);
    }
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    if (!Object.hasOwn(orderedObject, key)) {
      orderedObject[key] = reorderJsonLike(nestedValue, referenceObject?.[key]);
    }
  }

  return orderedObject;
}

function isJsonObject(value: JsonValue | undefined): value is JsonObject {
  return (
    value !== null && value !== undefined && !Array.isArray(value) && typeof value === 'object'
  );
}

function isScalarArray(values: Array<JsonValue>): boolean {
  return values.every(value => value === null || typeof value !== 'object');
}

function reorderScalarArray(
  values: Array<boolean | number | string | null>,
  reference: Array<boolean | number | string | null>,
): Array<boolean | number | string | null> {
  const remainingValues = [...values];
  const orderedValues = reference
    .map(referenceValue => {
      const index = remainingValues.findIndex(value => Object.is(value, referenceValue));
      if (index === -1) {
        return undefined;
      }
      return remainingValues.splice(index, 1)[0];
    })
    .filter(value => value !== undefined);
  return [...orderedValues, ...remainingValues];
}

function warnOnRulesWithoutImplementation(sourceFolder: string, ruleNames: string[]) {
  const language = sourceFolder.endsWith('/javascript') ? 'javascript' : 'css';
  const ruleNameSet = new Set(ruleNames);
  const rspecRules = readdirSync(sourceFolder)
    .map(fileName => /^(S\d+)\.json$/.exec(fileName)?.[1])
    .filter((ruleName): ruleName is string => ruleName !== undefined)
    .map(ruleName => ({
      ruleName,
      status: readRuleStatus(sourceFolder, ruleName),
    }))
    .sort((left, right) => sortRuleKeys(left.ruleName, right.ruleName));
  const missingImplementations = rspecRules.filter(rule => !ruleNameSet.has(rule.ruleName));

  if (missingImplementations.length > 0) {
    const missingByStatus = groupRulesByStatus(missingImplementations);
    const statusDetails = [...missingByStatus.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([status, ruleKeys]) => `  ${status} (${ruleKeys.length}): ${ruleKeys.join(', ')}`)
      .join('\n');
    const ownershipHints =
      language === 'javascript'
        ? [
            'Possible non-SonarJS owners for some "ready" rules:',
            '  - sonar-architecture JS/TS rules list:',
            '    https://github.com/SonarSource/sonar-architecture/blob/master/frontend/javascript/src/main/java/com/sonarsource/architecture/ArchitectureJsRulesDefinition.java',
            '  - sonar-armor JS/TS rspec rules (source of truth):',
            '    https://github.com/SonarSource/sonar-armor/tree/master/sonar-jasmin-plugin/src/main/resources/rspec/jasmin/rules',
          ].join('\n')
        : '';
    console.warn(
      `[deploy-rule-data] ${language}: ${missingImplementations.length} rspec rule(s) have a ${language} folder but no implementation in SonarJS:\n${statusDetails}`,
      ownershipHints ? `\n${ownershipHints}` : '',
    );
  }
}

function readRuleStatus(sourceFolder: string, ruleName: string): string {
  try {
    const manifest: RuleManifest = JSON.parse(
      readFileSync(join(sourceFolder, `${ruleName}.json`), 'utf-8'),
    );
    return manifest.status ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

function groupRulesByStatus(
  missingRules: Array<{
    ruleName: string;
    status: string;
  }>,
): Map<string, Array<string>> {
  const grouped = new Map<string, Array<string>>();
  for (const missingRule of missingRules) {
    const ruleKeys = grouped.get(missingRule.status) ?? [];
    ruleKeys.push(missingRule.ruleName);
    grouped.set(missingRule.status, ruleKeys);
  }
  for (const [, ruleKeys] of grouped.entries()) {
    ruleKeys.sort(sortRuleKeys);
  }
  return grouped;
}

function profileNameToFileName(profileName: string): string {
  const normalizedProfileName = profileName.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  const fileName = normalizedProfileName.length > 0 ? normalizedProfileName : 'Profile';
  return `${fileName}_profile.json`;
}

function findDuplicates(values: Array<string>): Array<string> {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count > 1).map(([value]) => value);
}

function sortRuleKeys(left: string, right: string): number {
  return Number.parseInt(left.slice(1), 10) - Number.parseInt(right.slice(1), 10);
}
