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
import secretPatterns from '@sonarsource/analyzer-commons-configurations/secret-patterns.json' with { type: 'json' };

const { exactMatchGroups, patternGroups } = secretPatterns;

const compiled: RegExp[] = [];
const unsupported: string[] = [];

for (const group of patternGroups) {
  for (const pattern of group.patterns) {
    try {
      compiled.push(new RegExp(pattern, 'i'));
    } catch {
      // Patterns using regex syntax unsupported by the JS engine.
      unsupported.push(pattern);
    }
  }
}

/**
 * The upstream patterns this engine could compile. Exported so that tests can check every one of
 * them against the corpus shipped alongside the patterns.
 */
export const compiledPatterns: readonly RegExp[] = compiled;

/**
 * The upstream patterns this engine could not compile, and which therefore exclude nothing at
 * analysis time. Dropping one is never expected: it turns values upstream considers non-sensitive
 * back into reported hardcoded secrets. We keep analysis running rather than failing at load time,
 * and let the test suite fail on a non-empty list.
 */
export const unsupportedPatterns: readonly string[] = unsupported;

const exactMatchValues = new Set(
  exactMatchGroups.flatMap(group => group.values.map(value => value.toLowerCase())),
);

/**
 * Tells whether a candidate secret value looks like a fake, placeholder, encrypted or
 * otherwise non-sensitive value, per the SecretClassifier patterns shared across SonarSource
 * analyzers.
 */
export function isExcludedSecretValue(value: string): boolean {
  return exactMatchValues.has(value.toLowerCase()) || compiledPatterns.some(p => p.test(value));
}
