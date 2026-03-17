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
import { join, resolve } from 'node:path/posix';
import { listRulesDir } from './helpers.js';
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { cssRulesMeta } from '../packages/css/src/rules/metadata.js';

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

syncRuleData(join(sourceFolder, 'javascript'), JS_RULE_DATA_FOLDER, jsRuleNames);
syncRuleData(join(sourceFolder, 'css'), CSS_RULE_DATA_FOLDER, cssRuleNames);

function syncRuleData(sourceFolder: string, targetFolder: string, ruleNames: string[]) {
  warnOnRulesWithoutImplementation(sourceFolder, ruleNames);

  rmSync(targetFolder, {
    recursive: true,
    force: true,
  });

  mkdirSync(targetFolder, {
    recursive: true,
  });

  const profileRuleKeys = new Map<string, Set<string>>();

  for (const ruleName of ruleNames) {
    for (const extension of ['json', 'html']) {
      const fileName = `${ruleName}.${extension}`;
      copyFileSync(join(sourceFolder, fileName), join(targetFolder, fileName));
    }
    const manifest: RuleManifest = JSON.parse(
      readFileSync(join(sourceFolder, `${ruleName}.json`), 'utf-8'),
    );

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
    console.warn(
      `[deploy-rule-data] ${language}: ${missingImplementations.length} rspec rule(s) have a ${language} folder but no implementation in SonarJS:\n${statusDetails}`,
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
