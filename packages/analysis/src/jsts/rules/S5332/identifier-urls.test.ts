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
import identifierUrls from '@sonarsource/analyzer-commons-configurations/identifier-urls.json' with { type: 'json' };
import { isKnownIdentifierUrl } from './identifier-urls.js';

describe('S5332 identifier URL matcher', () => {
  it('uses an empty identifier inventory', () => {
    assert.deepEqual(identifierUrls, {});
  });

  it('does not match URLs when the inventory is empty', () => {
    assert.equal(isKnownIdentifierUrl('http://identifier.invalid/schema'), false);
  });
});
