/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
import path from 'node:path/posix';
import { Linter as ESLintLinter } from 'eslint';
import { describe, it } from 'node:test';
import { expect } from 'expect';
import { toUnixPath } from '../../src/rules/helpers/index.js';
import { analyzeJSTS } from '../../src/analysis/analyzer.js';
import { APIError } from '../../../shared/src/errors/error.js';
import type { RuleConfig } from '../../src/linter/config/rule-config.js';
import { Linter } from '../../src/linter/linter.js';
import { deserializeProtobuf } from '../../src/parsers/ast.js';
import { jsTsInput } from '../tools/helpers/input.js';
import { parseJavaScriptSourceFile } from '../tools/helpers/parsing.js';
import assert from 'node:assert';
import { getManifests } from '../../src/rules/helpers/package-jsons/all-in-parent-dirs.js';
import { createProgramOptions } from '../../src/program/tsconfig/options.js';
import { createStandardProgram } from '../../src/program/factory.js';

const currentPath = toUnixPath(import.meta.dirname);
const fixtures = path.join(currentPath, 'fixtures-analyzer');

describe('await analyzeJSTS', () => {
  it('should fail on uninitialized linter', async () => {
    const filePath = path.join(fixtures, 'code.js');
    const input = await jsTsInput({ filePath });

    await expect(() => analyzeJSTS(input)).rejects.toThrow(
      APIError.linterError('Linter does not exist. Did you call /init-linter?'),
    );
  });

  it('should analyze JavaScript code', async () => {
    const rules: RuleConfig[] = [
      {
        key: 'S4524',
        configurations: [],
        fileTypeTargets: ['MAIN'],
        language: 'js',
        analysisModes: ['DEFAULT'],
      },
    ];
    const filePath = path.join(fixtures, 'code.js');
    await Linter.initialize({ baseDir: path.dirname(filePath), rules });

    const {
      issues: [issue],
    } = await analyzeJSTS(await jsTsInput({ filePath }));

    expect(issue).toEqual(
      expect.objectContaining({
        ruleId: 'S4524',
      }),
    );
  });

  it('should analyze Vue.js code', async () => {
    const rules: RuleConfig[] = [
      {
        key: 'S1534',
        configurations: [],
        fileTypeTargets: ['MAIN'],
        language: 'js',
        analysisModes: ['DEFAULT'],
      },
    ];
    const filePath = path.join(fixtures, 'code.vue');
    await Linter.initialize({ baseDir: path.dirname(filePath), rules });

    const {
      issues: [issue],
    } = await analyzeJSTS(await jsTsInput({ filePath }));
    expect(issue).toEqual(
      expect.objectContaining({
        ruleId: 'S1534',
      }),
    );
  });

  it('should not analyze Vue.js with type checking', async () => {
    const rules: RuleConfig[] = [
      {
        key: 'S3003',
        configurations: [],
        fileTypeTargets: ['MAIN'],
        language: 'js',
        analysisModes: ['DEFAULT'],
      },
    ];
    const filePath = path.join(fixtures, 'vue_ts', 'file.vue');
    await Linter.initialize({ baseDir: path.dirname(filePath), rules });

    const tsConfigs = [path.join(fixtures, 'vue_ts', 'tsconfig.json')];
    const language = 'ts';

    const { issues } = await analyzeJSTS(await jsTsInput({ filePath, tsConfigs, language }));
    expect(issues).toHaveLength(0);
    const { issues: issues_sl } = await analyzeJSTS(
      await jsTsInput({ filePath, tsConfigs, sonarlint: true, language }),
    );
    expect(issues_sl).toHaveLength(0);
  });

  it('should analyze main files', async () => {
    const rules: RuleConfig[] = [
      {
        key: 'S4634',
        configurations: [],
        fileTypeTargets: ['MAIN'],
        language: 'js',
        analysisModes: ['DEFAULT'],
      },
      {
        key: 'S5863',
        configurations: [],
        fileTypeTargets: ['TEST'],
        language: 'js',
        analysisModes: ['DEFAULT'],
      },
    ];
    const filePath = path.join(fixtures, 'main.js');
    await Linter.initialize({ baseDir: path.dirname(filePath), rules });

    const { issues } = await analyzeJSTS(await jsTsInput({ filePath }));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toEqual(
      expect.objectContaining({
        ruleId: 'S4634',
      }),
    );
  });

  it('should analyze test files', async () => {
    const rules: RuleConfig[] = [
      {
        key: 'S1321',
        configurations: [],
        fileTypeTargets: ['MAIN'],
        language: 'js',
        analysisModes: ['DEFAULT'],
      },
      {
        key: 'S5863',
        configurations: [],
        fileTypeTargets: ['TEST'],
        language: 'js',
        analysisModes: ['DEFAULT'],
      },
    ];
    const filePath = path.join(fixtures, 'test.js');
    await Linter.initialize({ baseDir: path.dirname(filePath), rules });
    const fileType = 'TEST';

    const { issues } = await analyzeJSTS(await jsTsInput({ filePath, fileType }));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toEqual(
      expect.objectContaining({
        ruleId: 'S5863',
      }),
    );
  });

  it('should analyze main and test files', async () => {
    const rules: RuleConfig[] = [
      {
        key: 'S3696',
        configurations: [],
        fileTypeTargets: ['MAIN', 'TEST'],
        language: 'js',
        analysisModes: ['DEFAULT'],
      },
      {
        key: 'S6426',
        configurations: [],
        fileTypeTargets: ['TEST'],
        language: 'js',
        analysisModes: ['DEFAULT'],
      },
    ];
    const filePath = path.join(fixtures, 'mixed.js');
    await Linter.initialize({ baseDir: path.dirname(filePath), rules });
    const fileType = 'TEST';

    const { issues } = await analyzeJSTS(await jsTsInput({ filePath, fileType }));
    expect(issues).toHaveLength(2);
    expect(issues.map(issue => issue.ruleId)).toEqual(expect.arrayContaining(['S6426', 'S3696']));
  });

  it('should analyze shebang files', async () => {
    const rules: RuleConfig[] = [
      {
        key: 'S3498',
        configurations: [],
        fileTypeTargets: ['MAIN'],
        language: 'js',
        analysisModes: ['DEFAULT'],
      },
    ];
    const filePath = path.join(fixtures, 'shebang.js');
    await Linter.initialize({ baseDir: path.dirname(filePath), rules });

    const {
      issues: [issue],
    } = await analyzeJSTS(await jsTsInput({ filePath }));
    expect(issue).toEqual(
      expect.objectContaining({
        ruleId: 'S3498',
      }),
    );
  });

  it('should analyze BOM files', async () => {
    const rules: RuleConfig[] = [
      {
        key: 'S1116',
        configurations: [],
        fileTypeTargets: ['MAIN'],
        language: 'js',
        analysisModes: ['DEFAULT'],
      },
    ];
    const filePath = path.join(fixtures, 'bom.js');
    await Linter.initialize({ baseDir: path.dirname(filePath), rules });

    const {
      issues: [issue],
    } = await analyzeJSTS(await jsTsInput({ filePath }));
    expect(issue).toEqual(
      expect.objectContaining({
        ruleId: 'S1116',
      }),
    );
  });

  it('should analyze file contents', async () => {
    const rules: RuleConfig[] = [
      {
        key: 'S3512',
        configurations: [],
        fileTypeTargets: ['MAIN'],
        language: 'js',
        analysisModes: ['DEFAULT'],
      },
    ];
    const filePath = path.join(fixtures, 'foo.js');
    await Linter.initialize({ baseDir: path.dirname(filePath), rules });
    const fileContent = `'foo' + bar + 'baz'`;

    const {
      issues: [issue],
    } = await analyzeJSTS(await jsTsInput({ filePath, fileContent }));
    expect(issue).toEqual(
      expect.objectContaining({
        ruleId: 'S3512',
      }),
    );
  });

  it('should analyze using TSConfig', async () => {
    const rules: RuleConfig[] = [
      {
        key: 'S4335',
        configurations: [],
        fileTypeTargets: ['MAIN'],
        language: 'ts',
        analysisModes: ['DEFAULT'],
      },
    ];
    const filePath = path.join(fixtures, 'tsconfig.ts');
    await Linter.initialize({ baseDir: path.dirname(filePath), rules });

    const tsConfigs = [path.join(fixtures, 'tsconfig.json')];
    const language = 'ts';

    const {
      issues: [issue],
    } = await analyzeJSTS(await jsTsInput({ filePath, tsConfigs, language }));
    expect(issue).toEqual(
      expect.objectContaining({
        ruleId: 'S4335',
      }),
    );
  });

  it('should analyze using TypeScript program', async () => {
    const rules: RuleConfig[] = [
      {
        key: 'S2870',
        configurations: [],
        fileTypeTargets: ['MAIN'],
        language: 'ts',
        analysisModes: ['DEFAULT'],
      },
    ];
    const filePath = path.join(fixtures, 'program.ts');
    await Linter.initialize({ baseDir: path.dirname(filePath), rules });

    const tsConfig = path.join(fixtures, 'tsconfig.json');
    const programOptions = createProgramOptions(tsConfig);
    const program = createStandardProgram(programOptions);
    const language = 'ts';

    const {
      issues: [issue],
    } = await analyzeJSTS(await jsTsInput({ filePath, program, language }));
    expect(issue).toEqual(
      expect.objectContaining({
        ruleId: 'S2870',
      }),
    );
  });

  it('should succeed with types using tsconfig with path aliases', async () => {
    const rules: RuleConfig[] = [
      {
        key: 'S3003',
        configurations: [],
        fileTypeTargets: ['MAIN'],
        language: 'ts',
        analysisModes: ['DEFAULT'],
      },
    ];
    const filePath = path.join(fixtures, 'paths', 'file.ts');
    await Linter.initialize({ baseDir: path.dirname(filePath), rules });

    const tsConfig = path.join(fixtures, 'paths', 'tsconfig.json');
    const programOptions = createProgramOptions(tsConfig);
    const program = createStandardProgram(programOptions);
    const language = 'ts';

    const {
      issues: [issue],
    } = await analyzeJSTS(await jsTsInput({ filePath, program, language }));
    expect(issue).toEqual(
      expect.objectContaining({
        ruleId: 'S3003',
      }),
    );
  });

  it('should fail with types using tsconfig without paths aliases', async () => {
    const rules: RuleConfig[] = [
      {
        key: 'S3003',
        configurations: [],
        fileTypeTargets: ['MAIN'],
        language: 'js',
        analysisModes: ['DEFAULT'],
      },
    ];
    const filePath = path.join(fixtures, 'paths', 'file.ts');
    await Linter.initialize({ baseDir: path.dirname(filePath), rules });

    const tsConfig = path.join(fixtures, 'paths', 'tsconfig_no_paths.json');
    const programOptions = createProgramOptions(tsConfig);
    const program = createStandardProgram(programOptions);
    const language = 'ts';

    const { issues } = await analyzeJSTS(await jsTsInput({ filePath, program, language }));
    expect(issues).toHaveLength(0);
  });

  it('different tsconfig module resolution affects files included in program', async () => {
    const rules: RuleConfig[] = [
      {
        key: 'S3003',
        configurations: [],
        fileTypeTargets: ['MAIN'],
        language: 'ts',
        analysisModes: ['DEFAULT'],
      },
    ];
    const filePath = path.join(fixtures, 'module', 'file.ts');
    await Linter.initialize({ baseDir: path.dirname(filePath), rules });

    const language = 'ts';

    const nodeDependencyPath = path.join(
      fixtures,
      'module',
      'node_modules',
      'string42',
      'index.ts',
    );
    const nodenextDependencyPath = path.join(
      fixtures,
      'module',
      'node_modules',
      'string42',
      'export.ts',
    );
    const classicDependencyPath = path.join(fixtures, 'module', 'string42.ts');

    const nodeTsConfig = path.join(fixtures, 'module', 'tsconfig_commonjs.json');
    const nodeProgramOptions = createProgramOptions(nodeTsConfig);
    const nodeProgram = createStandardProgram(nodeProgramOptions);
    const nodeFiles = nodeProgram.getSourceFiles().map(file => file.fileName);
    expect(nodeFiles).toContain(toUnixPath(nodeDependencyPath));
    expect(nodeFiles).not.toContain(toUnixPath(nodenextDependencyPath));
    expect(nodeFiles).not.toContain(toUnixPath(classicDependencyPath));
    const {
      issues: [nodeIssue],
    } = await analyzeJSTS(await jsTsInput({ filePath, program: nodeProgram, language }));
    expect(nodeIssue).toEqual(
      expect.objectContaining({
        ruleId: 'S3003',
      }),
    );

    const nodenextTsConfig = path.join(fixtures, 'module', 'tsconfig_nodenext.json');
    const nodenextProgramOptions = createProgramOptions(nodenextTsConfig);
    const nodenextProgram = createStandardProgram(nodenextProgramOptions);
    const nodenextFiles = nodenextProgram.getSourceFiles().map(file => file.fileName);
    expect(nodenextFiles).not.toContain(toUnixPath(nodeDependencyPath));
    expect(nodenextFiles).toContain(toUnixPath(nodenextDependencyPath));
    expect(nodenextFiles).not.toContain(toUnixPath(classicDependencyPath));
    const {
      issues: [nodenextIssue],
    } = await analyzeJSTS(await jsTsInput({ filePath, program: nodenextProgram, language }));
    expect(nodenextIssue).toEqual(
      expect.objectContaining({
        ruleId: 'S3003',
      }),
    );

    const classicTsConfig = path.join(fixtures, 'module', 'tsconfig_esnext.json');
    const classicProgramOptions = createProgramOptions(classicTsConfig);
    const classicProgram = createStandardProgram(classicProgramOptions);
    const classicFiles = classicProgram.getSourceFiles().map(file => file.fileName);
    expect(classicFiles).not.toContain(toUnixPath(nodeDependencyPath));
    expect(classicFiles).not.toContain(toUnixPath(nodenextDependencyPath));
    expect(classicFiles).toContain(toUnixPath(classicDependencyPath));
    const {
      issues: [classicIssue],
    } = await analyzeJSTS(await jsTsInput({ filePath, program: classicProgram, language }));
    expect(classicIssue).toEqual(
      expect.objectContaining({
        ruleId: 'S3003',
      }),
    );
  });

  it('should analyze using type information', async () => {
    const rules: RuleConfig[] = [
      {
        key: 'S3403',
        configurations: [],
        fileTypeTargets: ['MAIN'],
        language: 'js',
        analysisModes: ['DEFAULT'],
      },
    ];
    const filePath = path.join(fixtures, 'type.js');
    await Linter.initialize({ baseDir: path.dirname(filePath), rules });

    const tsConfigs = [path.join(fixtures, 'tsconfig.json')];

    const {
      issues: [issue],
    } = await analyzeJSTS(await jsTsInput({ filePath, tsConfigs }));
    expect(issue).toEqual(
      expect.objectContaining({
        ruleId: 'S3403',
      }),
    );
  });

  it('should report issues', async () => {
    const rules: RuleConfig[] = [
      {
        key: 'S1314',
        configurations: [],
        fileTypeTargets: ['MAIN'],
        language: 'js',
        analysisModes: ['DEFAULT'],
      },
    ];
    const filePath = path.join(fixtures, 'issue.js');
    await Linter.initialize({ baseDir: path.dirname(filePath), rules });

    const { issues } = await analyzeJSTS(await jsTsInput({ filePath }));
    expect(issues).toEqual([
      {
        ruleId: 'S1314',
        language: 'js',
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
    const rules: RuleConfig[] = [
      {
        key: 'S3514',
        configurations: [],
        fileTypeTargets: ['MAIN'],
        language: 'js',
        analysisModes: ['DEFAULT'],
      },
    ];
    const filePath = path.join(fixtures, 'secondary.js');
    await Linter.initialize({ baseDir: path.dirname(filePath), rules });

    const {
      issues: [{ secondaryLocations }],
    } = await analyzeJSTS(await jsTsInput({ filePath }));
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
    const rules: RuleConfig[] = [
      {
        key: 'S1172',
        configurations: [],
        fileTypeTargets: ['MAIN'],
        language: 'js',
        analysisModes: ['DEFAULT'],
      },
    ];
    const filePath = path.join(fixtures, 'quickfix.js');
    await Linter.initialize({ baseDir: path.dirname(filePath), rules });

    const {
      issues: [{ quickFixes }],
    } = await analyzeJSTS(await jsTsInput({ filePath }));
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
    const rules: RuleConfig[] = [];
    const filePath = path.join(fixtures, 'metrics.js');
    await Linter.initialize({ baseDir: path.dirname(filePath), rules });

    const { highlights, highlightedSymbols, metrics, cpdTokens } = await analyzeJSTS(
      await jsTsInput({ filePath }),
    );

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
    const rules: RuleConfig[] = [];
    const filePath = path.join(fixtures, 'metrics.js');
    await Linter.initialize({ baseDir: path.dirname(filePath), rules });

    const fileType = 'TEST';

    const { highlights, highlightedSymbols, metrics, cpdTokens } = await analyzeJSTS(
      await jsTsInput({ filePath, fileType }),
    );

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
    const rules: RuleConfig[] = [];
    const filePath = path.join(fixtures, 'metrics.js');
    await Linter.initialize({ baseDir: path.dirname(filePath), rules });

    const { highlights, highlightedSymbols, metrics, cpdTokens } = await analyzeJSTS(
      await jsTsInput({ filePath, sonarlint: true }),
    );

    const extendedMetrics = { highlights, highlightedSymbols, metrics, cpdTokens };
    expect(extendedMetrics).toEqual({
      metrics: {
        nosonarLines: [4],
      },
    });
  });

  it('should return parsing errors', async () => {
    const rules: RuleConfig[] = [];
    const filePath = path.join(fixtures, 'parsing-error.js');
    await Linter.initialize({ baseDir: path.dirname(filePath), rules });

    const analysisInput = await jsTsInput({ filePath });
    await expect(() => analyzeJSTS(analysisInput)).rejects.toThrow(
      APIError.parsingError('Unexpected token (3:0)', { line: 3 }),
    );
  });

  it('package.json should be available in rule context', async () => {
    const baseDir = path.join(fixtures, 'package-json');

    const linter = new ESLintLinter();
    const linterConfig: ESLintLinter.Config = {
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

  it('should return the AST along with the issues', async () => {
    const rules: RuleConfig[] = [
      {
        key: 'S4524',
        configurations: [],
        fileTypeTargets: ['MAIN'],
        language: 'js',
        analysisModes: ['DEFAULT'],
      },
    ];
    const filePath = path.join(fixtures, 'code.js');
    await Linter.initialize({ baseDir: path.dirname(filePath), rules });

    const analysisResult = await analyzeJSTS(await jsTsInput({ filePath }));
    if ('ast' in analysisResult) {
      const { ast } = analysisResult;
      const protoMessage = deserializeProtobuf(ast);
      expect(protoMessage.program).toBeDefined();
      expect(protoMessage.program.body).toHaveLength(1);
      expect(protoMessage.program.body[0].functionDeclaration.id.identifier.name).toEqual('f');
    }
  });

  it('should not return the AST if the skipAst flag is set', async () => {
    const rules: RuleConfig[] = [
      {
        key: 'S4524',
        configurations: [],
        fileTypeTargets: ['MAIN'],
        language: 'js',
        analysisModes: ['DEFAULT'],
      },
    ];
    const filePath = path.join(fixtures, 'code.js');
    await Linter.initialize({ baseDir: path.dirname(filePath), rules });

    const analysisResult = await analyzeJSTS(await jsTsInput({ filePath, skipAst: true }));
    assert(!('ast' in analysisResult));
  });
});
