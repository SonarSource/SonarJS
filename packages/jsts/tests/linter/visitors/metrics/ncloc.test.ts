/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
import { findNcloc } from '../../../../src/linter/visitors/metrics/ncloc.js';
import path from 'node:path';
import { parseJavaScriptSourceFile } from '../../../tools/helpers/parsing.js';
import { describe, it } from 'node:test';
import { expect } from 'expect';

describe('findNcloc', () => {
  it('should find the line numbers of code', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures/ncloc.js');
    const { sourceCode } = await parseJavaScriptSourceFile(filePath);
    const nloc = findNcloc(sourceCode);
    expect(nloc).toEqual([4, 6, 7, 8, 9, 11]);
  });

  it('should find the line numbers of code in Vue.js', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures/ncloc.vue');
    const { sourceCode } = await parseJavaScriptSourceFile(filePath);
    const nloc = findNcloc(sourceCode);
    expect(nloc).toEqual([
      1, 2, 3, 7, 8, 9, 11, 12, 13, 14, 18, 19, 20, 21, 22, 24, 25, 30, 31, 32,
    ]);
  });
});
