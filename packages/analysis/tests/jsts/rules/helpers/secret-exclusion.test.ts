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
import { isExcludedSecretValue } from '../../../../src/jsts/rules/helpers/secret-exclusion.js';

describe('isExcludedSecretValue', () => {
  test('excludes exact-match placeholder values regardless of case', () => {
    assert.strictEqual(isExcludedSecretValue('changeit'), true);
    assert.strictEqual(isExcludedSecretValue('CHANGEIT'), true);
    assert.strictEqual(isExcludedSecretValue('Token'), true);
    assert.strictEqual(isExcludedSecretValue('hunter2'), true);
  });

  test('excludes fake-looking values', () => {
    assert.strictEqual(isExcludedSecretValue('short'), true);
    assert.strictEqual(isExcludedSecretValue('sample-value-here'), true);
    assert.strictEqual(isExcludedSecretValue('yourApiKey'), true);
    assert.strictEqual(isExcludedSecretValue('wwww'), true);
    assert.strictEqual(isExcludedSecretValue('aaaaaaaaaa'), true);
    assert.strictEqual(isExcludedSecretValue('some...value'), true);
  });

  test('excludes placeholder-shaped values', () => {
    assert.strictEqual(isExcludedSecretValue('${HMAC_KEY}'), true);
    assert.strictEqual(isExcludedSecretValue('<your-secret-here>'), true);
    assert.strictEqual(isExcludedSecretValue('%SECRET_ENV_VAR%'), true);
    assert.strictEqual(isExcludedSecretValue('process.env.SECRET'), true);
  });

  test('excludes encrypted-looking values', () => {
    assert.strictEqual(isExcludedSecretValue('{cipher}QJ8fGXwPz'), true);
    assert.strictEqual(isExcludedSecretValue('enc[QJ8fGXwPz]'), true);
  });

  test('excludes reference-shaped values', () => {
    assert.strictEqual(isExcludedSecretValue('arn:aws:secretsmanager:us-east-1:1234'), true);
    assert.strictEqual(isExcludedSecretValue('vault[secret/data]'), true);
  });

  test('excludes structured-format values such as semantic versions', () => {
    assert.strictEqual(isExcludedSecretValue('1.2.3'), true);
  });

  test('does not exclude values that look like real hardcoded secrets', () => {
    assert.strictEqual(isExcludedSecretValue('zQ9mPfXtRk3wDbnJhKp2LmQaWz'), false);
  });
});
