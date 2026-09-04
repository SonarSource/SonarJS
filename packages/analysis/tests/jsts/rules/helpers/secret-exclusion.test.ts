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
import { test, describe } from 'node:test';
import assert from 'node:assert';
import corpus from '@sonarsource/analyzer-commons-configurations/secret-exclusion-corpus.json' with { type: 'json' };
import {
  compiledPatterns,
  isExcludedSecretValue,
  unsupportedPatterns,
} from '../../../../src/jsts/rules/helpers/secret-exclusion.js';

/**
 * The corpus ships with the patterns it validates, so these tests compare this engine against the
 * upstream JVM implementation: `knownNonSecrets` are the values the patterns must suppress, and
 * `secretCandidates` the values they must leave alone. The `category` of a known non-secret records
 * which group suppresses it upstream, where matching is first-match-wins; it is informational, so
 * nothing here asserts on it.
 */
const { knownNonSecrets, secretCandidates } = corpus;

describe('secret exclusion patterns', () => {
  test('the corpus is populated, so the checks below are not vacuous', () => {
    assert.ok(knownNonSecrets.length > 0, 'corpus declares no known non-secrets');
    assert.ok(secretCandidates.length > 0, 'corpus declares no secret candidates');
    assert.ok(compiledPatterns.length > 0, 'no upstream pattern was compiled');
  });

  test('every upstream pattern compiles in this engine', () => {
    assert.deepStrictEqual(
      unsupportedPatterns,
      [],
      'patterns rejected by the JS engine exclude nothing, so the values they cover get reported as hardcoded secrets',
    );
  });

  test('every compiled pattern is exercised by the corpus', () => {
    const unexercised = compiledPatterns
      .filter(pattern => !knownNonSecrets.some(({ value }) => pattern.test(value)))
      .map(pattern => pattern.source);

    assert.deepStrictEqual(
      unexercised,
      [],
      'upstream guarantees each pattern matches at least one known non-secret, so these behave differently here than on the JVM',
    );
  });
});

describe('isExcludedSecretValue', () => {
  test('excludes every known non-secret', () => {
    const reported = knownNonSecrets
      .map(({ value }) => value)
      .filter(value => !isExcludedSecretValue(value));

    assert.deepStrictEqual(
      reported,
      [],
      'these non-secrets would be reported as hardcoded secrets',
    );
  });

  test('excludes no secret candidate', () => {
    const suppressed = secretCandidates.filter(value => isExcludedSecretValue(value));

    assert.deepStrictEqual(suppressed, [], 'these real-looking secrets would be silently hidden');
  });
});
