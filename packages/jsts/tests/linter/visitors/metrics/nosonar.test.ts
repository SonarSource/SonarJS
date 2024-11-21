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
import path from 'path';
import { parseJavaScriptSourceFile } from '../../../tools/index.js';
import { describe, it } from 'node:test';
import { expect } from 'expect';
import { findNoSonarLines } from '../../../../src/linter/visitors/metrics/index.js';

describe('findNoSonarLines', () => {
  it('should find NOSONAR comment lines', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'nosonar.js');
    const sourceCode = await parseJavaScriptSourceFile(filePath);
    const { nosonarLines } = findNoSonarLines(sourceCode);
    expect(nosonarLines).toEqual([1, 2, 3]);
  });
});
