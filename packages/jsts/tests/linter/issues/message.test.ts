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
import { Linter, SourceCode } from 'eslint';
import { convertMessage } from '../../../src/linter/issues/message.js';
import path from 'path';
import { parseJavaScriptSourceFile } from '../../tools/index.js';
import { S1116 } from '../../../src/rules/decorated.js';
import { describe, it, Mock, mock } from 'node:test';
import { expect } from 'expect';

describe('convertMessage', () => {
  it('should convert an ESLint message into a Sonar issue', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'convert.js');
    const sourceCode = await parseJavaScriptSourceFile(filePath);

    const ruleId = 'S1116';
    const config = { rules: { [ruleId]: 'error' } } as Linter.Config;

    const linter = new Linter();
    linter.defineRule(ruleId, S1116);
    const [message] = linter.verify(sourceCode, config);

    expect(convertMessage(sourceCode, message)).toEqual({
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
    });
  });

  it('should return null when an ESLint message is missing a rule id', () => {
    console.error = mock.fn();
    expect(convertMessage({} as SourceCode, {} as Linter.LintMessage)).toEqual(null);
    const logs = (console.error as Mock<typeof console.error>).mock.calls.map(
      call => call.arguments[0],
    );
    expect(logs).toContain("Illegal 'null' ruleId for eslint issue");
  });
});
