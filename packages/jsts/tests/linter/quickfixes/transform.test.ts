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
import { rule as noExclusiveTests } from '../../../src/rules/S6426/index.js';
import { transformFixes } from '../../../src/linter/quickfixes/index.js';
import { parseJavaScriptSourceFile } from '../../tools/helpers/index.js';
import { rules as allRules } from '../../../src/rules/index.js';

describe('transformFixes', () => {
  it('should transform an ESLint core fix', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'eslint.js');
    const sourceCode = await parseJavaScriptSourceFile(filePath);

    const ruleId = 'S1116';
    const rules = { [ruleId]: 'error' } as any;

    const linter = new Linter();
    linter.defineRule(ruleId, allRules[ruleId]);
    const [message] = linter.verify(sourceCode, { rules });
    expect(message).toEqual(expect.objectContaining({ ruleId }));

    const quickFixes = transformFixes(sourceCode, message);
    expect(quickFixes).toEqual([
      {
        message: 'Remove extra semicolon',
        edits: [
          {
            loc: { line: 1, column: 28, endLine: 1, endColumn: 30 },
            text: ';',
          },
        ],
      },
    ]);
  });

  it('should transform a SonarJS suggestion', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'sonarjs.js');
    const sourceCode = await parseJavaScriptSourceFile(filePath);

    const ruleId = 'S6426';
    const rules = { [ruleId]: 'error' } as any;

    const linter = new Linter();
    linter.defineRule(ruleId, allRules[ruleId]);
    linter.defineRule(ruleId, noExclusiveTests);

    const [message] = linter.verify(sourceCode, { rules });
    expect(message).toEqual(expect.objectContaining({ ruleId }));

    const quickFixes = transformFixes(sourceCode, message);
    expect(quickFixes).toEqual([
      {
        message: `Remove ."only()".`,
        edits: [
          {
            loc: { line: 1, column: 8, endLine: 1, endColumn: 13 },
            text: '',
          },
        ],
      },
    ]);
  });

  it('should transform a fix from a decorated rule', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'decorated.js');
    const sourceCode = await parseJavaScriptSourceFile(filePath);

    const ruleId = 'S1186';
    const rules = { [ruleId]: 'error' } as any;

    const linter = new Linter();
    linter.defineRule(ruleId, allRules[ruleId]);

    const [message] = linter.verify(sourceCode, { rules });
    expect(message).toEqual(expect.objectContaining({ ruleId }));

    const quickFixes = transformFixes(sourceCode, message);
    expect(quickFixes).toEqual([
      {
        message: `Insert placeholder comment`,
        edits: [
          {
            loc: { line: 1, column: 14, endLine: 1, endColumn: 14 },
            text: ` /* TODO document why this function 'f' is empty */ `,
          },
        ],
      },
    ]);
  });

  it('should ignore an undeclared rule quick fix', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'undeclared.js');
    const sourceCode = await parseJavaScriptSourceFile(filePath);

    const ruleId = 'S1440';
    const rules = { [ruleId]: 'error' } as any;

    const linter = new Linter();
    linter.defineRule(ruleId, allRules[ruleId]);
    const [message] = linter.verify(sourceCode, { rules });
    expect(message.fix).toBeDefined();

    const quickFixes = transformFixes(sourceCode, message);
    expect(quickFixes).toEqual([]);
  });

  it('should not return quick fixes for a fixless rule', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'fixless.js');
    const sourceCode = await parseJavaScriptSourceFile(filePath);

    const ruleId = 'S1119';
    const rules = { [ruleId]: 'error' } as any;

    const linter = new Linter();
    linter.defineRule(ruleId, allRules[ruleId]);

    const [message] = linter.verify(sourceCode, { rules });
    expect(message.fix).toBeUndefined();

    const quickFixes = transformFixes(sourceCode, message);
    expect(quickFixes).toEqual([]);
  });
});
