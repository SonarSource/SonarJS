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

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import exclusions from '@sonarsource/analyzer-commons-configurations/cleartext-protocol-exclusions.json' with { type: 'json' };
import corpus from '@sonarsource/analyzer-commons-configurations/cleartext-protocol-corpus.json' with { type: 'json' };
import { isSafeWithoutTls, stripJavaWhitespace } from './cleartext-protocol-exclusions.js';

describe('S5332 shared URL exclusions', () => {
  it('uses the matching operations declared by Commons', () => {
    assert.equal(exclusions.match.hostPatterns.semantics, 'find');
    assert.equal(exclusions.match.safeUrlPrefixes.semantics, 'prefix');
    assert.equal(exclusions.match.safeUrlPrefixes.target, 'fullUrl');
  });

  for (const value of corpus.safeUrls) {
    it(`excludes the shared safe URL ${JSON.stringify(value)}`, () => {
      assert.equal(isSafeWithoutTls(value), true);
    });
  }

  for (const value of corpus.unsafeUrls) {
    it(`does not exclude the shared unsafe URL ${JSON.stringify(value)}`, () => {
      assert.equal(isSafeWithoutTls(value), false);
    });
  }

  it('limits the single-label exception to valid Java URIs', () => {
    assert.equal(isSafeWithoutTls('http://my-service:65536/api'), true);
    assert.equal(isSafeWithoutTls('http://my-service:2147483648/api'), false);
    assert.equal(isSafeWithoutTls('http://my-service:<port>/api'), false);
    assert.equal(isSafeWithoutTls('http://my_service/api'), false);
    assert.equal(isSafeWithoutTls('http://my-service/a b'), false);
    assert.equal(isSafeWithoutTls('http://my-service/%xy'), false);
    assert.equal(isSafeWithoutTls('http://user[name]@my-service/api'), false);
    assert.equal(isSafeWithoutTls('http://my-service/#a#b'), false);
  });

  it('strips surrounding whitespace as Java does', () => {
    assert.equal(stripJavaWhitespace(' \tvalue\n '), 'value');
    assert.equal(stripJavaWhitespace('\u001c\u2003value\u2003\u001c'), 'value');
    assert.equal(stripJavaWhitespace('\u00a0value\u00a0'), '\u00a0value\u00a0');
  });
});
