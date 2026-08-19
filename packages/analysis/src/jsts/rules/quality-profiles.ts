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

export const SONAR_WAY = 'Sonar way';

export type DefaultQualityProfiles = string[] | Record<string, string[]>;

export type RuleQualityProfileMetadata<Language extends string> = {
  ruleKey: string;
  compatibleLanguages: Language[];
  defaultQualityProfiles?: DefaultQualityProfiles;
};

export type QualityProfileRuleKeys<Language extends string> = Map<string, Map<Language, string[]>>;

export function buildQualityProfileRuleKeys<Language extends string>(
  rules: RuleQualityProfileMetadata<Language>[],
  languages: Language[],
  ruleKeySorter: (left: string, right: string) => number,
): QualityProfileRuleKeys<Language> {
  const profileNames = new Set(
    rules
      .flatMap(rule => {
        const profiles = rule.defaultQualityProfiles;
        return profiles === undefined
          ? []
          : Array.isArray(profiles)
            ? profiles
            : Object.values(profiles).flat();
      })
      .filter(profile => profile.trim().length > 0),
  );
  if (!profileNames.has(SONAR_WAY)) {
    throw new Error(`Missing required built-in quality profile: ${SONAR_WAY}`);
  }

  const profiles: QualityProfileRuleKeys<Language> = new Map(
    [...profileNames]
      .sort()
      .map(
        profileName =>
          [
            profileName,
            new Map<Language, string[]>(languages.map(language => [language, []])),
          ] as const,
      ),
  );

  for (const rule of rules) {
    for (const language of languages) {
      if (!rule.compatibleLanguages.includes(language)) {
        continue;
      }
      for (const profileName of profilesForLanguage(rule.defaultQualityProfiles, language)) {
        profiles.get(profileName)?.get(language)?.push(rule.ruleKey);
      }
    }
  }

  for (const rulesByLanguage of profiles.values()) {
    for (const [language, ruleKeys] of rulesByLanguage) {
      rulesByLanguage.set(language, [...new Set(ruleKeys)].toSorted(ruleKeySorter));
    }
  }
  return profiles;
}

/**
 * ESLint exposes one shared recommended config rather than per-language configs, so a rule is
 * recommended when any language includes it in Sonar way.
 */
export function isInSonarWay(defaultQualityProfiles?: DefaultQualityProfiles): boolean {
  if (defaultQualityProfiles === undefined) {
    return false;
  }
  return Array.isArray(defaultQualityProfiles)
    ? defaultQualityProfiles.includes(SONAR_WAY)
    : Object.values(defaultQualityProfiles).some(profiles => profiles.includes(SONAR_WAY));
}

function profilesForLanguage(
  defaultQualityProfiles: DefaultQualityProfiles | undefined,
  language: string,
): string[] {
  if (defaultQualityProfiles === undefined || Array.isArray(defaultQualityProfiles)) {
    return defaultQualityProfiles ?? [];
  }
  return defaultQualityProfiles[language] ?? [];
}
