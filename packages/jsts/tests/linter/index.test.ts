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
import path from 'path';
import { parseJavaScriptSourceFile, parseTypeScriptSourceFile } from '../tools/helpers/parsing.js';
import { describe, it, type Mock } from 'node:test';
import { expect } from 'expect';
import { Linter } from '../../src/linter/linter.js';
import { RuleConfig } from '../../src/linter/config/rule-config.js';
import { JsTsLanguage } from '../../../shared/src/helpers/configuration.js';
import { AnalysisMode } from '../../src/analysis/analysis.js';
import { quickFixRules } from '../../src/linter/quickfixes/rules.js';
import fs from 'fs';

describe('Linter', () => {
  it('should initialize the linter wrapper', async ({ mock }) => {
    console.log = mock.fn(console.log);

    await Linter.initialize({
      rules: [
        {
          key: 'S1116',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
      ],
    });

    const logs = (console.log as Mock<typeof console.log>).mock.calls.map(
      call => call.arguments[0],
    );
    expect(logs).toContain('DEBUG Initializing linter with S1116');

    const filePath = path.join(import.meta.dirname, 'fixtures', 'index', 'regular.js');

    const {
      issues: [issue],
    } = Linter.lint(await parseJavaScriptSourceFile(filePath), filePath);
    expect(issue).toEqual(
      expect.objectContaining({
        ruleId: 'S1116',
        line: 1,
        column: 8,
      }),
    );
  });

  it('should load rule bundles', async ({ mock }) => {
    const bundlePath = path.join(
      import.meta.dirname,
      'fixtures',
      'index',
      'custom-rule-bundle',
      'rules.js',
    );

    console.log = mock.fn(console.log);

    await Linter.initialize({
      rules: [
        {
          key: 'custom-rule',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
      ],
      environments: [],
      globals: [],
      sonarlint: false,
      bundles: [bundlePath],
    });

    const logs = (console.log as Mock<typeof console.log>).mock.calls.map(
      call => call.arguments[0],
    );
    expect(logs).toContain(`DEBUG Loaded rule custom-rule from ${bundlePath}`);
    expect(logs).toContain('DEBUG Initializing linter with custom-rule');

    const filePath = path.join(import.meta.dirname, 'fixtures', 'index', 'custom.js');

    const {
      issues: [issue],
    } = Linter.lint(await parseJavaScriptSourceFile(filePath, [], 'MAIN', false, false), filePath);
    expect(issue).toEqual(
      expect.objectContaining({
        ruleId: 'custom-rule',
        line: 1,
        column: 0,
        endLine: 1,
        endColumn: 3,
        message: 'call',
      }),
    );
  });

  it('should enable environments', async () => {
    await Linter.initialize({ rules: [], environments: ['node', 'jquery'] });
    expect(Linter.globals.has('__dirname')).toBeTruthy();
    expect(Linter.globals.has('$')).toBeTruthy();
  });

  it('should enable globals', async () => {
    await Linter.initialize({ rules: [], environments: [], globals: ['_', '$'] });
    expect(Linter.globals.has('_')).toBeTruthy();
    expect(Linter.globals.has('$')).toBeTruthy();
  });

  it('should enable rules', async () => {
    await Linter.initialize({
      rules: [
        {
          key: 'S100',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
      ],
    });
    expect(Linter.getRulesForFile('file.js', 'MAIN', 'DEFAULT', 'js')).toEqual(
      expect.objectContaining({
        'sonarjs/S100': [
          'error',
          {
            format: '^[_a-z][a-zA-Z0-9]*$',
          },
        ],
      }),
    );
  });

  it('should enable internal custom rules by default', async () => {
    await Linter.initialize({});
    expect(Linter.getRulesForFile('file.js', 'MAIN', 'DEFAULT', 'js')).toEqual({
      'sonarjs/internal-cognitive-complexity': ['error', 'metric'],
      'sonarjs/internal-symbol-highlighting': ['error'],
    });
  });

  it('should not enable internal custom rules in SonarLint context', async () => {
    await Linter.initialize({
      rules: [
        {
          key: 'S100',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
      ],
      environments: [],
      globals: [],
      sonarlint: true,
    });
    expect(Linter.getRulesForFile('file.js', 'MAIN', 'DEFAULT', 'js')).toEqual({
      'sonarjs/S100': [
        'error',
        {
          format: '^[_a-z][a-zA-Z0-9]*$',
        },
      ],
    });
  });

  it('should report issues from internal rules', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'wrapper', 'internal.js');
    const parseResult = await parseJavaScriptSourceFile(filePath);

    const ruleId = 'S2251';
    const rules: RuleConfig[] = [
      {
        key: ruleId,
        configurations: [],
        fileTypeTargets: ['MAIN'],
        language: 'js',
        analysisModes: ['DEFAULT'],
      },
    ];

    await Linter.initialize({ rules });
    const { issues } = Linter.lint(parseResult, filePath, 'MAIN', 'SAME');

    expect(issues).toEqual([
      expect.objectContaining({
        ruleId,
      }),
    ]);
  });

  it('should skip issues for unchanged files when analysis mode is skip_unchanged', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'wrapper', 'internal.js');
    const parseResult = await parseJavaScriptSourceFile(filePath);

    const ruleId = 'S2251';
    const rules: RuleConfig[] = [
      {
        key: ruleId,
        configurations: [],
        fileTypeTargets: ['MAIN'],
        language: 'js',
        analysisModes: ['DEFAULT'],
      },
    ];

    await Linter.initialize({ rules });
    const { issues } = Linter.lint(parseResult, filePath, 'MAIN', 'SAME', 'SKIP_UNCHANGED');

    expect(issues).toEqual([]);
  });

  it('should report issues from type-aware rules', async () => {
    const fixtures = path.join(import.meta.dirname, 'fixtures', 'wrapper', 'type-aware');
    const filePath = path.join(fixtures, 'file.js');
    const tsConfig = path.join(fixtures, 'tsconfig.json');

    const parseResult = await parseJavaScriptSourceFile(filePath, [tsConfig]);

    const ruleId = 'S3403';
    const rules: RuleConfig[] = [
      {
        key: ruleId,
        configurations: [],
        fileTypeTargets: ['MAIN'],
        language: 'js',
        analysisModes: ['DEFAULT'],
      },
    ];

    await Linter.initialize({ rules });
    const { issues } = Linter.lint(parseResult, filePath);

    expect(issues).toEqual([
      expect.objectContaining({
        ruleId,
      }),
    ]);
  });

  it('should report issues based on the file type', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'wrapper', 'file-type.js');
    const parseResult = await parseJavaScriptSourceFile(filePath);

    const rules: RuleConfig[] = [
      {
        key: 'S1116',
        configurations: [],
        fileTypeTargets: ['MAIN'],
        language: 'js',
        analysisModes: ['DEFAULT'],
      },
      {
        key: 'S3504',
        configurations: [],
        fileTypeTargets: ['TEST'],
        language: 'js',
        analysisModes: ['DEFAULT'],
      },
    ];

    await Linter.initialize({ rules });
    const { issues } = Linter.lint(parseResult, filePath, 'TEST');

    expect(issues).toEqual([
      expect.objectContaining({
        ruleId: 'S3504',
      }),
    ]);
  });

  it('should not report issues from decorated rules', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'wrapper', 'decorated.js');
    const parseResult = await parseJavaScriptSourceFile(filePath);

    const ruleId = 'S3512';
    const rules: RuleConfig[] = [
      {
        key: ruleId,
        configurations: [],
        fileTypeTargets: ['MAIN'],
        language: 'js',
        analysisModes: ['DEFAULT'],
      },
    ];

    await Linter.initialize({ rules });
    const { issues } = Linter.lint(parseResult, filePath);

    expect(issues).toHaveLength(0);
  });

  it('should not report issues from sanitized rules', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'wrapper', 'sanitized.ts');
    const parseResult = await parseTypeScriptSourceFile(filePath, [], 'MAIN');
    const ruleId = 'S2933';
    const rules: RuleConfig[] = [
      {
        key: ruleId,
        configurations: [],
        fileTypeTargets: ['MAIN'],
        language: 'js',
        analysisModes: ['DEFAULT'],
      },
    ];
    await Linter.initialize({ rules });
    const { issues } = Linter.lint(parseResult, filePath);

    expect(issues).toHaveLength(0);
  });

  it('should report issues with secondary locations', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'wrapper', 'secondary-location.js');
    const parseResult = await parseJavaScriptSourceFile(filePath);

    const ruleId = 'S1110';
    const rules: RuleConfig[] = [
      {
        key: ruleId,
        configurations: [],
        fileTypeTargets: ['MAIN'],
        language: 'js',
        analysisModes: ['DEFAULT'],
      },
    ];

    await Linter.initialize({ rules });
    const { issues } = Linter.lint(parseResult, filePath);

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
    const ruleId = 'S3854';

    const parseResult = await parseJavaScriptSourceFile(filePath);

    const rules: RuleConfig[] = [
      {
        key: ruleId,
        configurations: [],
        fileTypeTargets: [fileType],
        language: 'js',
        analysisModes: ['DEFAULT'],
      },
    ];

    await Linter.initialize({ rules });
    const { issues } = Linter.lint(parseResult, filePath);

    expect(issues).toHaveLength(4);
    expect(issues.every(issue => issue.ruleId === 'S3854')).toBe(true);
  });

  it('should not report issues if rule is disabled with ESLint', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'wrapper', 'eslint-directive.js');
    const parseResult = await parseJavaScriptSourceFile(filePath);
    const ruleId = 'S3504';
    const rules: RuleConfig[] = [
      {
        key: ruleId,
        configurations: [],
        fileTypeTargets: ['MAIN'],
        language: 'js',
        analysisModes: ['DEFAULT'],
      },
    ];

    await Linter.initialize({ rules });
    const { issues } = Linter.lint(parseResult, filePath);

    expect(issues).toHaveLength(0);
  });

  it('should take into account comment-based eslint configurations', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'wrapper', 'eslint-config.js');
    const parseResult = await parseJavaScriptSourceFile(filePath);

    await Linter.initialize({ rules: [] });
    const { issues } = Linter.lint(parseResult, filePath);

    expect(issues).toEqual([
      expect.objectContaining({
        ruleId: 'S107',
        line: 2,
        column: 0,
        endLine: 2,
        endColumn: 12,
      }),
    ]);
  });

  it('should not report on globals provided by environments configuration', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'wrapper', 'env.js');
    const fileType = 'MAIN';
    const language: JsTsLanguage = 'js';
    const analysisMode: AnalysisMode = 'SKIP_UNCHANGED';

    const parseResult = await parseJavaScriptSourceFile(filePath);
    const rules: RuleConfig[] = [
      {
        key: 'S3798',
        configurations: [],
        fileTypeTargets: [fileType],
        language,
        analysisModes: [analysisMode],
      },
    ];

    const env = ['browser'];

    await Linter.initialize({ rules, environments: env });
    const { issues } = Linter.lint(parseResult, filePath);
    expect(Linter.globals.has('alert')).toBeTruthy();
    expect(issues).toHaveLength(0);
  });

  it('should not report on globals provided by globals configuration', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'wrapper', 'global.js');
    const fileType = 'MAIN';
    const language: JsTsLanguage = 'js';
    const analysisMode: AnalysisMode = 'DEFAULT';

    const parseResult = await parseJavaScriptSourceFile(filePath);

    const rules: RuleConfig[] = [
      {
        key: 'S3798',
        configurations: [],
        fileTypeTargets: [fileType],
        language,
        analysisModes: [analysisMode],
      },
    ];
    const globals = ['angular'];

    await Linter.initialize({ rules, environments: [], globals: globals });
    const { issues } = Linter.lint(parseResult, filePath);

    expect(Linter.globals.has('angular')).toEqual(true);
    expect(issues).toHaveLength(0);
  });

  it('should compute cognitive complexity and symbol highlighting', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'wrapper', 'cognitive-symbol.js');
    const parseResult = await parseJavaScriptSourceFile(filePath);

    await Linter.initialize({ rules: [] });
    const { cognitiveComplexity, highlightedSymbols } = Linter.lint(parseResult, filePath);

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
      const parseResult = await parser(filePath, [tsConfig]);
      const rules: RuleConfig[] = [
        {
          key: ruleId,
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
      ];

      await Linter.initialize({ rules });
      const {
        issues: [issue],
      } = Linter.lint(parseResult, filePath);

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
    const parseResult = await parseJavaScriptSourceFile(filePath);

    const ruleId = 'S1105';
    const rules: RuleConfig[] = [
      {
        key: ruleId,
        configurations: [],
        fileTypeTargets: ['MAIN'],
        language: 'js',
        analysisModes: ['DEFAULT'],
      },
    ];

    await Linter.initialize({ rules });
    const { issues } = Linter.lint(parseResult, filePath);

    expect(issues).toEqual([
      expect.objectContaining({
        ruleId,
        quickFixes: [],
      }),
    ]);
  });
});
