/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
import { Linter, SourceCode } from 'eslint';
import { convertMessage } from 'linting/eslint/linter/issues';
import path from 'path';
import { parseJavaScriptSourceFile } from '../../../../tools';

describe('convertMessage', () => {
  it('should convert an ESLint message into a Sonar issue', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'convert.js');
    const sourceCode = (await parseJavaScriptSourceFile(filePath)) as SourceCode;

    const ruleId = 'no-extra-semi';
    const config = { rules: { [ruleId]: 'error' } } as Linter.Config;

    const linter = new Linter();
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
    console.error = jest.fn();
    expect(convertMessage({} as SourceCode, {} as Linter.LintMessage)).toEqual(null);
    expect(console.error).toHaveBeenCalledWith("Illegal 'null' ruleId for eslint issue");
  });
});
