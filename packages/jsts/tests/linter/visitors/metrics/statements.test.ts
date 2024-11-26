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
import { countStatements } from '../../../../src/linter/visitors/metrics/statements.js';
import path from 'path';
import { parseJavaScriptSourceFile } from '../../../tools/index.js';
import { describe, it } from 'node:test';
import { expect } from 'expect';

describe('countStatements', () => {
  it('should count the number of statements', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'statements.js');
    const sourceCode = await parseJavaScriptSourceFile(filePath);
    const statements = countStatements(sourceCode);
    expect(statements).toEqual(10);
  });
});
