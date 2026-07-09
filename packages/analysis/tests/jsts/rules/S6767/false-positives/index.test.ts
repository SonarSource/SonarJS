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
import type estree from 'estree';
import { describe, it } from 'node:test';
import { expect } from 'expect';
import { allMatch } from '../../../../../src/jsts/rules/S6767/false-positives/index.js';

describe('S6767 false-positives index', () => {
  it('returns false for empty component-node lists', () => {
    expect(allMatch([], () => true)).toBe(false);
  });

  it('requires every component node to match the predicate', () => {
    const firstNode = { type: 'Identifier', name: 'first' } as estree.Identifier;
    const secondNode = { type: 'Identifier', name: 'second' } as estree.Identifier;

    expect(allMatch([firstNode, secondNode], node => node === firstNode)).toBe(false);
    expect(allMatch([firstNode, secondNode], () => true)).toBe(true);
  });
});
