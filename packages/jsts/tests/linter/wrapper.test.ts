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
import fs from 'fs';
import path from 'path';
import { JsTsLanguage, setContext } from '../../../shared/src/index.js';
import { CustomRule, LinterWrapper, quickFixRules, RuleConfig } from '../../src/index.js';
import { parseJavaScriptSourceFile, parseTypeScriptSourceFile } from '../tools/index.js';
import { describe, before, it } from 'node:test';
import { expect } from 'expect';

describe('LinterWrapper', () => {
  before(() => {
    setContext({
      workDir: '/tmp/workdir',
      shouldUseTypeScriptParserForJS: true,
      sonarlint: false,
      bundles: [],
    });
  });

  it('should report issues from internal rules', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'wrapper', 'internal.js');
    const sourceCode = await parseJavaScriptSourceFile(filePath);

    const ruleId = 'S2251';
    const rules = [{ key: ruleId, configurations: [], fileTypeTarget: ['MAIN'] }] as RuleConfig[];

    const linter = new LinterWrapper({ inputRules: rules });
    const { issues } = linter.lint(sourceCode, filePath);

    expect(issues).toEqual([
      expect.objectContaining({
        ruleId,
      }),
    ]);
  });

  it('should report issues from type-aware rules', async () => {
    const fixtures = path.join(import.meta.dirname, 'fixtures', 'wrapper', 'type-aware');
    const filePath = path.join(fixtures, 'file.js');
    const tsConfig = path.join(fixtures, 'tsconfig.json');

    const sourceCode = await parseJavaScriptSourceFile(filePath, [tsConfig]);

    const ruleId = 'S3403';
    const rules = [{ key: ruleId, configurations: [], fileTypeTarget: ['MAIN'] }] as RuleConfig[];

    const linter = new LinterWrapper({ inputRules: rules });
    const { issues } = linter.lint(sourceCode, filePath);

    expect(issues).toEqual([
      expect.objectContaining({
        ruleId,
      }),
    ]);
  });

  it('should report issues from custom rules', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'wrapper', 'custom-rule.js');
    const sourceCode = await parseJavaScriptSourceFile(filePath);

    const customRuleId = 'custom-rule';
    const ruleModule = await import('./fixtures/wrapper/custom-rule.js');
    const customRules: CustomRule[] = [
      {
        ruleId: customRuleId,
        ruleConfig: [],
        ruleModule: ruleModule.rule,
      },
    ];

    const rules = [
      { key: customRuleId, configurations: [], fileTypeTarget: ['MAIN'] },
    ] as RuleConfig[];

    const linter = new LinterWrapper({ inputRules: rules, customRules });

    const {
      issues: [issue],
    } = linter.lint(sourceCode, filePath, 'MAIN');

    expect(issue).toEqual(
      expect.objectContaining({
        ruleId: customRuleId,
        message:
          `Visited 'sonar-context' literal from a custom rule ` +
          `with injected contextual workDir '/tmp/workdir'.`,
      }),
    );
  });

  it('should report issues based on the file type', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'wrapper', 'file-type.js');
    const sourceCode = await parseJavaScriptSourceFile(filePath);

    const rules = [
      { key: 'S1116', configurations: [], fileTypeTarget: ['MAIN'] },
      { key: 'S3504', configurations: [], fileTypeTarget: ['TEST'] },
    ] as RuleConfig[];

    const linter = new LinterWrapper({ inputRules: rules });
    const { issues } = linter.lint(sourceCode, filePath, 'TEST');

    expect(issues).toEqual([
      expect.objectContaining({
        ruleId: 'S3504',
      }),
    ]);
  });

  it('should not report issues from decorated rules', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'wrapper', 'decorated.js');
    const sourceCode = await parseJavaScriptSourceFile(filePath);

    const ruleId = 'S3512';
    const rules = [{ key: ruleId, configurations: [], fileTypeTarget: ['MAIN'] }] as RuleConfig[];

    const linter = new LinterWrapper({ inputRules: rules });
    const { issues } = linter.lint(sourceCode, filePath);

    expect(issues).toHaveLength(0);
  });

  it('should not report issues from sanitized rules', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'wrapper', 'sanitized.ts');
    const sourceCode = await parseTypeScriptSourceFile(filePath, [], 'MAIN');

    const rules = [{ key: 'S2933', configurations: [], fileTypeTarget: ['MAIN'] }] as RuleConfig[];
    const linter = new LinterWrapper({ inputRules: rules });
    const { issues } = linter.lint(sourceCode, filePath);

    expect(issues).toHaveLength(0);
  });

  it('should report issues with secondary locations', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'wrapper', 'secondary-location.js');
    const sourceCode = await parseJavaScriptSourceFile(filePath);

    const ruleId = 'S1110';
    const rules = [{ key: ruleId, configurations: [], fileTypeTarget: ['MAIN'] }] as RuleConfig[];

    const linter = new LinterWrapper({ inputRules: rules });
    const { issues } = linter.lint(sourceCode, filePath);

    expect(issues).toEqual([
      expect.objectContaining({
        ruleId,
        line: 1,
        column: 15,
        endLine: 1,
        endColumn: 16,
        secondaryLocations: [
          {
            line: 1,
            column: 20,
            endLine: 1,
            endColumn: 21,
          },
        ],
      }),
    ]);
  });

  it('should merge "constructor-super" with "no-this-before-super" issues', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'wrapper', 'constructor-super.js');
    const fileType = 'MAIN';

    const sourceCode = await parseJavaScriptSourceFile(filePath);

    const rules = [
      { key: 'S3854', configurations: [], fileTypeTarget: [fileType] },
    ] as RuleConfig[];
    const linter = new LinterWrapper({ inputRules: rules });
    const { issues } = linter.lint(sourceCode, filePath);

    expect(issues).toHaveLength(4);
    expect(issues.every(issue => issue.ruleId === 'S3854')).toBe(true);
  });

  it('should not take into account comment-based eslint configurations', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'wrapper', 'eslint-config.js');
    const sourceCode = await parseJavaScriptSourceFile(filePath);

    const linter = new LinterWrapper();
    const { issues } = linter.lint(sourceCode, filePath);

    expect(issues).toHaveLength(0);
  });

  it('should not report on globals provided by environnments configuration', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'wrapper', 'env.js');
    const fileType = 'MAIN';
    const language: JsTsLanguage = 'js';

    const sourceCode = await parseJavaScriptSourceFile(filePath);

    const rules = [
      { key: 'S3798', configurations: [], fileTypeTarget: [fileType] },
    ] as RuleConfig[];
    const env = ['browser'];

    const linter = new LinterWrapper({ inputRules: rules, environments: env });
    const { issues } = linter.lint(sourceCode, filePath);
    const config = linter.getConfig({ language, fileType });
    expect(config.env['browser']).toEqual(true);
    expect(issues).toHaveLength(0);
  });

  it('should not report on globals provided by globals configuration', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'wrapper', 'global.js');
    const fileType = 'MAIN';
    const language: JsTsLanguage = 'js';

    const sourceCode = await parseJavaScriptSourceFile(filePath);

    const rules = [
      { key: 'S3798', configurations: [], fileTypeTarget: [fileType] },
    ] as RuleConfig[];
    const globals = ['angular'];

    const linter = new LinterWrapper({ inputRules: rules, globals });
    const { issues } = linter.lint(sourceCode, filePath);

    expect(linter.getConfig({ language, fileType }).globals['angular']).toEqual(true);
    expect(issues).toHaveLength(0);
  });

  it('should compute cognitive complexity and symbol highlighting', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'wrapper', 'cognitive-symbol.js');
    const sourceCode = await parseJavaScriptSourceFile(filePath);

    const linter = new LinterWrapper();
    const { cognitiveComplexity, highlightedSymbols } = linter.lint(sourceCode, filePath);

    expect(cognitiveComplexity).toEqual(6);
    expect(highlightedSymbols).toEqual([
      {
        declaration: {
          startLine: 1,
          startCol: 42,
          endLine: 1,
          endCol: 43,
        },
        references: [],
      },
    ]);
  });

  Array.from(quickFixRules).forEach(ruleId =>
    it(`should provide quick fixes from enabled fixable rule ${ruleId}`, async () => {
      // we ignore SXXX rules: they are aliases of ESLint keys, for which we have proper fixtures
      if (/^S\d+$/.test(ruleId)) {
        return;
      }

      const fixtures = path.join(import.meta.dirname, 'fixtures', 'wrapper', 'quickfixes');
      const files = await fs.promises.readdir(fixtures);

      let fixture: string | undefined;
      let language: JsTsLanguage;
      for (const file of files) {
        const { ext, name } = path.parse(file);
        if (ext !== '.json' && name === ruleId) {
          fixture = file;
          if (['.js', '.jsx'].includes(ext)) {
            language = 'js';
          } else {
            language = 'ts';
          }
          break;
        }
      }

      const tsConfig = path.join(fixtures, 'tsconfig.json');
      const filePath = path.join(fixtures, fixture);
      const parser = language === 'js' ? parseJavaScriptSourceFile : parseTypeScriptSourceFile;
      const sourceCode = await parser(filePath, [tsConfig]);

      const rules = [{ key: ruleId, configurations: [], fileTypeTarget: ['MAIN'] }] as RuleConfig[];
      const linter = new LinterWrapper({ inputRules: rules });
      const {
        issues: [issue],
      } = linter.lint(sourceCode, filePath);

      expect(issue).toEqual(
        expect.objectContaining({
          ruleId,
        }),
      );
      expect(issue.quickFixes.length).toBeGreaterThan(0);
    }),
  );

  it('should not provide quick fixes from disabled fixable rules', async () => {
    const filePath = path.join(
      import.meta.dirname,
      'fixtures',
      'wrapper',
      'quickfixes',
      'disabled.js',
    );
    const sourceCode = await parseJavaScriptSourceFile(filePath);

    const ruleId = 'S1105';
    const rules = [{ key: ruleId, configurations: [], fileTypeTarget: ['MAIN'] }] as RuleConfig[];

    const linter = new LinterWrapper({ inputRules: rules });
    const { issues } = linter.lint(sourceCode, filePath);

    expect(issues).toEqual([
      expect.objectContaining({
        ruleId,
        quickFixes: [],
      }),
    ]);
  });
});
