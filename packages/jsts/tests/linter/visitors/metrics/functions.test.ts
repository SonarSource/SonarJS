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
import { countFunctions } from '../../../../src/linter/visitors/metrics/functions.js';
import path from 'node:path';
import { parseJavaScriptSourceFile } from '../../../tools/helpers/parsing.js';
import { describe, it } from 'node:test';
import { expect } from 'expect';

describe('countFunctions', () => {
  it('should count the number of functions', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'functions.js');
    const { sourceCode } = await parseJavaScriptSourceFile(filePath);
    const statements = countFunctions(sourceCode);
    expect(statements).toEqual(6);
  });
});
