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
import path from 'path';
import { setContext, toUnixPath, APIError } from '@sonar/shared';
import {
  initializeLinter,
  RuleConfig,
  analyzeJSTS,
  JsTsAnalysisOutput,
  createAndSaveProgram,
  deserializeProtobuf,
} from '../../src';
import { jsTsInput, parseJavaScriptSourceFile } from '../tools';
import { Linter, Rule } from 'eslint';
import { getNearestPackageJsons, loadPackageJsons } from '../../src/rules/helpers';
describe('analyzeJSTS', () => {
  beforeEach(() => {
    jest.resetModules();
    setContext({
      workDir: '/tmp/dir',
      shouldUseTypeScriptParserForJS: false,
      sonarlint: false,
      bundles: [],
    });
  });

  it('should fail on uninitialized linter', async () => {
    const input = {} as any;
    const language = 'js';
    expect(() => analyzeJSTS(input, language)).toThrow(
      APIError.linterError('Linter default does not exist. Did you call /init-linter?'),
    );
  });

  it('should analyze JavaScript code with the given linter', async () => {
    const rules = [
      { key: 'prefer-default-last', configurations: [], fileTypeTarget: ['MAIN'] },
    ] as RuleConfig[];
    initializeLinter(rules);
    initializeLinter([], [], [], 'empty');

    const filePath = path.join(__dirname, 'fixtures', 'code.js');
    const language = 'js';

    const {
      issues: [issue],
    } = analyzeJSTS(await jsTsInput({ filePath }), language) as JsTsAnalysisOutput;

    const { issues } = analyzeJSTS(
      await jsTsInput({ filePath, linterId: 'empty' }),
      language,
    ) as JsTsAnalysisOutput;

    expect(issue).toEqual(
      expect.objectContaining({
        ruleId: 'prefer-default-last',
      }),
    );

    expect(issues).toHaveLength(0);
  });

  it('should analyze TypeScript code with the given linter', async () => {
    const rules = [
      { key: 'bool-param-default', configurations: [], fileTypeTarget: ['MAIN'] },
    ] as RuleConfig[];
    initializeLinter(rules);
    initializeLinter([], [], [], 'empty');

    const filePath = path.join(__dirname, 'fixtures', 'code.ts');
    const tsConfigs = [path.join(__dirname, 'fixtures', 'tsconfig.json')];
    const language = 'ts';

    const {
      issues: [issue],
    } = analyzeJSTS(await jsTsInput({ filePath, tsConfigs }), language) as JsTsAnalysisOutput;
    const { issues } = analyzeJSTS(
      await jsTsInput({ filePath, tsConfigs, linterId: 'empty' }),
      language,
    ) as JsTsAnalysisOutput;

    expect(issue).toEqual(
      expect.objectContaining({
        ruleId: 'bool-param-default',
      }),
    );
    expect(issues).toHaveLength(0);
  });

  it('should analyze Vue.js code', async () => {
    const rules = [
      { key: 'sonar-no-dupe-keys', configurations: [], fileTypeTarget: ['MAIN'] },
    ] as RuleConfig[];
    initializeLinter(rules);

    const filePath = path.join(__dirname, 'fixtures', 'code.vue');
    const language = 'js';

    const {
      issues: [issue],
    } = analyzeJSTS(await jsTsInput({ filePath }), language) as JsTsAnalysisOutput;
    expect(issue).toEqual(
      expect.objectContaining({
        ruleId: 'sonar-no-dupe-keys',
      }),
    );
  });

  it('should not analyze Vue.js with type checking', async () => {
    const rules = [
      { key: 'strings-comparison', configurations: [], fileTypeTarget: ['MAIN'] },
    ] as RuleConfig[];
    initializeLinter(rules);

    const filePath = path.join(__dirname, 'fixtures', 'vue_ts', 'file.vue');
    const tsConfigs = [path.join(__dirname, 'fixtures', 'vue_ts', 'tsconfig.json')];
    const language = 'ts';

    const { issues } = analyzeJSTS(
      await jsTsInput({ filePath, tsConfigs }),
      language,
    ) as JsTsAnalysisOutput;
    expect(issues).toHaveLength(0);
    setContext({
      workDir: '/tmp/dir',
      shouldUseTypeScriptParserForJS: true,
      sonarlint: true,
      bundles: [],
    });

    const { issues: issues_sl } = analyzeJSTS(
      await jsTsInput({ filePath, tsConfigs }),
      language,
    ) as JsTsAnalysisOutput;
    expect(issues_sl).toHaveLength(0);
  });

  it('should analyze main files', async () => {
    const rules = [
      { key: 'prefer-promise-shorthand', configurations: [], fileTypeTarget: ['MAIN'] },
      { key: 'no-same-argument-assert', configurations: [], fileTypeTarget: ['TEST'] },
    ] as RuleConfig[];
    initializeLinter(rules);

    const filePath = path.join(__dirname, 'fixtures', 'main.js');
    const language = 'js';

    const { issues } = analyzeJSTS(await jsTsInput({ filePath }), language) as JsTsAnalysisOutput;
    expect(issues).toHaveLength(1);
    expect(issues[0]).toEqual(
      expect.objectContaining({
        ruleId: 'prefer-promise-shorthand',
      }),
    );
  });

  it('should analyze test files', async () => {
    const rules = [
      { key: 'no-with', configurations: [], fileTypeTarget: ['MAIN'] },
      { key: 'no-same-argument-assert', configurations: [], fileTypeTarget: ['TEST'] },
    ] as RuleConfig[];
    initializeLinter(rules);

    const filePath = path.join(__dirname, 'fixtures', 'test.js');
    const fileType = 'TEST';

    const language = 'js';

    const { issues } = analyzeJSTS(
      await jsTsInput({ filePath, fileType }),
      language,
    ) as JsTsAnalysisOutput;
    expect(issues).toHaveLength(1);
    expect(issues[0]).toEqual(
      expect.objectContaining({
        ruleId: 'no-same-argument-assert',
      }),
    );
  });

  it('should analyze main and test files', async () => {
    const rules = [
      { key: 'no-throw-literal', configurations: [], fileTypeTarget: ['MAIN', 'TEST'] },
      { key: 'no-exclusive-tests', configurations: [], fileTypeTarget: ['TEST'] },
    ] as RuleConfig[];
    initializeLinter(rules);

    const filePath = path.join(__dirname, 'fixtures', 'mixed.js');
    const fileType = 'TEST';
    const language = 'js';

    const { issues } = analyzeJSTS(
      await jsTsInput({ filePath, fileType }),
      language,
    ) as JsTsAnalysisOutput;
    expect(issues).toHaveLength(2);
    expect(issues.map(issue => issue.ruleId)).toEqual(
      expect.arrayContaining(['no-exclusive-tests', 'no-throw-literal']),
    );
  });

  it('should analyze shebang files', async () => {
    const rules = [
      { key: 'object-shorthand', configurations: [], fileTypeTarget: ['MAIN'] },
    ] as RuleConfig[];
    initializeLinter(rules);

    const filePath = path.join(__dirname, 'fixtures', 'shebang.js');
    const language = 'js';

    const {
      issues: [issue],
    } = analyzeJSTS(await jsTsInput({ filePath }), language) as JsTsAnalysisOutput;
    expect(issue).toEqual(
      expect.objectContaining({
        ruleId: 'object-shorthand',
      }),
    );
  });

  it('should analyze BOM files', async () => {
    const rules = [
      { key: 'no-extra-semi', configurations: [], fileTypeTarget: ['MAIN'] },
    ] as RuleConfig[];
    initializeLinter(rules);

    const filePath = path.join(__dirname, 'fixtures', 'bom.js');
    const language = 'js';

    const {
      issues: [issue],
    } = analyzeJSTS(await jsTsInput({ filePath }), language) as JsTsAnalysisOutput;
    expect(issue).toEqual(
      expect.objectContaining({
        ruleId: 'no-extra-semi',
      }),
    );
  });

  it('should analyze file contents', async () => {
    const rules = [
      { key: 'prefer-template', configurations: [], fileTypeTarget: ['MAIN'] },
    ] as RuleConfig[];
    initializeLinter(rules);

    const filePath = '/tmp/dir';
    const fileContent = `'foo' + bar + 'baz'`;
    const language = 'js';

    const {
      issues: [issue],
    } = analyzeJSTS(await jsTsInput({ filePath, fileContent }), language) as JsTsAnalysisOutput;
    expect(issue).toEqual(
      expect.objectContaining({
        ruleId: 'prefer-template',
      }),
    );
  });

  it('should analyze using TSConfig', async () => {
    const rules = [
      { key: 'no-useless-intersection', configurations: [], fileTypeTarget: ['MAIN'] },
    ] as RuleConfig[];
    initializeLinter(rules);

    const filePath = path.join(__dirname, 'fixtures', 'tsconfig.ts');
    const tsConfigs = [path.join(__dirname, 'fixtures', 'tsconfig.json')];
    const language = 'ts';

    const {
      issues: [issue],
    } = analyzeJSTS(await jsTsInput({ filePath, tsConfigs }), language) as JsTsAnalysisOutput;
    expect(issue).toEqual(
      expect.objectContaining({
        ruleId: 'no-useless-intersection',
      }),
    );
  });

  it('should analyze using TypeScript program', async () => {
    const rules = [
      { key: 'no-array-delete', configurations: [], fileTypeTarget: ['MAIN'] },
    ] as RuleConfig[];
    initializeLinter(rules);

    const filePath = path.join(__dirname, 'fixtures', 'program.ts');

    const tsConfig = path.join(__dirname, 'fixtures', 'tsconfig.json');
    const { programId } = createAndSaveProgram(tsConfig);
    const language = 'ts';

    const {
      issues: [issue],
    } = analyzeJSTS(await jsTsInput({ filePath, programId }), language) as JsTsAnalysisOutput;
    expect(issue).toEqual(
      expect.objectContaining({
        ruleId: 'no-array-delete',
      }),
    );
  });

  it('should succeed with types using tsconfig with path aliases', async () => {
    const rules = [
      { key: 'strings-comparison', configurations: [], fileTypeTarget: ['MAIN'] },
    ] as RuleConfig[];
    initializeLinter(rules);

    const filePath = path.join(__dirname, 'fixtures', 'paths', 'file.ts');

    const tsConfig = path.join(__dirname, 'fixtures', 'paths', 'tsconfig.json');
    const { programId } = createAndSaveProgram(tsConfig);
    const language = 'ts';

    const {
      issues: [issue],
    } = analyzeJSTS(await jsTsInput({ filePath, programId }), language) as JsTsAnalysisOutput;
    expect(issue).toEqual(
      expect.objectContaining({
        ruleId: 'strings-comparison',
      }),
    );
  });

  it('should fail with types using tsconfig without paths aliases', async () => {
    const rules = [
      { key: 'strings-comparison', configurations: [], fileTypeTarget: ['MAIN'] },
    ] as RuleConfig[];
    initializeLinter(rules);

    const filePath = path.join(__dirname, 'fixtures', 'paths', 'file.ts');

    const tsConfig = path.join(__dirname, 'fixtures', 'paths', 'tsconfig_no_paths.json');
    const { programId } = createAndSaveProgram(tsConfig);
    const language = 'ts';

    const {
      issues: [issue],
    } = analyzeJSTS(await jsTsInput({ filePath, programId }), language) as JsTsAnalysisOutput;
    expect(issue).toEqual(
      expect.not.objectContaining({
        ruleId: 'strings-comparison',
      }),
    );
  });

  it('different tsconfig module resolution affects files included in program', async () => {
    const rules = [
      { key: 'strings-comparison', configurations: [], fileTypeTarget: ['MAIN'] },
    ] as RuleConfig[];
    initializeLinter(rules);

    const language = 'ts';

    const filePath = path.join(__dirname, 'fixtures', 'module', 'file.ts');

    const nodeDependencyPath = path.join(
      __dirname,
      'fixtures',
      'module',
      'node_modules',
      'string42',
      'index.ts',
    );
    const nodenextDependencyPath = path.join(
      __dirname,
      'fixtures',
      'module',
      'node_modules',
      'string42',
      'export.ts',
    );
    const classicDependencyPath = path.join(__dirname, 'fixtures', 'module', 'string42.ts');

    const nodeTsConfig = path.join(__dirname, 'fixtures', 'module', 'tsconfig_commonjs.json');
    const nodeProgram = createAndSaveProgram(nodeTsConfig);
    expect(nodeProgram.files).not.toContain(toUnixPath(nodeDependencyPath));
    expect(nodeProgram.files).not.toContain(toUnixPath(nodenextDependencyPath));
    expect(nodeProgram.files).not.toContain(toUnixPath(classicDependencyPath));
    const {
      issues: [nodeIssue],
    } = analyzeJSTS(
      await jsTsInput({ filePath, programId: nodeProgram.programId }),
      language,
    ) as JsTsAnalysisOutput;
    expect(nodeIssue).toEqual(
      expect.objectContaining({
        ruleId: 'strings-comparison',
      }),
    );

    const nodenextTsConfig = path.join(__dirname, 'fixtures', 'module', 'tsconfig_nodenext.json');
    const nodenextProgram = createAndSaveProgram(nodenextTsConfig);
    expect(nodenextProgram.files).not.toContain(toUnixPath(nodeDependencyPath));
    expect(nodenextProgram.files).not.toContain(toUnixPath(nodenextDependencyPath));
    expect(nodenextProgram.files).not.toContain(toUnixPath(classicDependencyPath));
    const {
      issues: [nodenextIssue],
    } = analyzeJSTS(
      await jsTsInput({ filePath, programId: nodenextProgram.programId }),
      language,
    ) as JsTsAnalysisOutput;
    expect(nodenextIssue).toEqual(
      expect.objectContaining({
        ruleId: 'strings-comparison',
      }),
    );

    const classicTsConfig = path.join(__dirname, 'fixtures', 'module', 'tsconfig_esnext.json');
    const classicProgram = createAndSaveProgram(classicTsConfig);
    expect(classicProgram.files).not.toContain(toUnixPath(nodeDependencyPath));
    expect(classicProgram.files).not.toContain(toUnixPath(nodenextDependencyPath));
    expect(classicProgram.files).toContain(toUnixPath(classicDependencyPath));
    const {
      issues: [classicIssue],
    } = analyzeJSTS(
      await jsTsInput({ filePath, programId: classicProgram.programId }),
      language,
    ) as JsTsAnalysisOutput;
    expect(classicIssue).toEqual(
      expect.objectContaining({
        ruleId: 'strings-comparison',
      }),
    );
  });

  it('should analyze using type information', async () => {
    setContext({
      workDir: '/tmp/dir',
      shouldUseTypeScriptParserForJS: true,
      sonarlint: false,
      bundles: [],
    });
    const rules = [
      { key: 'different-types-comparison', configurations: [], fileTypeTarget: ['MAIN'] },
    ] as RuleConfig[];
    initializeLinter(rules);

    const filePath = path.join(__dirname, 'fixtures', 'type.js');
    const tsConfigs = [path.join(__dirname, 'fixtures', 'tsconfig.json')];
    const language = 'js';

    const {
      issues: [issue],
    } = analyzeJSTS(await jsTsInput({ filePath, tsConfigs }), language) as JsTsAnalysisOutput;
    expect(issue).toEqual(
      expect.objectContaining({
        ruleId: 'different-types-comparison',
      }),
    );
  });

  it('should report issues', async () => {
    const rules = [
      { key: 'no-octal', configurations: [], fileTypeTarget: ['MAIN'] },
    ] as RuleConfig[];
    initializeLinter(rules);

    const filePath = path.join(__dirname, 'fixtures', 'issue.js');
    const language = 'js';

    const { issues } = analyzeJSTS(await jsTsInput({ filePath }), language) as JsTsAnalysisOutput;
    expect(issues).toEqual([
      {
        ruleId: 'no-octal',
        line: 1,
        column: 8,
        endLine: 1,
        endColumn: 11,
        message: 'Octal literals should not be used.',
        quickFixes: [],
        secondaryLocations: [],
      },
    ]);
  });

  it('should report secondary locations', async () => {
    const rules = [
      { key: 'destructuring-assignment-syntax', configurations: [], fileTypeTarget: ['MAIN'] },
    ] as RuleConfig[];
    initializeLinter(rules);

    const filePath = path.join(__dirname, 'fixtures', 'secondary.js');
    const language = 'js';

    const {
      issues: [{ secondaryLocations }],
    } = analyzeJSTS(await jsTsInput({ filePath }), language) as JsTsAnalysisOutput;
    expect(secondaryLocations).toEqual([
      {
        line: 3,
        column: 6,
        endLine: 3,
        endColumn: 19,
        message: 'Replace this assignment.',
      },
    ]);
  });

  it('should report quick fixes', async () => {
    const rules = [
      { key: 'no-unused-function-argument', configurations: [], fileTypeTarget: ['MAIN'] },
    ] as RuleConfig[];
    initializeLinter(rules);

    const filePath = path.join(__dirname, 'fixtures', 'quickfix.js');
    const language = 'js';

    const {
      issues: [{ quickFixes }],
    } = analyzeJSTS(await jsTsInput({ filePath }), language) as JsTsAnalysisOutput;
    expect(quickFixes).toEqual([
      {
        message: 'Rename "b" to "_b"',
        edits: [
          {
            text: '_',
            loc: {
              line: 1,
              column: 14,
              endLine: 1,
              endColumn: 14,
            },
          },
        ],
      },
      {
        message: 'Remove "b" (beware of call sites)',
        edits: [
          {
            text: '',
            loc: {
              line: 1,
              column: 14,
              endLine: 1,
              endColumn: 17,
            },
          },
        ],
      },
    ]);
  });

  it('should compute metrics on main files', async () => {
    const rules = [] as RuleConfig[];
    initializeLinter(rules);

    const filePath = path.join(__dirname, 'fixtures', 'metrics.js');
    const language = 'js';

    const { highlights, highlightedSymbols, metrics, cpdTokens } = analyzeJSTS(
      await jsTsInput({ filePath }),
      language,
    ) as JsTsAnalysisOutput;

    const extendedMetrics = { highlights, highlightedSymbols, metrics, cpdTokens };
    expect(extendedMetrics).toEqual({
      highlights: [
        { textType: 'KEYWORD', location: { startLine: 1, startCol: 0, endLine: 1, endCol: 5 } },
        { textType: 'KEYWORD', location: { startLine: 4, startCol: 4, endCol: 10, endLine: 4 } },
        { textType: 'COMMENT', location: { startLine: 2, startCol: 2, endCol: 25, endLine: 2 } },
        { textType: 'COMMENT', location: { startLine: 4, startCol: 25, endCol: 35, endLine: 4 } },
      ],
      highlightedSymbols: [
        { declaration: { startLine: 1, startCol: 6, endLine: 1, endCol: 7 }, references: [] },
        { declaration: { startLine: 1, startCol: 6, endLine: 1, endCol: 7 }, references: [] },
        {
          declaration: { startLine: 3, startCol: 4, endLine: 3, endCol: 5 },
          references: [
            { startLine: 4, startCol: 13, endLine: 4, endCol: 14 },
            { startLine: 4, startCol: 21, endLine: 4, endCol: 22 },
          ],
        },
        {
          declaration: { startLine: 3, startCol: 7, endLine: 3, endCol: 8 },
          references: [{ startLine: 5, startCol: 2, endLine: 5, endCol: 3 }],
        },
        {
          declaration: { startLine: 1, startCol: 8, endLine: 1, endCol: 9 },
          references: [{ startLine: 6, startCol: 0, endLine: 6, endCol: 1 }],
        },
      ],
      metrics: {
        classes: 1,
        cognitiveComplexity: 0,
        commentLines: [2],
        complexity: 2,
        executableLines: [4],
        functions: 1,
        ncloc: [1, 3, 4, 5, 6],
        nosonarLines: [4],
        statements: 1,
      },
      cpdTokens: [
        {
          image: 'class',
          location: {
            endCol: 5,
            endLine: 1,
            startCol: 0,
            startLine: 1,
          },
        },
        {
          image: 'C',
          location: {
            endCol: 7,
            endLine: 1,
            startCol: 6,
            startLine: 1,
          },
        },
        {
          image: '{',
          location: {
            endCol: 9,
            endLine: 1,
            startCol: 8,
            startLine: 1,
          },
        },
        {
          image: 'm',
          location: {
            endCol: 3,
            endLine: 3,
            startCol: 2,
            startLine: 3,
          },
        },
        {
          image: '(',
          location: {
            endCol: 4,
            endLine: 3,
            startCol: 3,
            startLine: 3,
          },
        },
        {
          image: 'p',
          location: {
            endCol: 5,
            endLine: 3,
            startCol: 4,
            startLine: 3,
          },
        },
        {
          image: ')',
          location: {
            endCol: 6,
            endLine: 3,
            startCol: 5,
            startLine: 3,
          },
        },
        {
          image: '{',
          location: {
            endCol: 8,
            endLine: 3,
            startCol: 7,
            startLine: 3,
          },
        },
        {
          image: 'return',
          location: {
            endCol: 10,
            endLine: 4,
            startCol: 4,
            startLine: 4,
          },
        },
        {
          image: 'f',
          location: {
            endCol: 12,
            endLine: 4,
            startCol: 11,
            startLine: 4,
          },
        },
        {
          image: '(',
          location: {
            endCol: 13,
            endLine: 4,
            startCol: 12,
            startLine: 4,
          },
        },
        {
          image: 'p',
          location: {
            endCol: 14,
            endLine: 4,
            startCol: 13,
            startLine: 4,
          },
        },
        {
          image: ')',
          location: {
            endCol: 15,
            endLine: 4,
            startCol: 14,
            startLine: 4,
          },
        },
        {
          image: '&&',
          location: {
            endCol: 18,
            endLine: 4,
            startCol: 16,
            startLine: 4,
          },
        },
        {
          image: 'g',
          location: {
            endCol: 20,
            endLine: 4,
            startCol: 19,
            startLine: 4,
          },
        },
        {
          image: '(',
          location: {
            endCol: 21,
            endLine: 4,
            startCol: 20,
            startLine: 4,
          },
        },
        {
          image: 'p',
          location: {
            endCol: 22,
            endLine: 4,
            startCol: 21,
            startLine: 4,
          },
        },
        {
          image: ')',
          location: {
            endCol: 23,
            endLine: 4,
            startCol: 22,
            startLine: 4,
          },
        },
        {
          image: ';',
          location: {
            endCol: 24,
            endLine: 4,
            startCol: 23,
            startLine: 4,
          },
        },
        {
          image: '}',
          location: {
            endCol: 3,
            endLine: 5,
            startCol: 2,
            startLine: 5,
          },
        },
        {
          image: '}',
          location: {
            endCol: 1,
            endLine: 6,
            startCol: 0,
            startLine: 6,
          },
        },
      ],
    });
  });

  it('should compute metrics on test files', async () => {
    const rules = [] as RuleConfig[];
    initializeLinter(rules);

    const filePath = path.join(__dirname, 'fixtures', 'metrics.js');
    const fileType = 'TEST';
    const language = 'js';

    const { highlights, highlightedSymbols, metrics, cpdTokens } = analyzeJSTS(
      await jsTsInput({ filePath, fileType }),
      language,
    ) as JsTsAnalysisOutput;

    const extendedMetrics = { highlights, highlightedSymbols, metrics, cpdTokens };
    expect(extendedMetrics).toEqual({
      cpdTokens: undefined,
      highlights: [
        { textType: 'KEYWORD', location: { startLine: 1, startCol: 0, endLine: 1, endCol: 5 } },
        { textType: 'KEYWORD', location: { startLine: 4, startCol: 4, endCol: 10, endLine: 4 } },
        { textType: 'COMMENT', location: { startLine: 2, startCol: 2, endCol: 25, endLine: 2 } },
        { textType: 'COMMENT', location: { startLine: 4, startCol: 25, endCol: 35, endLine: 4 } },
      ],
      highlightedSymbols: [
        { declaration: { startLine: 1, startCol: 6, endLine: 1, endCol: 7 }, references: [] },
        { declaration: { startLine: 1, startCol: 6, endLine: 1, endCol: 7 }, references: [] },
        {
          declaration: { startLine: 3, startCol: 4, endLine: 3, endCol: 5 },
          references: [
            { startLine: 4, startCol: 13, endLine: 4, endCol: 14 },
            { startLine: 4, startCol: 21, endLine: 4, endCol: 22 },
          ],
        },
        {
          declaration: { startLine: 3, startCol: 7, endLine: 3, endCol: 8 },
          references: [{ startLine: 5, startCol: 2, endLine: 5, endCol: 3 }],
        },
        {
          declaration: { startLine: 1, startCol: 8, endLine: 1, endCol: 9 },
          references: [{ startLine: 6, startCol: 0, endLine: 6, endCol: 1 }],
        },
      ],
      metrics: {
        nosonarLines: [4],
      },
    });
  });

  it('should compute metrics in SonarLint context', async () => {
    setContext({
      workDir: '/tmp/dir',
      shouldUseTypeScriptParserForJS: false,
      sonarlint: true,
      bundles: [],
    });

    const rules = [] as RuleConfig[];
    initializeLinter(rules);

    const filePath = path.join(__dirname, 'fixtures', 'metrics.js');
    const language = 'js';

    const { highlights, highlightedSymbols, metrics, cpdTokens } = analyzeJSTS(
      await jsTsInput({ filePath }),
      language,
    ) as JsTsAnalysisOutput;

    const extendedMetrics = { highlights, highlightedSymbols, metrics, cpdTokens };
    expect(extendedMetrics).toEqual({
      metrics: {
        nosonarLines: [4],
      },
    });
  });

  it('should return parsing errors', async () => {
    const rules = [];
    initializeLinter(rules);

    const filePath = path.join(__dirname, 'fixtures', 'parsing-error.js');
    const language = 'js';
    const analysisInput = await jsTsInput({ filePath });
    expect(() => analyzeJSTS(analysisInput, language)).toThrow(
      APIError.parsingError('Unexpected token (3:0)', { line: 3 }),
    );
  });

  it('package.json should be available in rule context', async () => {
    const baseDir = path.join(__dirname, 'fixtures', 'package-json');
    loadPackageJsons(baseDir, []);

    const linter = new Linter();
    linter.defineRule('custom-rule-file', {
      create(context) {
        return {
          CallExpression(node) {
            const packageJsons = getNearestPackageJsons(context.filename);
            expect(packageJsons).toBeDefined();
            expect(packageJsons[0].contents.name).toEqual('test-module');
            context.report({
              node: node.callee,
              message: 'call',
            });
          },
        };
      },
    } as Rule.RuleModule);

    const filePath = path.join(baseDir, 'custom.js');
    const sourceCode = await parseJavaScriptSourceFile(filePath);

    const issues = linter.verify(
      sourceCode,
      { rules: { 'custom-rule-file': 'error' } },
      { filename: filePath, allowInlineConfig: false },
    );
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toEqual('call');

    const vueFilePath = path.join(baseDir, 'code.vue');
    const vueSourceCode = await parseJavaScriptSourceFile(vueFilePath);

    const vueIssues = linter.verify(
      vueSourceCode,
      { rules: { 'custom-rule-file': 'error' } },
      { filename: vueFilePath, allowInlineConfig: false },
    );
    expect(vueIssues).toHaveLength(1);
    expect(vueIssues[0].message).toEqual('call');
  });

  it('should return the AST along with the issues', async () => {
    const rules = [
      { key: 'prefer-default-last', configurations: [], fileTypeTarget: ['MAIN'] },
    ] as RuleConfig[];
    initializeLinter(rules);
    initializeLinter([], [], [], 'empty');

    const filePath = path.join(__dirname, 'fixtures', 'code.js');
    const language = 'js';

    const { ast } = analyzeJSTS(await jsTsInput({ filePath }), language) as JsTsAnalysisOutput;
    const protoMessage = deserializeProtobuf(ast as Uint8Array);
    expect(protoMessage.program).toBeDefined();
    expect(protoMessage.program.body).toHaveLength(1);
    expect(protoMessage.program.body[0].functionDeclaration.id.identifier.name).toEqual('f');
  });

  it('should not return the AST if the skipAst flag is set', async () => {
    const rules = [
      { key: 'prefer-default-last', configurations: [], fileTypeTarget: ['MAIN'] },
    ] as RuleConfig[];
    initializeLinter(rules);
    initializeLinter([], [], [], 'empty');

    const filePath = path.join(__dirname, 'fixtures', 'code.js');
    const language = 'js';

    const { ast } = analyzeJSTS(
      await jsTsInput({ filePath, skipAst: true }),
      language,
    ) as JsTsAnalysisOutput;
    expect(ast).toBeUndefined();
  });
});
