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
import { computeMetrics } from '../../../../src/linter/visitors/metrics/index.js';
import { parseJavaScriptSourceFile } from '../../../tools/index.js';
import { describe, it } from 'node:test';
import { expect } from 'expect';

describe('computeMetrics', () => {
  it('should compute metrics', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'compute.js');
    const sourceCode = await parseJavaScriptSourceFile(filePath);
    const metrics = computeMetrics(sourceCode, true, 42);
    expect(metrics).toEqual({
      classes: 1,
      commentLines: [6],
      complexity: 2,
      cognitiveComplexity: 42,
      executableLines: [8],
      functions: 1,
      ncloc: [5, 7, 8, 9, 10],
      nosonarLines: [7],
      statements: 1,
    });
  });
});
