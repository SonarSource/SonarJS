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
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isStrictNullChecksEnabled } from './compiler-options.js';

describe('isStrictNullChecksEnabled', () => {
  it('uses the active compiler default when strict flags are absent', () => {
    assert.equal(isStrictNullChecksEnabled({}, '5.9'), false);
    assert.equal(isStrictNullChecksEnabled({}, '6.0'), true);
    assert.equal(isStrictNullChecksEnabled({}, '7.0'), true);
  });

  it('honors strict and explicit strictNullChecks overrides', () => {
    for (const version of ['5.9', '6.0']) {
      assert.equal(isStrictNullChecksEnabled({ strict: true }, version), true);
      assert.equal(isStrictNullChecksEnabled({ strict: false }, version), false);
      assert.equal(isStrictNullChecksEnabled({ strictNullChecks: false }, version), false);
      assert.equal(
        isStrictNullChecksEnabled({ strict: true, strictNullChecks: false }, version),
        false,
      );
      assert.equal(
        isStrictNullChecksEnabled({ strict: false, strictNullChecks: true }, version),
        true,
      );
    }
  });
});
