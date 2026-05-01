/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { Linter, type Rule } from 'eslint';
import path from 'node:path';
import { transformFixes } from '../../../../src/jsts/linter/quickfixes/transform.js';
import { parseJavaScriptSourceFile } from '../../tools/helpers/parsing.js';
import * as allRules from '../../../../src/jsts/rules/rules.js';
import { decorate as decorateS7780 } from '../../../../src/jsts/rules/S7780/decorator.js';
import { describe, it } from 'node:test';
import { expect } from 'expect';

describe('transformFixes', () => {
  it('should transform an ESLint core fix', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'eslint.js');
    const { sourceCode } = await parseJavaScriptSourceFile(filePath);

    const ruleId = 'S1116';

    const linter = new Linter();
    const [message] = linter.verify(sourceCode, {
      plugins: {
        sonarjs: { rules: { [ruleId]: allRules[ruleId] } },
      },
      rules: { [`sonarjs/${ruleId}`]: 'error' },
    });
    expect(message).toEqual(expect.objectContaining({ ruleId: `sonarjs/${ruleId}` }));

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
    const { sourceCode } = await parseJavaScriptSourceFile(filePath);

    const ruleId = 'S6426';

    const linter = new Linter();
    const [message] = linter.verify(sourceCode, {
      plugins: {
        sonarjs: { rules: { [ruleId]: allRules[ruleId] } },
      },
      rules: { [`sonarjs/${ruleId}`]: 'error' },
    });
    expect(message).toEqual(expect.objectContaining({ ruleId: `sonarjs/${ruleId}` }));

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
    const { sourceCode } = await parseJavaScriptSourceFile(filePath);

    const ruleId = 'S1186';

    const linter = new Linter();
    const [message] = linter.verify(sourceCode, {
      plugins: {
        sonarjs: { rules: { [ruleId]: allRules[ruleId] } },
      },
      rules: { [`sonarjs/${ruleId}`]: 'error' },
    });
    expect(message).toEqual(expect.objectContaining({ ruleId: `sonarjs/${ruleId}` }));

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

  it('should not return quick fixes for a fixless rule', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'fixless.js');
    const { sourceCode } = await parseJavaScriptSourceFile(filePath);

    const ruleId = 'S1119';

    const linter = new Linter();
    const [message] = linter.verify(sourceCode, {
      plugins: {
        sonarjs: { rules: { [ruleId]: allRules[ruleId] } },
      },
      rules: { [`sonarjs/${ruleId}`]: 'error' },
    });
    expect(message).toEqual(expect.objectContaining({ ruleId: `sonarjs/${ruleId}` }));
    expect(message.fix).toBeUndefined();

    const quickFixes = transformFixes(sourceCode, message);
    expect(quickFixes).toEqual([]);
  });

  it('should drop malformed quick-fix ranges', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'eslint.js');
    const { sourceCode } = await parseJavaScriptSourceFile(filePath);

    const quickFixes = transformFixes(sourceCode, {
      ruleId: 'sonarjs/S1116',
      message: 'Remove extra semicolon',
      line: 1,
      column: 1,
      fix: {
        range: [-2, 1],
        text: '',
      },
    } as Linter.LintMessage);

    expect(quickFixes).toEqual([]);
  });

  it('should drop only the S7780 quick fixes that would introduce S4624 issues', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'prefer-string-raw.js');
    const { sourceCode } = await parseJavaScriptSourceFile(filePath);

    const ruleId = 'S7780';

    const linter = new Linter();
    const messages = linter.verify(sourceCode, {
      plugins: {
        sonarjs: { rules: { [ruleId]: allRules[ruleId] } },
      },
      rules: { [`sonarjs/${ruleId}`]: 'error' },
    });

    expect(messages).toHaveLength(5);

    const safeMessage = messages.find(message => message.line === 1);
    const bothBoundariesUnsafeMessage = messages.find(message => message.line === 2);
    const multilineSafeMessage = messages.find(message => message.line === 5);
    const startBoundaryUnsafeMessage = messages.find(message => message.line === 8);
    const endBoundaryUnsafeMessage = messages.find(message => message.line === 11);

    expect(safeMessage).toBeDefined();
    expect(bothBoundariesUnsafeMessage).toBeDefined();
    expect(multilineSafeMessage).toBeDefined();
    expect(startBoundaryUnsafeMessage).toBeDefined();
    expect(endBoundaryUnsafeMessage).toBeDefined();

    expect(transformFixes(sourceCode, safeMessage!)).toEqual([
      {
        message: `Use 'String.raw' template literal`,
        edits: [
          {
            loc: { line: 1, column: 10, endLine: 1, endColumn: 16 },
            text: 'String.raw`\\d+`',
          },
        ],
      },
    ]);
    expect(transformFixes(sourceCode, bothBoundariesUnsafeMessage!)).toEqual([]);
    expect(transformFixes(sourceCode, multilineSafeMessage!)).toEqual([
      {
        message: `Use 'String.raw' template literal`,
        edits: [
          {
            loc: { line: 5, column: 4, endLine: 5, endColumn: 10 },
            text: 'String.raw`\\s+`',
          },
        ],
      },
    ]);
    expect(transformFixes(sourceCode, startBoundaryUnsafeMessage!)).toEqual([]);
    expect(transformFixes(sourceCode, endBoundaryUnsafeMessage!)).toEqual([]);
  });

  it('should also drop S7780 suggestions that would introduce S4624 issues', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'prefer-string-raw.js');
    const { sourceCode } = await parseJavaScriptSourceFile(filePath);

    const ruleId = 'test/s7780-suggestion';
    const rule: Rule.RuleModule = decorateS7780({
      meta: {
        hasSuggestions: true,
        messages: {
          preferStringRaw: `Use 'String.raw' template literal`,
        },
      },
      create(context) {
        return {
          Literal(node) {
            if (typeof node.value !== 'string') {
              return;
            }

            const raw = context.sourceCode.getText(node).slice(1, -1);
            context.report({
              node,
              messageId: 'preferStringRaw',
              suggest: [
                {
                  desc: `Use 'String.raw' template literal`,
                  fix: fixer => fixer.replaceText(node, `String.raw\`${raw}\``),
                },
              ],
            });
          },
        };
      },
    });

    const linter = new Linter();
    const messages = linter.verify(sourceCode, {
      plugins: {
        test: { rules: { 's7780-suggestion': rule } },
      },
      rules: { [ruleId]: 'error' },
    });

    expect(messages).toHaveLength(5);

    const safeMessage = messages.find(message => message.line === 1);
    const bothBoundariesUnsafeMessage = messages.find(message => message.line === 2);

    expect(safeMessage).toBeDefined();
    expect(bothBoundariesUnsafeMessage).toBeDefined();

    expect(transformFixes(sourceCode, safeMessage!)).toEqual([
      {
        message: `Use 'String.raw' template literal`,
        edits: [
          {
            loc: { line: 1, column: 10, endLine: 1, endColumn: 16 },
            text: 'String.raw`\\\\d+`',
          },
        ],
      },
    ]);
    expect(transformFixes(sourceCode, bothBoundariesUnsafeMessage!)).toEqual([]);
  });
});
