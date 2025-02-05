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
import { Linter, SourceCode } from 'eslint';
import { convertMessage } from '../../../src/linter/issues/message.js';
import path from 'path';
import { parseJavaScriptSourceFile } from '../../tools/helpers/parsing.js';
import { rule as S1116 } from '../../../src/rules/S1116/index.js';
import { describe, it } from 'node:test';
import { expect } from 'expect';

describe('convertMessage', () => {
  it('should convert an ESLint message into a Sonar issue', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'convert.js');
    const { sourceCode } = await parseJavaScriptSourceFile(filePath);

    const ruleId = 'S1116';
    const linter = new Linter();
    const [message] = linter.verify(sourceCode, {
      plugins: {
        sonarjs: { rules: { [ruleId]: S1116 } },
      },
      rules: { [`sonarjs/${ruleId}`]: 'error' },
    });

    expect(convertMessage(sourceCode, message, 'foo.bar')).toEqual({
      ruleId,
      line: 1,
      column: 9,
      endLine: 1,
      endColumn: 10,
      message: 'Unnecessary semicolon.',
      quickFixes: [
        {
          message: 'Remove extra semicolon',
          edits: [
            {
              text: ';',
              loc: {
                line: 1,
                column: 7,
                endLine: 1,
                endColumn: 9,
              },
            },
          ],
        },
      ],
      secondaryLocations: [],
      ruleESLintKeys: ['no-extra-semi'],
      filePath: 'foo.bar',
    });
  });

  it('should return null when an ESLint message is missing a rule id', () => {
    expect(convertMessage({} as SourceCode, {} as Linter.LintMessage, '')).toEqual(null);
  });
});
