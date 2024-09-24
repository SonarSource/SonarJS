/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { Linter } from 'eslint';
import path from 'path';
import { parseJavaScriptSourceFile, parseTypeScriptSourceFile } from '../../tools/index.ts';
import { transformMessages } from '../../../src/linter/issues/index.ts';
import { rules } from '../../../src/rules/index.ts';

describe('transformMessages', () => {
  it('should transform ESLint messages', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'message.js');
    const sourceCode = await parseJavaScriptSourceFile(filePath);

    const ruleId = 'S3504';
    const config = { rules: { [ruleId]: 'error' } } as any;

    const linter = new Linter();
    linter.defineRule(ruleId, rules[ruleId]);
    const messages = linter.verify(sourceCode, config);

    const [issue] = transformMessages(messages, { sourceCode, rules: linter.getRules() }).issues;
    expect(issue).toEqual(
      expect.objectContaining({
        ruleId,
        line: 1,
        column: 0,
        endLine: 1,
        endColumn: 5,
        message: 'Unexpected var, use let or const instead.',
      }),
    );
  });

  it('should normalize ESLint locations', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'location.js');
    const sourceCode = await parseJavaScriptSourceFile(filePath);

    const ruleId = 'S1172';
    const config = { rules: { [ruleId]: 'error' } } as any;

    const linter = new Linter();
    linter.defineRule(ruleId, rules[ruleId]);

    const messages = linter.verify(sourceCode, config);

    const [issue] = transformMessages(messages, { sourceCode, rules: linter.getRules() }).issues;
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

  it('should transform ESLint fixes', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'fix.js');
    const sourceCode = await parseJavaScriptSourceFile(filePath);

    const ruleId = 'S1116';
    const config = { rules: { [ruleId]: 'error' } } as any;

    const linter = new Linter();
    linter.defineRule(ruleId, rules[ruleId]);
    const messages = linter.verify(sourceCode, config);

    const [issue] = transformMessages(messages, { sourceCode, rules: linter.getRules() }).issues;
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

  it('should decode secondary locations', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'secondary.ts');
    const tsConfigs = [];
    const sourceCode = await parseTypeScriptSourceFile(filePath, tsConfigs);

    const ruleId = 'S4621';
    const config = { rules: { [ruleId]: ['error', 'sonar-runtime'] } } as any;

    const linter = new Linter();
    linter.defineRule(ruleId, rules[ruleId]);

    const messages = linter.verify(sourceCode, config);

    const [{ secondaryLocations }] = transformMessages(messages, {
      sourceCode,
      rules: linter.getRules(),
    }).issues;
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

  it('should remove ucfg issues', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'secondary.ts');
    const tsConfigs = [];
    const sourceCode = await parseTypeScriptSourceFile(filePath, tsConfigs);

    const linter = new Linter();
    const messages = [
      {
        ruleId: 'ucfg',
        message: path.join(__dirname, 'fixtures', 'secondary.ts'),
      } as Linter.LintMessage,
    ];

    const { issues, ucfgPaths } = transformMessages(messages as Linter.LintMessage[], {
      sourceCode,
      rules: linter.getRules(),
    });
    expect(ucfgPaths.length).toEqual(1);
    expect(issues.length).toEqual(0);
  });
});
