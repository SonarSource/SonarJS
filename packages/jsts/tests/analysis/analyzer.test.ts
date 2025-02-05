/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
import path from 'path/posix';
import { Linter } from 'eslint';
import { describe, beforeEach, it } from 'node:test';
import { expect } from 'expect';
import { getDependencies, getManifests, toUnixPath } from '../../src/rules/helpers/index.js';
import { setContext } from '../../../shared/src/helpers/context.js';
import { analyzeJSTS, getTelemetry } from '../../src/analysis/analyzer.js';
import { APIError } from '../../../shared/src/errors/error.js';
import { RuleConfig } from '../../src/linter/config/rule-config.js';
import { initializeLinter } from '../../src/linter/linters.js';
import { JsTsAnalysisOutput } from '../../src/analysis/analysis.js';
import { createAndSaveProgram } from '../../src/program/program.js';
import { deserializeProtobuf } from '../../src/parsers/ast.js';
import { jsTsInput } from '../tools/helpers/input.js';
import { parseJavaScriptSourceFile } from '../tools/helpers/parsing.js';

const currentPath = toUnixPath(import.meta.dirname);

describe('analyzeJSTS', () => {
  beforeEach(() => {
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
    const rules = [{ key: 'S4524', configurations: [], fileTypeTarget: ['MAIN'] }] as RuleConfig[];
    await initializeLinter(rules);
    await initializeLinter([], [], [], undefined, 'empty');

    const filePath = path.join(currentPath, 'fixtures', 'code.js');
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
        ruleId: 'S4524',
      }),
    );

    expect(issues).toHaveLength(0);
  });

  it('should analyze TypeScript code with the given linter', async () => {
    const rules = [{ key: 'S4798', configurations: [], fileTypeTarget: ['MAIN'] }] as RuleConfig[];
    await initializeLinter(rules);
    await initializeLinter([], [], [], undefined, 'empty');

    const filePath = path.join(currentPath, 'fixtures', 'code.ts');
    const tsConfigs = [path.join(currentPath, 'fixtures', 'tsconfig.json')];
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
        ruleId: 'S4798',
      }),
    );
    expect(issues).toHaveLength(0);
  });

  it('should analyze Vue.js code', async () => {
    const rules = [{ key: 'S1534', configurations: [], fileTypeTarget: ['MAIN'] }] as RuleConfig[];
    await initializeLinter(rules);

    const filePath = path.join(currentPath, 'fixtures', 'code.vue');
    const language = 'js';

    const {
      issues: [issue],
    } = analyzeJSTS(await jsTsInput({ filePath }), language) as JsTsAnalysisOutput;
    expect(issue).toEqual(
      expect.objectContaining({
        ruleId: 'S1534',
      }),
    );
  });

  it('should not analyze Vue.js with type checking', async () => {
    const rules = [{ key: 'S3003', configurations: [], fileTypeTarget: ['MAIN'] }] as RuleConfig[];
    await initializeLinter(rules);

    const filePath = path.join(currentPath, 'fixtures', 'vue_ts', 'file.vue');
    const tsConfigs = [path.join(currentPath, 'fixtures', 'vue_ts', 'tsconfig.json')];
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
      { key: 'S4634', configurations: [], fileTypeTarget: ['MAIN'] },
      { key: 'S5863', configurations: [], fileTypeTarget: ['TEST'] },
    ] as RuleConfig[];
    await initializeLinter(rules);

    const filePath = path.join(currentPath, 'fixtures', 'main.js');
    const language = 'js';

    const { issues } = analyzeJSTS(await jsTsInput({ filePath }), language) as JsTsAnalysisOutput;
    expect(issues).toHaveLength(1);
    expect(issues[0]).toEqual(
      expect.objectContaining({
        ruleId: 'S4634',
      }),
    );
  });

  it('should analyze test files', async () => {
    const rules = [
      { key: 'S1321', configurations: [], fileTypeTarget: ['MAIN'] },
      { key: 'S5863', configurations: [], fileTypeTarget: ['TEST'] },
    ] as RuleConfig[];
    await initializeLinter(rules);

    const filePath = path.join(currentPath, 'fixtures', 'test.js');
    const fileType = 'TEST';

    const language = 'js';

    const { issues } = analyzeJSTS(
      await jsTsInput({ filePath, fileType }),
      language,
    ) as JsTsAnalysisOutput;
    expect(issues).toHaveLength(1);
    expect(issues[0]).toEqual(
      expect.objectContaining({
        ruleId: 'S5863',
      }),
    );
  });

  it('should analyze main and test files', async () => {
    const rules = [
      { key: 'S3696', configurations: [], fileTypeTarget: ['MAIN', 'TEST'] },
      { key: 'S6426', configurations: [], fileTypeTarget: ['TEST'] },
    ] as RuleConfig[];
    await initializeLinter(rules);

    const filePath = path.join(currentPath, 'fixtures', 'mixed.js');
    const fileType = 'TEST';
    const language = 'js';

    const { issues } = analyzeJSTS(
      await jsTsInput({ filePath, fileType }),
      language,
    ) as JsTsAnalysisOutput;
    expect(issues).toHaveLength(2);
    expect(issues.map(issue => issue.ruleId)).toEqual(expect.arrayContaining(['S6426', 'S3696']));
  });

  it('should analyze shebang files', async () => {
    const rules = [{ key: 'S3498', configurations: [], fileTypeTarget: ['MAIN'] }] as RuleConfig[];
    await initializeLinter(rules);

    const filePath = path.join(currentPath, 'fixtures', 'shebang.js');
    const language = 'js';

    const {
      issues: [issue],
    } = analyzeJSTS(await jsTsInput({ filePath }), language) as JsTsAnalysisOutput;
    expect(issue).toEqual(
      expect.objectContaining({
        ruleId: 'S3498',
      }),
    );
  });

  it('should analyze BOM files', async () => {
    const rules = [{ key: 'S1116', configurations: [], fileTypeTarget: ['MAIN'] }] as RuleConfig[];
    await initializeLinter(rules);

    const filePath = path.join(currentPath, 'fixtures', 'bom.js');
    const language = 'js';

    const {
      issues: [issue],
    } = analyzeJSTS(await jsTsInput({ filePath }), language) as JsTsAnalysisOutput;
    expect(issue).toEqual(
      expect.objectContaining({
        ruleId: 'S1116',
      }),
    );
  });

  it('should analyze file contents', async () => {
    const rules = [{ key: 'S3512', configurations: [], fileTypeTarget: ['MAIN'] }] as RuleConfig[];
    await initializeLinter(rules);

    const filePath = path.join(currentPath, 'fixtures', 'foo.js');
    const fileContent = `'foo' + bar + 'baz'`;
    const language = 'js';

    const {
      issues: [issue],
    } = analyzeJSTS(await jsTsInput({ filePath, fileContent }), language) as JsTsAnalysisOutput;
    expect(issue).toEqual(
      expect.objectContaining({
        ruleId: 'S3512',
      }),
    );
  });

  it('should analyze using TSConfig', async () => {
    const rules = [{ key: 'S4335', configurations: [], fileTypeTarget: ['MAIN'] }] as RuleConfig[];
    await initializeLinter(rules);

    const filePath = path.join(currentPath, 'fixtures', 'tsconfig.ts');
    const tsConfigs = [path.join(currentPath, 'fixtures', 'tsconfig.json')];
    const language = 'ts';

    const {
      issues: [issue],
    } = analyzeJSTS(await jsTsInput({ filePath, tsConfigs }), language) as JsTsAnalysisOutput;
    expect(issue).toEqual(
      expect.objectContaining({
        ruleId: 'S4335',
      }),
    );
  });

  it('should analyze using TypeScript program', async () => {
    const rules = [{ key: 'S2870', configurations: [], fileTypeTarget: ['MAIN'] }] as RuleConfig[];
    await initializeLinter(rules);

    const filePath = path.join(currentPath, 'fixtures', 'program.ts');

    const tsConfig = path.join(currentPath, 'fixtures', 'tsconfig.json');
    const { programId } = createAndSaveProgram(tsConfig);
    const language = 'ts';

    const {
      issues: [issue],
    } = analyzeJSTS(await jsTsInput({ filePath, programId }), language) as JsTsAnalysisOutput;
    expect(issue).toEqual(
      expect.objectContaining({
        ruleId: 'S2870',
      }),
    );
  });

  it('should succeed with types using tsconfig with path aliases', async () => {
    const rules = [{ key: 'S3003', configurations: [], fileTypeTarget: ['MAIN'] }] as RuleConfig[];
    await initializeLinter(rules);

    const filePath = path.join(currentPath, 'fixtures', 'paths', 'file.ts');

    const tsConfig = path.join(currentPath, 'fixtures', 'paths', 'tsconfig.json');
    const { programId } = createAndSaveProgram(tsConfig);
    const language = 'ts';

    const {
      issues: [issue],
    } = analyzeJSTS(await jsTsInput({ filePath, programId }), language) as JsTsAnalysisOutput;
    expect(issue).toEqual(
      expect.objectContaining({
        ruleId: 'S3003',
      }),
    );
  });

  it('should fail with types using tsconfig without paths aliases', async () => {
    const rules = [{ key: 'S3003', configurations: [], fileTypeTarget: ['MAIN'] }] as RuleConfig[];
    await initializeLinter(rules);

    const filePath = path.join(currentPath, 'fixtures', 'paths', 'file.ts');

    const tsConfig = path.join(currentPath, 'fixtures', 'paths', 'tsconfig_no_paths.json');
    const { programId } = createAndSaveProgram(tsConfig);
    const language = 'ts';

    const {
      issues: [issue],
    } = analyzeJSTS(await jsTsInput({ filePath, programId }), language) as JsTsAnalysisOutput;
    expect(issue).toEqual(
      expect.not.objectContaining({
        ruleId: 'S3003',
      }),
    );
  });

  it('different tsconfig module resolution affects files included in program', async () => {
    const rules = [{ key: 'S3003', configurations: [], fileTypeTarget: ['MAIN'] }] as RuleConfig[];
    await initializeLinter(rules);

    const language = 'ts';

    const filePath = path.join(currentPath, 'fixtures', 'module', 'file.ts');

    const nodeDependencyPath = path.join(
      currentPath,
      'fixtures',
      'module',
      'node_modules',
      'string42',
      'index.ts',
    );
    const nodenextDependencyPath = path.join(
      currentPath,
      'fixtures',
      'module',
      'node_modules',
      'string42',
      'export.ts',
    );
    const classicDependencyPath = path.join(currentPath, 'fixtures', 'module', 'string42.ts');

    const nodeTsConfig = path.join(currentPath, 'fixtures', 'module', 'tsconfig_commonjs.json');
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
        ruleId: 'S3003',
      }),
    );

    const nodenextTsConfig = path.join(currentPath, 'fixtures', 'module', 'tsconfig_nodenext.json');
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
        ruleId: 'S3003',
      }),
    );

    const classicTsConfig = path.join(currentPath, 'fixtures', 'module', 'tsconfig_esnext.json');
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
        ruleId: 'S3003',
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
    const rules = [{ key: 'S3403', configurations: [], fileTypeTarget: ['MAIN'] }] as RuleConfig[];
    await initializeLinter(rules);

    const filePath = path.join(currentPath, 'fixtures', 'type.js');
    const tsConfigs = [path.join(currentPath, 'fixtures', 'tsconfig.json')];
    const language = 'js';

    const {
      issues: [issue],
    } = analyzeJSTS(await jsTsInput({ filePath, tsConfigs }), language) as JsTsAnalysisOutput;
    expect(issue).toEqual(
      expect.objectContaining({
        ruleId: 'S3403',
      }),
    );
  });

  it('should report issues', async () => {
    const rules = [{ key: 'S1314', configurations: [], fileTypeTarget: ['MAIN'] }] as RuleConfig[];
    await initializeLinter(rules);

    const filePath = path.join(currentPath, 'fixtures', 'issue.js');
    const language = 'js';

    const { issues } = analyzeJSTS(await jsTsInput({ filePath }), language) as JsTsAnalysisOutput;
    expect(issues).toEqual([
      {
        ruleId: 'S1314',
        line: 1,
        column: 8,
        endLine: 1,
        endColumn: 11,
        message: 'Octal literals should not be used.',
        quickFixes: [],
        secondaryLocations: [],
        ruleESLintKeys: ['no-octal'],
        filePath,
      },
    ]);
  });

  it('should report secondary locations', async () => {
    const rules = [{ key: 'S3514', configurations: [], fileTypeTarget: ['MAIN'] }] as RuleConfig[];
    await initializeLinter(rules);

    const filePath = path.join(currentPath, 'fixtures', 'secondary.js');
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
    const rules = [{ key: 'S1172', configurations: [], fileTypeTarget: ['MAIN'] }] as RuleConfig[];
    await initializeLinter(rules);

    const filePath = path.join(currentPath, 'fixtures', 'quickfix.js');
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
    await initializeLinter(rules);

    const filePath = path.join(currentPath, 'fixtures', 'metrics.js');
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
        cognitiveComplexity: 1,
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
    await initializeLinter(rules);

    const filePath = path.join(currentPath, 'fixtures', 'metrics.js');
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
    await initializeLinter(rules);

    const filePath = path.join(currentPath, 'fixtures', 'metrics.js');
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
    await initializeLinter(rules);

    const filePath = path.join(currentPath, 'fixtures', 'parsing-error.js');
    const language = 'js';
    const analysisInput = await jsTsInput({ filePath });
    expect(() => analyzeJSTS(analysisInput, language)).toThrow(
      APIError.parsingError('Unexpected token (3:0)', { line: 3 }),
    );
  });

  it('package.json should be available in rule context', async () => {
    const baseDir = path.join(currentPath, 'fixtures', 'package-json');

    const linter = new Linter();
    const linterConfig: Linter.Config = {
      plugins: {
        sonarjs: {
          rules: {
            'custom-rule-file': {
              create(context) {
                return {
                  CallExpression(node) {
                    const packageJsons = getManifests(
                      path.posix.dirname(toUnixPath(context.filename)),
                      baseDir,
                    );
                    expect(packageJsons).toBeDefined();
                    expect(packageJsons[0].name).toEqual('test-module');
                    context.report({
                      node: node.callee,
                      message: 'call',
                    });
                  },
                };
              },
            },
          },
        },
      },
      rules: { 'sonarjs/custom-rule-file': 'error' },
      files: ['**/*.vue', '**/*.js'],
    };
    const filePath = path.join(baseDir, 'custom.js');
    const { sourceCode } = await parseJavaScriptSourceFile(filePath);

    const issues = linter.verify(sourceCode, linterConfig, {
      filename: filePath,
      allowInlineConfig: false,
    });
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toEqual('call');

    const vueFilePath = path.join(baseDir, 'code.vue');
    const { sourceCode: vueSourceCode } = await parseJavaScriptSourceFile(vueFilePath);

    const vueIssues = linter.verify(vueSourceCode, linterConfig, {
      filename: vueFilePath,
      allowInlineConfig: false,
    });
    expect(vueIssues).toHaveLength(1);
    expect(vueIssues[0].message).toEqual('call');
  });

  it('should populate dependencies after analysis', async () => {
    const baseDir = path.join(currentPath, 'fixtures', 'dependencies');
    const linter = new Linter();
    const linterConfig: Linter.Config = {
      plugins: {
        sonarjs: {
          rules: {
            'custom-rule-file': {
              create(context) {
                return {
                  CallExpression(node) {
                    // Necessarily call 'getDependencies' to populate the cache of dependencies
                    const dependencies = getDependencies(toUnixPath(context.filename), baseDir);
                    if (dependencies.size) {
                      context.report({
                        node: node.callee,
                        message: 'call',
                      });
                    }
                  },
                };
              },
            },
          },
        },
      },
      rules: { 'sonarjs/custom-rule-file': 'error' },
      files: ['**/*.js'],
    };
    const filePath = path.join(currentPath, 'fixtures', 'dependencies', 'index.js');
    const { sourceCode } = await parseJavaScriptSourceFile(filePath);
    linter.verify(sourceCode, linterConfig, {
      filename: filePath,
      allowInlineConfig: false,
    });
    const { dependencies } = getTelemetry();
    expect(dependencies).toStrictEqual([
      {
        name: 'test-module',
        version: '*',
      },
      {
        name: 'pkg1',
        version: '1.0.0',
      },
      {
        name: 'pkg2',
        version: '2.0.0',
      },
    ]);
  });

  it('should return the AST along with the issues', async () => {
    const rules = [{ key: 'S4524', configurations: [], fileTypeTarget: ['MAIN'] }] as RuleConfig[];
    await initializeLinter(rules);

    const filePath = path.join(currentPath, 'fixtures', 'code.js');
    const language = 'js';

    const { ast } = analyzeJSTS(await jsTsInput({ filePath }), language) as JsTsAnalysisOutput;
    const protoMessage = deserializeProtobuf(ast as Uint8Array);
    expect(protoMessage.program).toBeDefined();
    expect(protoMessage.program.body).toHaveLength(1);
    expect(protoMessage.program.body[0].functionDeclaration.id.identifier.name).toEqual('f');
  });

  it('should not return the AST if the skipAst flag is set', async () => {
    const rules = [{ key: 'S4524', configurations: [], fileTypeTarget: ['MAIN'] }] as RuleConfig[];
    await initializeLinter(rules);

    const filePath = path.join(currentPath, 'fixtures', 'code.js');
    const language = 'js';

    const { ast } = analyzeJSTS(
      await jsTsInput({ filePath, skipAst: true }),
      language,
    ) as JsTsAnalysisOutput;
    expect(ast).toBeUndefined();
  });
});
