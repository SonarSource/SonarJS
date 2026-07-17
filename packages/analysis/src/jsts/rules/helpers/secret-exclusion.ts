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
import {
  exactMatchGroups,
  patternGroups,
  type ExactMatchGroup,
  type PatternGroup,
} from './generated-secret-patterns.js';

const compiledPatterns = patternGroups.flatMap((group: PatternGroup) =>
  group.patterns.flatMap((pattern: string) => {
    try {
      return [new RegExp(pattern, 'i')];
    } catch {
      // Skip patterns using regex syntax unsupported by the JS engine.
      return [];
    }
  }),
);

const exactMatchValues = new Set(
  exactMatchGroups.flatMap((group: ExactMatchGroup) =>
    group.values.map(value => value.toLowerCase()),
  ),
);

/**
 * Tells whether a candidate secret value looks like a fake, placeholder, encrypted or
 * otherwise non-sensitive value, per the SecretClassifier patterns shared across SonarSource
 * analyzers.
 */
export function isExcludedSecretValue(value: string): boolean {
  return exactMatchValues.has(value.toLowerCase()) || compiledPatterns.some(p => p.test(value));
}
