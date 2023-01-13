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
import path from 'path';
import { SourceCode } from 'eslint';
import { setContext } from 'helpers';
import { CustomRule, LinterWrapper, quickFixRules, RuleConfig } from 'linting/eslint';
import { Language } from 'parsing/jsts';
import { parseJavaScriptSourceFile, parseTypeScriptSourceFile } from '../../../tools';
import { fileReadable } from '../../../tools/helpers/files';

describe('LinterWrapper', () => {
  beforeAll(() => {
    setContext({
      workDir: '/tmp/workdir',
      shouldUseTypeScriptParserForJS: true,
      sonarlint: false,
      bundles: [],
    });
  });

  it('should report issues from internal rules', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'wrapper', 'internal.js');
    const sourceCode = (await parseJavaScriptSourceFile(filePath)) as SourceCode;

    const ruleId = 'no-new-symbol';
    const rules = [{ key: ruleId, configurations: [], fileTypeTarget: ['MAIN'] }] as RuleConfig[];

    const linter = new LinterWrapper({ inputRules: rules });
    const { issues } = linter.lint(sourceCode, filePath);

    expect(issues).toEqual([
      expect.objectContaining({
        ruleId,
      }),
    ]);
  });

  it('should report issues from ESLint rules', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'wrapper', 'eslint.js');
    const sourceCode = (await parseJavaScriptSourceFile(filePath)) as SourceCode;

    const ruleId = 'no-extra-semi';
    const rules = [{ key: ruleId, configurations: [], fileTypeTarget: ['MAIN'] }] as RuleConfig[];

    const linter = new LinterWrapper({ inputRules: rules });
    const { issues } = linter.lint(sourceCode, filePath);

    expect(issues).toEqual([
      expect.objectContaining({
        ruleId,
      }),
    ]);
  });

  it('should report issues from TypeScript ESLint rules', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'wrapper', 'typescript-eslint.ts');
    const sourceCode = (await parseTypeScriptSourceFile(filePath, [])) as SourceCode;

    const ruleId = 'array-type';
    const rules = [{ key: ruleId, configurations: [], fileTypeTarget: ['MAIN'] }] as RuleConfig[];

    const linter = new LinterWrapper({ inputRules: rules });
    const { issues } = linter.lint(sourceCode, filePath);

    expect(issues).toEqual([
      expect.objectContaining({
        ruleId,
      }),
    ]);
  });

  it('should report issues from eslint-plugin-react rules', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'wrapper', 'eslint-plugin-react.js');
    const sourceCode = (await parseTypeScriptSourceFile(filePath, [])) as SourceCode;

    const ruleId = 'jsx-no-comment-textnodes';
    const rules = [{ key: ruleId, configurations: [], fileTypeTarget: ['MAIN'] }] as RuleConfig[];

    const linter = new LinterWrapper({ inputRules: rules });
    const { issues } = linter.lint(sourceCode, filePath);

    expect(issues).toEqual([
      expect.objectContaining({
        ruleId,
      }),
    ]);
  });

  it('should report issues from eslint-plugin-sonarjs rules', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'wrapper', 'eslint-plugin-sonarjs.js');
    const sourceCode = (await parseJavaScriptSourceFile(filePath)) as SourceCode;

    const ruleId = 'no-all-duplicated-branches';
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
    const fixtures = path.join(__dirname, 'fixtures', 'wrapper', 'type-aware');
    const filePath = path.join(fixtures, 'file.js');
    const tsConfig = path.join(fixtures, 'tsconfig.json');

    const sourceCode = (await parseJavaScriptSourceFile(filePath, [tsConfig])) as SourceCode;

    const ruleId = 'different-types-comparison';
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
    const filePath = path.join(__dirname, 'fixtures', 'wrapper', 'custom-rule.js');
    const sourceCode = (await parseJavaScriptSourceFile(filePath)) as SourceCode;

    const customRuleId = 'custom-rule';
    const customRules: CustomRule[] = [
      {
        ruleId: customRuleId,
        ruleConfig: [],
        ruleModule: require(path.join(__dirname, 'fixtures', 'wrapper', 'custom-rule.ts')).rule,
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
          `Visited 'Today here, tomorrow the world!' literal from a custom rule ` +
          `with injected contextual workDir '/tmp/workdir'.`,
      }),
    );
  });

  it('should report issues based on the file type', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'wrapper', 'file-type.js');
    const sourceCode = (await parseJavaScriptSourceFile(filePath)) as SourceCode;

    const rules = [
      { key: 'no-extra-semi', configurations: [], fileTypeTarget: ['MAIN'] },
      { key: 'no-var', configurations: [], fileTypeTarget: ['TEST'] },
    ] as RuleConfig[];

    const linter = new LinterWrapper({ inputRules: rules });
    const { issues } = linter.lint(sourceCode, filePath, 'TEST');

    expect(issues).toEqual([
      expect.objectContaining({
        ruleId: 'no-var',
      }),
    ]);
  });

  it('should not report issues from decorated rules', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'wrapper', 'decorated.js');
    const sourceCode = (await parseJavaScriptSourceFile(filePath)) as SourceCode;

    const ruleId = 'prefer-template';
    const rules = [{ key: ruleId, configurations: [], fileTypeTarget: ['MAIN'] }] as RuleConfig[];

    const linter = new LinterWrapper({ inputRules: rules });
    const { issues } = linter.lint(sourceCode, filePath);

    expect(issues).toHaveLength(0);
  });

  it('should not report issues from sanitized rules', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'wrapper', 'sanitized.ts');
    const sourceCode = (await parseTypeScriptSourceFile(filePath, [])) as SourceCode;

    const rules = [
      { key: 'prefer-readonly', configurations: [], fileTypeTarget: ['MAIN'] },
    ] as RuleConfig[];
    const linter = new LinterWrapper({ inputRules: rules });
    const { issues } = linter.lint(sourceCode, filePath);

    expect(issues).toHaveLength(0);
  });

  it('should report issues with secondary locations', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'wrapper', 'secondary-location.js');
    const sourceCode = (await parseJavaScriptSourceFile(filePath)) as SourceCode;

    const ruleId = 'no-redundant-parentheses';
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
    const filePath = path.join(__dirname, 'fixtures', 'wrapper', 'constructor-super.js');
    const fileType = 'MAIN';

    const sourceCode = (await parseJavaScriptSourceFile(filePath)) as SourceCode;

    const rules = [
      { key: 'super-invocation', configurations: [], fileTypeTarget: [fileType] },
    ] as RuleConfig[];
    const linter = new LinterWrapper({ inputRules: rules });
    const { issues } = linter.lint(sourceCode, filePath);

    expect(issues).toHaveLength(4);
    expect(issues.every(issue => issue.ruleId === 'super-invocation')).toBe(true);
  });

  it('should not take into account comment-based eslint configurations', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'wrapper', 'eslint-config.js');
    const sourceCode = (await parseJavaScriptSourceFile(filePath)) as SourceCode;

    const linter = new LinterWrapper();
    const { issues } = linter.lint(sourceCode, filePath);

    expect(issues).toHaveLength(0);
  });

  it('should not report on globals provided by environnments configuration', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'wrapper', 'env.js');
    const fileType = 'MAIN';

    const sourceCode = (await parseJavaScriptSourceFile(filePath)) as SourceCode;

    const rules = [
      { key: 'declarations-in-global-scope', configurations: [], fileTypeTarget: [fileType] },
    ] as RuleConfig[];
    const env = ['browser'];

    const linter = new LinterWrapper({ inputRules: rules, environments: env });
    const { issues } = linter.lint(sourceCode, filePath);

    expect(linter.config[fileType].env['browser']).toEqual(true);
    expect(issues).toHaveLength(0);
  });

  it('should not report on globals provided by globals configuration', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'wrapper', 'global.js');
    const fileType = 'MAIN';

    const sourceCode = (await parseJavaScriptSourceFile(filePath)) as SourceCode;

    const rules = [
      { key: 'declarations-in-global-scope', configurations: [], fileTypeTarget: [fileType] },
    ] as RuleConfig[];
    const globals = ['angular'];

    const linter = new LinterWrapper({ inputRules: rules, globals });
    const { issues } = linter.lint(sourceCode, filePath);

    expect(linter.config[fileType].globals['angular']).toEqual(true);
    expect(issues).toHaveLength(0);
  });

  it('should compute cognitive complexity and symbol highlighting', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'wrapper', 'cognitive-symbol.js');
    const sourceCode = (await parseJavaScriptSourceFile(filePath)) as SourceCode;

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

  test.each(Array.from(quickFixRules))(
    `should provide quick fixes from enabled fixable rule '%s'`,
    async ruleId => {
      const fixtures = path.join(__dirname, 'fixtures', 'wrapper', 'quickfixes');
      let language: Language;
      if (await fileReadable(path.join(fixtures, `${ruleId}.js`))) {
        language = 'js';
      } else if (await fileReadable(path.join(fixtures, `${ruleId}.ts`))) {
        language = 'ts';
      } else {
        throw new Error(`Failed to find fixture file for rule '${ruleId}' in '${fixtures}'.`);
      }

      const tsConfig = path.join(fixtures, 'tsconfig.json');
      const filePath = path.join(fixtures, `${ruleId}.${language}`);
      let sourceCode: SourceCode;
      if (language === 'js') {
        sourceCode = (await parseJavaScriptSourceFile(filePath, [tsConfig])) as SourceCode;
      } else {
        sourceCode = (await parseTypeScriptSourceFile(filePath, [tsConfig])) as SourceCode;
      }

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
    },
  );

  it('should not provide quick fixes from disabled fixable rules', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'wrapper', 'quickfixes', 'disabled.js');
    const sourceCode = (await parseJavaScriptSourceFile(filePath)) as SourceCode;

    const ruleId = 'brace-style';
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
