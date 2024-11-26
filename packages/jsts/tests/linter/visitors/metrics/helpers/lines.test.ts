/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { addLines } from '../../../../../src/linter/visitors/metrics/helpers/index.js';
import { describe, it } from 'node:test';
import { expect } from 'expect';

describe('addLines', () => {
  it('should add lines within a range', () => {
    const lines = new Set<number>();
    addLines(1, 5, lines);
    expect(lines).toEqual(new Set([1, 2, 3, 4, 5]));
  });
});
