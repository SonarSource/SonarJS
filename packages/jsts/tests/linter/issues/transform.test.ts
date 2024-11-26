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
import { Linter } from 'eslint';
import path from 'path';
import { parseJavaScriptSourceFile, parseTypeScriptSourceFile } from '../../tools/index.js';
import { transformMessages } from '../../../src/linter/issues/transform.js';
import { rules } from '../../../src/rules/index.js';
import { describe, it } from 'node:test';
import { expect } from 'expect';

describe('transformMessages', () => {
  it('should transform ESLint messages', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'message.js');
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
    const filePath = path.join(import.meta.dirname, 'fixtures', 'location.js');
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
    const filePath = path.join(import.meta.dirname, 'fixtures', 'fix.js');
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
    const filePath = path.join(import.meta.dirname, 'fixtures', 'secondary.ts');
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
    const filePath = path.join(import.meta.dirname, 'fixtures', 'secondary.ts');
    const tsConfigs = [];
    const sourceCode = await parseTypeScriptSourceFile(filePath, tsConfigs);

    const linter = new Linter();
    const messages = [
      {
        ruleId: 'ucfg',
        message: path.join(import.meta.dirname, 'fixtures', 'secondary.ts'),
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
