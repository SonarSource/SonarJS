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
import path from 'node:path';
import { parseJavaScriptSourceFile, parseTypeScriptSourceFile } from '../tools/helpers/parsing.js';
import { describe, it, type Mock } from 'node:test';
import { expect } from 'expect';
import { Linter } from '../../src/linter/linter.js';
import { RuleConfig } from '../../src/linter/config/rule-config.js';
import { JsTsLanguage } from '../../../shared/src/helpers/configuration.js';
import { AnalysisMode } from '../../src/analysis/analysis.js';
import { normalizeToAbsolutePath } from '../../src/rules/helpers/files.js';
import {
  getProjectAnalysisTelemetry,
  resetProjectAnalysisTelemetry,
} from '../../src/analysis/projectAnalysis/telemetry.js';

describe('Linter', () => {
  it('should initialize the linter wrapper', async ({ mock }) => {
    console.log = mock.fn(console.log);

    await Linter.initialize({
      baseDir: normalizeToAbsolutePath(import.meta.dirname),
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

    const filePath = normalizeToAbsolutePath(
      path.join(import.meta.dirname, 'fixtures', 'index', 'regular.js'),
    );

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
    const bundlePath = normalizeToAbsolutePath(
      path.join(import.meta.dirname, 'fixtures', 'index', 'custom-rule-bundle', 'rules.js'),
    );

    console.log = mock.fn(console.log);

    await Linter.initialize({
      baseDir: normalizeToAbsolutePath(import.meta.dirname),
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

    const filePath = normalizeToAbsolutePath(
      path.join(import.meta.dirname, 'fixtures', 'index', 'custom.js'),
    );

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
    await Linter.initialize({
      baseDir: normalizeToAbsolutePath(import.meta.dirname),
      rules: [],
      environments: ['node', 'jquery'],
    });
    expect(Linter.globals.has('__dirname')).toBeTruthy();
    expect(Linter.globals.has('$')).toBeTruthy();
  });

  it('should enable globals', async () => {
    await Linter.initialize({
      baseDir: normalizeToAbsolutePath(import.meta.dirname),
      rules: [],
      environments: [],
      globals: ['_', '$'],
    });
    expect(Linter.globals.has('_')).toBeTruthy();
    expect(Linter.globals.has('$')).toBeTruthy();
  });

  it('should enable rules', async () => {
    await Linter.initialize({
      baseDir: normalizeToAbsolutePath(import.meta.dirname),
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
    expect(
      Linter.getRulesForFile(normalizeToAbsolutePath('/file.js'), 'MAIN', 'DEFAULT', 'js'),
    ).toEqual(
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

  it('should disable React-dependent rules when react dependency is missing', async () => {
    const baseDir = normalizeToAbsolutePath(
      path.join(import.meta.dirname, 'fixtures', 'dependency-filter', 'no-react'),
    );
    await Linter.initialize({
      baseDir,
      rules: [
        {
          key: 'S6477',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
      ],
    });
    const rules = Linter.getRulesForFile(
      normalizeToAbsolutePath(path.join(baseDir, 'src', 'file.jsx')),
      'MAIN',
      'DEFAULT',
      'js',
    );
    expect(rules).not.toHaveProperty('sonarjs/S6477');
  });

  it('should enable React-dependent rules when react dependency is present', async () => {
    const baseDir = normalizeToAbsolutePath(
      path.join(import.meta.dirname, 'fixtures', 'dependency-filter', 'react'),
    );
    await Linter.initialize({
      baseDir,
      rules: [
        {
          key: 'S6477',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
      ],
    });
    const rules = Linter.getRulesForFile(
      normalizeToAbsolutePath(path.join(baseDir, 'src', 'file.jsx')),
      'MAIN',
      'DEFAULT',
      'js',
    );
    expect(rules).toHaveProperty('sonarjs/S6477');
  });

  it('should enable cognitive complexity metric rule by default', async () => {
    await Linter.initialize({
      baseDir: normalizeToAbsolutePath(import.meta.dirname),
    });
    expect(
      Linter.getRulesForFile(normalizeToAbsolutePath('/file.js'), 'MAIN', 'DEFAULT', 'js'),
    ).toEqual({
      'sonarjs/S3776': ['error', 'metric'],
    });
  });

  it('should run S3776 in issue and metric mode when enabled in profile', async () => {
    await Linter.initialize({
      baseDir: normalizeToAbsolutePath(import.meta.dirname),
      rules: [
        {
          key: 'S3776',
          configurations: [0],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
      ],
    });
    expect(
      Linter.getRulesForFile(normalizeToAbsolutePath('/file.js'), 'MAIN', 'DEFAULT', 'js'),
    ).toEqual({
      'sonarjs/S3776': ['error', 0, 'metric', 'report-issues'],
    });
  });

  it('should disable rules whose requiredEcmaVersion exceeds the detected ES year', async () => {
    // S7755 (prefer-at) requires ES2022 — should be disabled when project is ES2020
    await Linter.initialize({
      baseDir: normalizeToAbsolutePath(import.meta.dirname),
      rules: [
        {
          key: 'S7755',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
      ],
    });
    const rules = Linter.getRulesForFile(
      normalizeToAbsolutePath('/file.js'),
      'MAIN',
      'DEFAULT',
      'js',
      2020,
    );
    expect(rules).not.toHaveProperty('sonarjs/S7755');
  });

  it('should enable rules whose requiredEcmaVersion matches the detected ES year', async () => {
    // S7755 requires ES2022 — should be enabled when project is exactly ES2022
    await Linter.initialize({
      baseDir: normalizeToAbsolutePath(import.meta.dirname),
      rules: [
        {
          key: 'S7755',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
      ],
    });
    const rules = Linter.getRulesForFile(
      normalizeToAbsolutePath('/file.js'),
      'MAIN',
      'DEFAULT',
      'js',
      2022,
    );
    expect(rules).toHaveProperty('sonarjs/S7755');
  });

  it('should enable all rules when detectedEsYear is undefined (esnext fallback)', async () => {
    // No ES year detected → no restriction, all active rules should be enabled
    await Linter.initialize({
      baseDir: normalizeToAbsolutePath(import.meta.dirname),
      rules: [
        {
          key: 'S7755',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
      ],
    });
    const rules = Linter.getRulesForFile(
      normalizeToAbsolutePath('/file.js'),
      'MAIN',
      'DEFAULT',
      'js',
      undefined,
    );
    expect(rules).toHaveProperty('sonarjs/S7755');
  });

  it('should disable rules whose requiredModuleType excludes detected module type', async () => {
    // S7785 requires ESM modules — should be disabled for explicit CommonJS files
    await Linter.initialize({
      baseDir: normalizeToAbsolutePath(import.meta.dirname),
      rules: [
        {
          key: 'S7785',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
      ],
    });
    const rules = Linter.getRulesForFile(
      normalizeToAbsolutePath('/file.cjs'),
      'MAIN',
      'DEFAULT',
      'js',
      2022,
    );
    expect(rules).not.toHaveProperty('sonarjs/S7785');
  });

  it('should enable rules when requiredModuleType matches detected module type', async () => {
    // S7785 requires ESM modules — should be enabled for explicit ES modules
    await Linter.initialize({
      baseDir: normalizeToAbsolutePath(import.meta.dirname),
      rules: [
        {
          key: 'S7785',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
      ],
    });
    const rules = Linter.getRulesForFile(
      normalizeToAbsolutePath('/file.mjs'),
      'MAIN',
      'DEFAULT',
      'js',
      2022,
    );
    expect(rules).toHaveProperty('sonarjs/S7785');
  });

  it('should not filter rules by module type when no module signal is available', async () => {
    // Unknown module type should keep rules enabled (same behavior as unknown ES version)
    await Linter.initialize({
      baseDir: normalizeToAbsolutePath(import.meta.dirname),
      rules: [
        {
          key: 'S7785',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
      ],
    });
    const rules = Linter.getRulesForFile(
      normalizeToAbsolutePath('/file.js'),
      'MAIN',
      'DEFAULT',
      'js',
      2022,
    );
    expect(rules).toHaveProperty('sonarjs/S7785');
  });

  it('should track module type telemetry during rule filtering', async () => {
    resetProjectAnalysisTelemetry();
    await Linter.initialize({
      baseDir: normalizeToAbsolutePath(import.meta.dirname),
      rules: [],
    });

    Linter.getRulesForFile(normalizeToAbsolutePath('/file.mjs'), 'MAIN', 'DEFAULT', 'js');
    Linter.getRulesForFile(normalizeToAbsolutePath('/file.cjs'), 'MAIN', 'DEFAULT', 'js');
    Linter.getRulesForFile(normalizeToAbsolutePath('/file.js'), 'MAIN', 'DEFAULT', 'js');

    expect(getProjectAnalysisTelemetry()).toMatchObject({
      esmFileCount: 1,
      cjsFileCount: 1,
    });
  });

  it('should not enable internal custom rules in SonarLint context', async () => {
    await Linter.initialize({
      baseDir: normalizeToAbsolutePath(import.meta.dirname),
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
    expect(
      Linter.getRulesForFile(normalizeToAbsolutePath('/file.js'), 'MAIN', 'DEFAULT', 'js'),
    ).toEqual({
      'sonarjs/S100': [
        'error',
        {
          format: '^[_a-z][a-zA-Z0-9]*$',
        },
      ],
    });
  });

  it('should report issues from internal rules', async () => {
    const filePath = normalizeToAbsolutePath(
      path.join(import.meta.dirname, 'fixtures', 'wrapper', 'internal.js'),
    );
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

    await Linter.initialize({ baseDir: normalizeToAbsolutePath(path.dirname(filePath)), rules });
    const { issues } = Linter.lint(parseResult, filePath, 'MAIN', 'SAME');

    expect(issues).toEqual([
      expect.objectContaining({
        ruleId,
      }),
    ]);
  });

  it('should skip issues for unchanged files when analysis mode is skip_unchanged', async () => {
    const filePath = normalizeToAbsolutePath(
      path.join(import.meta.dirname, 'fixtures', 'wrapper', 'internal.js'),
    );
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

    await Linter.initialize({ baseDir: normalizeToAbsolutePath(path.dirname(filePath)), rules });
    const { issues } = Linter.lint(parseResult, filePath, 'MAIN', 'SAME', 'SKIP_UNCHANGED');

    expect(issues).toEqual([]);
  });

  it('should report issues from type-aware rules', async () => {
    const fixtures = path.join(import.meta.dirname, 'fixtures', 'wrapper', 'type-aware');
    const filePath = normalizeToAbsolutePath(path.join(fixtures, 'file.js'));
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

    await Linter.initialize({ baseDir: normalizeToAbsolutePath(path.dirname(filePath)), rules });
    const { issues } = Linter.lint(parseResult, filePath);

    expect(issues).toEqual([
      expect.objectContaining({
        ruleId,
      }),
    ]);
  });

  it('should report issues based on the file type', async () => {
    const filePath = normalizeToAbsolutePath(
      path.join(import.meta.dirname, 'fixtures', 'wrapper', 'file-type.js'),
    );
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

    await Linter.initialize({ baseDir: normalizeToAbsolutePath(path.dirname(filePath)), rules });
    const { issues } = Linter.lint(parseResult, filePath, 'TEST');

    expect(issues).toEqual([
      expect.objectContaining({
        ruleId: 'S3504',
      }),
    ]);
  });

  it('should not report issues from decorated rules', async () => {
    const filePath = normalizeToAbsolutePath(
      path.join(import.meta.dirname, 'fixtures', 'wrapper', 'decorated.js'),
    );
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

    await Linter.initialize({ baseDir: normalizeToAbsolutePath(path.dirname(filePath)), rules });
    const { issues } = Linter.lint(parseResult, filePath);

    expect(issues).toHaveLength(0);
  });

  it('should not report issues from sanitized rules', async () => {
    const filePath = normalizeToAbsolutePath(
      path.join(import.meta.dirname, 'fixtures', 'wrapper', 'sanitized.ts'),
    );
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
    await Linter.initialize({ baseDir: normalizeToAbsolutePath(path.dirname(filePath)), rules });
    const { issues } = Linter.lint(parseResult, filePath);

    expect(issues).toHaveLength(0);
  });

  it('should report issues with secondary locations', async () => {
    const filePath = normalizeToAbsolutePath(
      path.join(import.meta.dirname, 'fixtures', 'wrapper', 'secondary-location.js'),
    );
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

    await Linter.initialize({ baseDir: normalizeToAbsolutePath(path.dirname(filePath)), rules });
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
    const filePath = normalizeToAbsolutePath(
      path.join(import.meta.dirname, 'fixtures', 'wrapper', 'constructor-super.js'),
    );
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

    await Linter.initialize({ baseDir: normalizeToAbsolutePath(path.dirname(filePath)), rules });
    const { issues } = Linter.lint(parseResult, filePath);

    expect(issues).toHaveLength(4);
    expect(issues.every(issue => issue.ruleId === 'S3854')).toBe(true);
  });

  it('should not report issues if rule is disabled with ESLint', async () => {
    const filePath = normalizeToAbsolutePath(
      path.join(import.meta.dirname, 'fixtures', 'wrapper', 'eslint-directive.js'),
    );
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

    await Linter.initialize({ baseDir: normalizeToAbsolutePath(path.dirname(filePath)), rules });
    const { issues } = Linter.lint(parseResult, filePath);

    expect(issues).toHaveLength(0);
  });

  it('should take into account comment-based eslint configurations', async () => {
    const filePath = normalizeToAbsolutePath(
      path.join(import.meta.dirname, 'fixtures', 'wrapper', 'eslint-config.js'),
    );
    const parseResult = await parseJavaScriptSourceFile(filePath);

    await Linter.initialize({
      baseDir: normalizeToAbsolutePath(path.dirname(filePath)),
      rules: [],
    });
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
    const filePath = normalizeToAbsolutePath(
      path.join(import.meta.dirname, 'fixtures', 'wrapper', 'env.js'),
    );
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

    await Linter.initialize({
      baseDir: normalizeToAbsolutePath(path.dirname(filePath)),
      rules,
      environments: env,
    });
    const { issues } = Linter.lint(parseResult, filePath);
    expect(Linter.globals.has('alert')).toBeTruthy();
    expect(issues).toHaveLength(0);
  });

  it('should not report on globals provided by globals configuration', async () => {
    const filePath = normalizeToAbsolutePath(
      path.join(import.meta.dirname, 'fixtures', 'wrapper', 'global.js'),
    );
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

    await Linter.initialize({
      baseDir: normalizeToAbsolutePath(path.dirname(filePath)),
      rules,
      environments: [],
      globals: globals,
    });
    const { issues } = Linter.lint(parseResult, filePath);

    expect(Linter.globals.has('angular')).toEqual(true);
    expect(issues).toHaveLength(0);
  });

  it('should compute cognitive complexity without reporting S3776 issues when rule is disabled', async () => {
    const filePath = normalizeToAbsolutePath(
      path.join(import.meta.dirname, 'fixtures', 'wrapper', 'cognitive-function.js'),
    );
    const parseResult = await parseJavaScriptSourceFile(filePath);

    await Linter.initialize({
      baseDir: normalizeToAbsolutePath(path.dirname(filePath)),
      rules: [],
    });
    const { cognitiveComplexity, issues } = Linter.lint(parseResult, filePath);

    expect(cognitiveComplexity).toEqual(1);
    expect(issues).toEqual([]);
  });

  it('should report S3776 issues and compute cognitive complexity when rule is enabled', async () => {
    const filePath = normalizeToAbsolutePath(
      path.join(import.meta.dirname, 'fixtures', 'wrapper', 'cognitive-function.js'),
    );
    const parseResult = await parseJavaScriptSourceFile(filePath);

    await Linter.initialize({
      baseDir: normalizeToAbsolutePath(path.dirname(filePath)),
      rules: [
        {
          key: 'S3776',
          configurations: [0],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
      ],
    });
    const { cognitiveComplexity, issues } = Linter.lint(parseResult, filePath);

    expect(cognitiveComplexity).toEqual(1);
    expect(issues).toEqual([expect.objectContaining({ ruleId: 'S3776' })]);
  });

  it('should compute cognitive complexity even when S3776 is disabled with ESLint directives', async () => {
    const filePath = normalizeToAbsolutePath(
      path.join(import.meta.dirname, 'fixtures', 'wrapper', 'cognitive-function-disabled.js'),
    );
    const parseResult = await parseJavaScriptSourceFile(filePath);

    await Linter.initialize({
      baseDir: normalizeToAbsolutePath(path.dirname(filePath)),
      rules: [],
    });
    const { cognitiveComplexity, issues } = Linter.lint(parseResult, filePath);

    expect(cognitiveComplexity).toEqual(1);
    expect(issues).toEqual([]);
  });

  it('should compute cognitive complexity', async () => {
    const filePath = normalizeToAbsolutePath(
      path.join(import.meta.dirname, 'fixtures', 'wrapper', 'cognitive-symbol.js'),
    );
    const parseResult = await parseJavaScriptSourceFile(filePath);

    await Linter.initialize({
      baseDir: normalizeToAbsolutePath(path.dirname(filePath)),
      rules: [],
    });
    const { cognitiveComplexity } = Linter.lint(parseResult, filePath);

    expect(cognitiveComplexity).toEqual(6);
  });
});
