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
  getComponentIdentifier,
  hasIdentifierId,
  isClassComponentNode,
  isFunctionComponentNode,
  isPascalCaseFunctionComponent,
  isVariableAssignedFunctionOrClassExpression,
  isVariableDeclaratorWithIdentifierId,
} from './react.js';
import assert from 'node:assert';
import { describe, it } from 'node:test';

describe('react helper exports', () => {
  it('should expose shared component-shape helpers for S6767 non-props usage', () => {
    assert.strictEqual(typeof isClassComponentNode, 'function');
    assert.strictEqual(typeof isFunctionComponentNode, 'function');
    assert.strictEqual(typeof isPascalCaseFunctionComponent, 'function');
    assert.strictEqual(typeof getComponentIdentifier, 'function');
    assert.strictEqual(typeof isVariableAssignedFunctionOrClassExpression, 'function');
    assert.strictEqual(typeof hasIdentifierId, 'function');
    assert.strictEqual(typeof isVariableDeclaratorWithIdentifierId, 'function');
  });
});
