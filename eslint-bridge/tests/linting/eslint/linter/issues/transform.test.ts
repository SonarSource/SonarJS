/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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
import path from 'path';
import { parseJavaScriptSourceFile, parseTypeScriptSourceFile } from '../../../../tools/helpers';
import { transformMessages } from 'linting/eslint/linter/issues';
import { rule as noDuplicateInComposite } from 'linting/eslint/rules/no-duplicate-in-composite';
import { rule as noUnusedFunctionArgument } from 'linting/eslint/rules/no-unused-function-argument';

describe('transformMessages', () => {
  it('should transform ESLint messages', () => {
    const filePath = path.join(__dirname, 'fixtures', 'message.js');
    const sourceCode = parseJavaScriptSourceFile(filePath) as SourceCode;

    const ruleId = 'no-var';
    const config = { rules: { [ruleId]: 'error' } } as any;

    const linter = new Linter();
    const messages = linter.verify(sourceCode, config);

    const {
      issues: [issue],
    } = transformMessages(messages, { sourceCode, rules: linter.getRules() });
    expect(issue).toEqual(
      expect.objectContaining({
        ruleId,
        line: 1,
        column: 0,
        endLine: 1,
        endColumn: 11,
        message: 'Unexpected var, use let or const instead.',
      }),
    );
  });

  it('should normalize ESLint locations', () => {
    const filePath = path.join(__dirname, 'fixtures', 'location.js');
    const sourceCode = parseJavaScriptSourceFile(filePath) as SourceCode;

    const ruleId = 'no-unused-function-argument';
    const config = { rules: { [ruleId]: 'error' } } as any;

    const linter = new Linter();
    linter.defineRule(ruleId, noUnusedFunctionArgument);

    const messages = linter.verify(sourceCode, config);

    const {
      issues: [issue],
    } = transformMessages(messages, { sourceCode, rules: linter.getRules() });
    expect(issue).toEqual(
      expect.objectContaining({
        ruleId,
        line: 1,
        column: 11,
        endLine: 1,
        endColumn: 12,
      }),
    );
  });

  it('should transform ESLint fixes', () => {
    const filePath = path.join(__dirname, 'fixtures', 'fix.js');
    const sourceCode = parseJavaScriptSourceFile(filePath) as SourceCode;

    const ruleId = 'no-extra-semi';
    const config = { rules: { [ruleId]: 'error' } } as any;

    const linter = new Linter();
    const messages = linter.verify(sourceCode, config);

    const {
      issues: [issue],
    } = transformMessages(messages, { sourceCode, rules: linter.getRules() });
    expect(issue).toEqual(
      expect.objectContaining({
        quickFixes: [
          {
            message: 'Remove extra semicolon',
            edits: [
              {
                text: ';',
                loc: {
                  line: 1,
                  column: 16,
                  endLine: 1,
                  endColumn: 18,
                },
              },
            ],
          },
        ],
      }),
    );
  });

  it('should decode secondary locations', () => {
    const filePath = path.join(__dirname, 'fixtures', 'secondary.ts');
    const tsConfigs = [];
    const sourceCode = parseTypeScriptSourceFile(filePath, tsConfigs) as SourceCode;

    const ruleId = 'no-duplicate-in-composite';
    const config = { rules: { [ruleId]: 'error' } } as any;

    const linter = new Linter();
    linter.defineRule(ruleId, noDuplicateInComposite);

    const messages = linter.verify(sourceCode, config);

    const {
      issues: [{ secondaryLocations }],
    } = transformMessages(messages, {
      sourceCode,
      rules: linter.getRules(),
    });
    expect(secondaryLocations).toEqual([
      {
        line: 1,
        column: 9,
        endLine: 1,
        endColumn: 15,
        message: 'Original',
      },
    ]);
  });
});
