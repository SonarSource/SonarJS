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

export type DefaultQualityProfiles = string[] | Record<string, string[]>;

export type RuleProfileMetadata = {
  ruleKey: string;
  compatibleLanguages: Array<string>;
  defaultQualityProfiles?: DefaultQualityProfiles;
};

export type LanguageProfile = {
  name: string;
  language: string;
  ruleKeys: Array<string>;
};

export function generateLanguageProfiles(
  rules: Array<RuleProfileMetadata>,
  languages: Array<string>,
): Array<LanguageProfile> {
  const profileNames = [
    ...new Set(
      rules.flatMap(rule =>
        Array.isArray(rule.defaultQualityProfiles)
          ? rule.defaultQualityProfiles
          : Object.values(rule.defaultQualityProfiles ?? {}).flat(),
      ),
    ),
  ]
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));

  return profileNames.flatMap(name =>
    languages.map(language => ({
      name,
      language,
      ruleKeys: rules
        .filter(rule => rule.compatibleLanguages.includes(language))
        .filter(rule => profilesForLanguage(rule.defaultQualityProfiles, language).includes(name))
        .map(rule => rule.ruleKey)
        .sort(sortRuleKeys),
    })),
  );
}

export function profileNameToFileName(profileName: string, language?: string): string {
  const replacedProfileName = profileName.replace(/[^A-Za-z0-9]+/g, '_');
  let start = 0;
  let end = replacedProfileName.length;
  while (start < end && replacedProfileName[start] === '_') {
    start++;
  }
  while (end > start && replacedProfileName[end - 1] === '_') {
    end--;
  }
  const normalizedProfileName = replacedProfileName.slice(start, end);
  const fileName = normalizedProfileName.length > 0 ? normalizedProfileName : 'Profile';
  const languageSuffix = language === undefined ? '' : `_${language}`;
  return `${fileName}${languageSuffix}_profile.json`;
}

export function aggregateProfileRuleKeys(
  profiles: Array<{ ruleKeys: Array<string> }>,
): Set<string> {
  return new Set(profiles.flatMap(profile => profile.ruleKeys));
}

/**
 * Whether the rule belongs in eslint-plugin-sonarjs `configs.recommended`.
 *
 * ESLint `meta.docs.recommended` is a single boolean, and the plugin ships one
 * shared recommended config rather than per-language configs. A language-map
 * rule is therefore recommended if any language lists "Sonar way". That matches
 * the previous generate-meta behaviour, which unioned the JS and TS Sonar way
 * profile files.
 */
export function isInSonarWay(defaultQualityProfiles?: DefaultQualityProfiles): boolean {
  if (defaultQualityProfiles === undefined) {
    return false;
  }
  if (Array.isArray(defaultQualityProfiles)) {
    return defaultQualityProfiles.includes('Sonar way');
  }
  return Object.values(defaultQualityProfiles).some(profiles => profiles.includes('Sonar way'));
}

function profilesForLanguage(
  defaultQualityProfiles: DefaultQualityProfiles | undefined,
  language: string,
): Array<string> {
  if (defaultQualityProfiles === undefined || Array.isArray(defaultQualityProfiles)) {
    return defaultQualityProfiles ?? [];
  }
  return defaultQualityProfiles[language] ?? [];
}

function sortRuleKeys(left: string, right: string): number {
  return Number.parseInt(left.slice(1), 10) - Number.parseInt(right.slice(1), 10);
}
