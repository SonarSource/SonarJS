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
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path/posix';
import {
  generateLanguageProfiles,
  profileNameToFileName,
  type DefaultQualityProfiles,
  type RuleProfileMetadata,
} from '../packages/analysis/src/jsts/rules/quality-profiles.js';

const SONAR_WAY = 'Sonar way';
const JS_PROFILE_LANGUAGES = ['js', 'ts'];
const RULE_MANIFEST_FILENAME = /^(S\d+)\.json$/;

const ROOT = join(import.meta.dirname, '..');

type GeneratedProfile = {
  fileName: string;
  language?: string;
  name: string;
  ruleKeys: Array<string>;
};

type RuleManifest = {
  compatibleLanguages?: Array<string>;
  defaultQualityProfiles?: DefaultQualityProfiles;
};

const JS_SOURCE = join(
  ROOT,
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

const JS_OUTPUT = join(
  ROOT,
  'sonar-plugin',
  'javascript-checks',
  'target',
  'generated-resources',
  'profiles',
  'org',
  'sonar',
  'l10n',
  'javascript',
  'rules',
  'javascript',
);

const CSS_SOURCE = join(
  ROOT,
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

const CSS_OUTPUT = join(
  ROOT,
  'sonar-plugin',
  'css',
  'target',
  'generated-resources',
  'profiles',
  'org',
  'sonar',
  'l10n',
  'css',
  'rules',
  'css',
);

const moduleArgIndex = process.argv.indexOf('--module');
const selectedModule = moduleArgIndex === -1 ? 'all' : process.argv[moduleArgIndex + 1];

if (selectedModule === 'js' || selectedModule === 'all') {
  await writeJsProfiles();
}
if (selectedModule === 'css' || selectedModule === 'all') {
  await writeCssProfiles();
}
if (selectedModule !== 'js' && selectedModule !== 'css' && selectedModule !== 'all') {
  throw new Error(`Unknown --module value: ${selectedModule}`);
}

async function writeJsProfiles() {
  const rules = await readRuleManifests(JS_SOURCE);
  const generatedProfiles: Array<GeneratedProfile> = generateLanguageProfiles(
    rules,
    JS_PROFILE_LANGUAGES,
  ).map(profile => ({
    ...profile,
    fileName: profileNameToFileName(profile.name, profile.language),
  }));

  for (const language of JS_PROFILE_LANGUAGES) {
    const fileName = profileNameToFileName(SONAR_WAY, language);
    const sonarWayProfile = generatedProfiles.find(
      profile =>
        profile.name === SONAR_WAY &&
        profile.language === language &&
        profile.fileName === fileName,
    );
    if (!sonarWayProfile) {
      throw new Error(`Missing required "Sonar way" profile definition for ${language}`);
    }
  }

  await writeProfiles(JS_OUTPUT, generatedProfiles);
}

async function writeCssProfiles() {
  const rules = await readRuleManifests(CSS_SOURCE);
  const profileRuleKeys = new Map<string, Set<string>>();

  for (const rule of rules) {
    if (rule.defaultQualityProfiles !== undefined && !Array.isArray(rule.defaultQualityProfiles)) {
      throw new Error('Language-specific quality profiles are not supported for CSS');
    }
    for (const qualityProfileName of rule.defaultQualityProfiles ?? []) {
      if (!qualityProfileName) {
        continue;
      }
      const ruleKeys = profileRuleKeys.get(qualityProfileName) ?? new Set<string>();
      ruleKeys.add(rule.ruleKey);
      profileRuleKeys.set(qualityProfileName, ruleKeys);
    }
  }

  const generatedProfiles: Array<GeneratedProfile> = [...profileRuleKeys.entries()]
    .sort(([leftName], [rightName]) => leftName.localeCompare(rightName))
    .map(([name, ruleKeys]) => ({
      fileName: profileNameToFileName(name),
      name,
      ruleKeys: [...ruleKeys].sort(sortRuleKeys),
    }));

  const sonarWayProfile = generatedProfiles.find(profile => profile.name === SONAR_WAY);
  if (!sonarWayProfile || sonarWayProfile.fileName !== profileNameToFileName(SONAR_WAY)) {
    throw new Error('Missing required "Sonar way" profile definition for CSS');
  }

  await writeProfiles(CSS_OUTPUT, generatedProfiles);
}

async function readRuleManifests(sourceFolder: string): Promise<Array<RuleProfileMetadata>> {
  const fileNames = await readdir(sourceFolder);
  const rules: Array<RuleProfileMetadata> = [];

  for (const fileName of fileNames) {
    const match = RULE_MANIFEST_FILENAME.exec(fileName);
    if (!match) {
      continue;
    }
    const manifest = JSON.parse(
      await readFile(join(sourceFolder, fileName), 'utf-8'),
    ) as RuleManifest;
    rules.push({
      ruleKey: match[1],
      compatibleLanguages: manifest.compatibleLanguages ?? [],
      defaultQualityProfiles: manifest.defaultQualityProfiles,
    });
  }

  return rules.sort((left, right) => sortRuleKeys(left.ruleKey, right.ruleKey));
}

async function writeProfiles(outputFolder: string, generatedProfiles: Array<GeneratedProfile>) {
  const duplicateFileNames = findDuplicates(generatedProfiles.map(profile => profile.fileName));
  if (duplicateFileNames.length > 0) {
    throw new Error(`Generated profile file name collision(s): ${duplicateFileNames.join(', ')}`);
  }

  await mkdir(outputFolder, { recursive: true });

  for (const generatedProfile of generatedProfiles) {
    await writeFile(
      join(outputFolder, generatedProfile.fileName),
      `${JSON.stringify(
        {
          name: generatedProfile.name,
          ruleKeys: generatedProfile.ruleKeys,
        },
        null,
        2,
      )}\n`,
    );
  }

  await writeFile(
    join(outputFolder, 'profiles.json'),
    `${JSON.stringify(
      generatedProfiles.map(({ fileName, language, name }) => ({
        fileName,
        ...(language === undefined ? {} : { language }),
        name,
      })),
      null,
      2,
    )}\n`,
  );
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
