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
import path from 'node:path';
import { parseJavaScriptSourceFile, parseTypeScriptSourceFile } from '../tools/helpers/parsing.js';
import { describe, it, type Mock } from 'node:test';
import { expect } from 'expect';
import { build } from '../../../src/jsts/builders/build.js';
import { Linter } from '../../../src/jsts/linter/linter.js';
import { RuleConfig } from '../../../src/jsts/linter/config/rule-config.js';
import { DEFAULT_SUPPRESSED_ISSUE_RESOLUTION_COMMENT } from '../../../src/jsts/linter/issues/transform.js';
import { JsTsLanguage } from '../../../src/common/configuration.js';
import { AnalysisMode } from '../../../src/jsts/analysis/analysis.js';
import {
  normalizeToAbsolutePath,
  type NormalizedAbsolutePath,
} from '../../../../shared/src/helpers/files.js';
import {
  getProjectAnalysisTelemetry,
  resetProjectAnalysisTelemetry,
} from '../../../src/telemetry.js';
import { toInternalMetricsSettings } from '../../../src/jsts/rules/helpers/internal-metrics.js';
import { jsTsInput } from '../tools/helpers/input.js';

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
      Linter.getRulesForFile(
        normalizeToAbsolutePath(path.join(import.meta.dirname, 'file.js')),
        'MAIN',
        'DEFAULT',
        'js',
      ),
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

  it('should not invoke generated-source detector when generated-code detection is disabled', async ({
    mock,
  }) => {
    const isGeneratedSourceFile = mock.fn((_filePath: NormalizedAbsolutePath) => {
      throw new Error('Generated-source detector should not be called.');
    });

    await Linter.initialize({
      baseDir: normalizeToAbsolutePath(import.meta.dirname),
      rules: [],
      detectGeneratedCode: false,
      isGeneratedSourceFile,
    });

    expect(() =>
      Linter.getRulesForFile(
        normalizeToAbsolutePath(path.join(import.meta.dirname, 'file.js')),
        'MAIN',
        'DEFAULT',
        'js',
      ),
    ).not.toThrow();
    expect(isGeneratedSourceFile.mock.calls).toHaveLength(0);
  });

  it('should keep Sonar defaults from config.ts when no explicit configuration is provided', async () => {
    await Linter.initialize({
      baseDir: normalizeToAbsolutePath(import.meta.dirname),
      rules: [
        {
          key: 'S3353',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
      ],
    });
    expect(
      Linter.getRulesForFile(
        normalizeToAbsolutePath(path.join(import.meta.dirname, 'file.js')),
        'MAIN',
        'DEFAULT',
        'js',
      ),
    ).toEqual({
      'sonarjs/S3353': [
        'error',
        {
          destructuring: 'all',
          ignoreReadBeforeAssign: true,
        },
      ],
    });
  });

  it('should keep upstream defaults for rules without Sonar config fields', async () => {
    await Linter.initialize({
      baseDir: normalizeToAbsolutePath(import.meta.dirname),
      rules: [
        {
          key: 'S878',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
      ],
    });
    expect(
      Linter.getRulesForFile(
        normalizeToAbsolutePath(path.join(import.meta.dirname, 'file.js')),
        'MAIN',
        'DEFAULT',
        'js',
      ),
    ).toEqual({
      'sonarjs/S878': [
        'error',
        {
          allowInParentheses: true,
        },
      ],
    });
  });

  it('should derive jsx-a11y wrapper defaults from the upstream recommended preset', async () => {
    await Linter.initialize({
      baseDir: normalizeToAbsolutePath(import.meta.dirname),
      rules: [
        {
          key: 'S6843',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
        {
          key: 'S6845',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
        {
          key: 'S6847',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
        {
          key: 'S6848',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
        {
          key: 'S6852',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
      ],
    });

    expect(
      Linter.getRulesForFile(
        normalizeToAbsolutePath(path.join(import.meta.dirname, 'file.js')),
        'MAIN',
        'DEFAULT',
        'js',
      ),
    ).toEqual({
      'sonarjs/S6843': [
        'error',
        {
          tr: ['none', 'presentation'],
          canvas: ['img'],
        },
      ],
      'sonarjs/S6845': [
        'error',
        {
          tags: [],
          roles: ['tabpanel'],
          allowExpressionValues: true,
        },
      ],
      'sonarjs/S6847': [
        'error',
        {
          handlers: [
            'onClick',
            'onError',
            'onLoad',
            'onMouseDown',
            'onMouseUp',
            'onKeyPress',
            'onKeyDown',
            'onKeyUp',
          ],
          alert: ['onKeyUp', 'onKeyDown', 'onKeyPress'],
          body: ['onError', 'onLoad'],
          dialog: ['onKeyUp', 'onKeyDown', 'onKeyPress'],
          iframe: ['onError', 'onLoad'],
          img: ['onError', 'onLoad'],
        },
      ],
      'sonarjs/S6848': [
        'error',
        {
          allowExpressionValues: true,
          handlers: ['onClick', 'onMouseDown', 'onMouseUp', 'onKeyPress', 'onKeyDown', 'onKeyUp'],
        },
      ],
      'sonarjs/S6852': [
        'error',
        {
          tabbable: ['button', 'checkbox', 'link', 'searchbox', 'spinbutton', 'switch', 'textbox'],
        },
      ],
    });
  });

  it('should override provided nested array options instead of merging them', async () => {
    await Linter.initialize({
      baseDir: normalizeToAbsolutePath(import.meta.dirname),
      rules: [
        {
          key: 'S106',
          configurations: [{ allow: ['log'] }],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
      ],
    });

    expect(
      Linter.getRulesForFile(
        normalizeToAbsolutePath(path.join(import.meta.dirname, 'file.js')),
        'MAIN',
        'DEFAULT',
        'js',
      ),
    ).toEqual({
      'sonarjs/S106': [
        'error',
        {
          allow: ['log'],
        },
      ],
    });
  });

  it('should disable React-dependent rules when react dependency is missing', async () => {
    const baseDir = normalizeToAbsolutePath(
      path.join(import.meta.dirname, 'fixtures', 'dependency-filter', 'no-react'),
    );
    await Linter.initialize({
      baseDir,
      rules: [
        {
          key: 'S6748',
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
    expect(rules).not.toHaveProperty('sonarjs/S6748');
  });

  it('should disable S6759 when react dependency is missing from a TSX project', async () => {
    const baseDir = normalizeToAbsolutePath(
      path.join(import.meta.dirname, 'fixtures', 'dependency-filter', 'no-react'),
    );
    await Linter.initialize({
      baseDir,
      rules: [
        {
          key: 'S6759',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'ts',
          analysisModes: ['DEFAULT'],
        },
      ],
    });
    const rules = Linter.getRulesForFile(
      normalizeToAbsolutePath(path.join(baseDir, 'src', 'file.tsx')),
      'MAIN',
      'DEFAULT',
      'ts',
    );
    expect(rules).not.toHaveProperty('sonarjs/S6759');
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

  it('should enable S6759 when react dependency is present in a TSX project', async () => {
    const baseDir = normalizeToAbsolutePath(
      path.join(import.meta.dirname, 'fixtures', 'dependency-filter', 'react'),
    );
    await Linter.initialize({
      baseDir,
      rules: [
        {
          key: 'S6759',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'ts',
          analysisModes: ['DEFAULT'],
        },
      ],
    });
    const rules = Linter.getRulesForFile(
      normalizeToAbsolutePath(path.join(baseDir, 'src', 'file.tsx')),
      'MAIN',
      'DEFAULT',
      'ts',
    );
    expect(rules).toHaveProperty('sonarjs/S6759');
  });

  it('should enable React-dependent rules when react dependency is present in deno.json', async () => {
    const baseDir = normalizeToAbsolutePath(
      path.join(import.meta.dirname, 'fixtures', 'dependency-filter', 'deno-react'),
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

  it('should not leak inline npm imports between files in the same directory', async () => {
    const baseDir = normalizeToAbsolutePath(
      path.join(import.meta.dirname, 'fixtures', 'dependency-filter', 'inline-react'),
    );
    const withInlineReact = normalizeToAbsolutePath(
      path.join(baseDir, 'src', 'with-inline-react.jsx'),
    );
    const withoutInlineReact = normalizeToAbsolutePath(
      path.join(baseDir, 'src', 'without-inline-react.jsx'),
    );
    const rules: RuleConfig[] = [
      {
        key: 'S6748',
        configurations: [],
        fileTypeTargets: ['MAIN'],
        language: 'js',
        analysisModes: ['DEFAULT'],
      },
    ];

    const getRulesFor = async (filePath: ReturnType<typeof normalizeToAbsolutePath>) => {
      const { sourceCode } = await parseJavaScriptSourceFile(filePath);
      return Linter.getRulesForFile(
        filePath,
        'MAIN',
        'DEFAULT',
        'js',
        undefined,
        undefined,
        sourceCode,
      );
    };

    await Linter.initialize({ baseDir, rules });
    expect(await getRulesFor(withInlineReact)).toHaveProperty('sonarjs/S6748');
    expect(await getRulesFor(withoutInlineReact)).not.toHaveProperty('sonarjs/S6748');

    await Linter.initialize({ baseDir, rules });
    expect(await getRulesFor(withoutInlineReact)).not.toHaveProperty('sonarjs/S6748');
    expect(await getRulesFor(withInlineReact)).toHaveProperty('sonarjs/S6748');
  });

  it('should disable React-dependent rules on .vue files even when react dependency is present', async () => {
    const baseDir = normalizeToAbsolutePath(
      path.join(import.meta.dirname, 'fixtures', 'dependency-filter', 'react'),
    );
    await Linter.initialize({
      baseDir,
      rules: [
        {
          key: 'S100',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
        {
          key: 'S6440',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
        {
          key: 'S6477',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
        {
          key: 'S6749',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
        {
          key: 'S6770',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
        {
          key: 'S6790',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
        {
          key: 'S6747',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
        {
          key: 'S6957',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
      ],
    });

    const rules = Linter.getRulesForFile(
      normalizeToAbsolutePath(path.join(baseDir, 'src', 'file.vue')),
      'MAIN',
      'DEFAULT',
      'js',
    );

    expect(rules).not.toHaveProperty('sonarjs/S6440');
    expect(rules).not.toHaveProperty('sonarjs/S6957');
    expect(rules).not.toHaveProperty('sonarjs/S6790');
    expect(rules).not.toHaveProperty('sonarjs/S6747');
    expect(rules).toHaveProperty('sonarjs/S6477');
    expect(rules).toHaveProperty('sonarjs/S6749');
    expect(rules).toHaveProperty('sonarjs/S6770');
    expect(rules).toHaveProperty('sonarjs/S100');
  });

  it('should merge deno and package.json dependencies for dependency filtering', async () => {
    const baseDir = normalizeToAbsolutePath(
      path.join(import.meta.dirname, 'fixtures', 'dependency-filter', 'deno-priority-no-react'),
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

  it('should not force cognitive complexity metric rule by default', async () => {
    await Linter.initialize({
      baseDir: normalizeToAbsolutePath(import.meta.dirname),
    });
    expect(
      Linter.getRulesForFile(
        normalizeToAbsolutePath(path.join(import.meta.dirname, 'file.js')),
        'MAIN',
        'DEFAULT',
        'js',
      ),
    ).toEqual({});
  });

  it('should keep S3776 options from quality profile', async () => {
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
      Linter.getRulesForFile(
        normalizeToAbsolutePath(path.join(import.meta.dirname, 'file.js')),
        'MAIN',
        'DEFAULT',
        'js',
      ),
    ).toEqual({
      'sonarjs/S3776': ['error', 0],
    });
  });

  it('should disable rules whose requiredEcmaVersion exceeds the detected ES year', async () => {
    // S7755 (prefer-at) requires ES2022 - should be disabled when project is ES2020
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
      normalizeToAbsolutePath(path.join(import.meta.dirname, 'file.js')),
      'MAIN',
      'DEFAULT',
      'js',
      2020,
    );
    expect(rules).not.toHaveProperty('sonarjs/S7755');
  });

  it('should enable rules whose requiredEcmaVersion matches the detected ES year', async () => {
    // S7755 requires ES2022 - should be enabled when project is exactly ES2022
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
      normalizeToAbsolutePath(path.join(import.meta.dirname, 'file.js')),
      'MAIN',
      'DEFAULT',
      'js',
      2022,
    );
    expect(rules).toHaveProperty('sonarjs/S7755');
  });

  it('should enable all rules when detectedEsYear is undefined (esnext fallback)', async () => {
    // No ES year detected -> no restriction, all active rules should be enabled
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
      normalizeToAbsolutePath(path.join(import.meta.dirname, 'file.js')),
      'MAIN',
      'DEFAULT',
      'js',
      undefined,
    );
    expect(rules).toHaveProperty('sonarjs/S7755');
  });

  it('should disable rules whose requiredModuleType excludes detected module type', async () => {
    // S7785 requires ESM modules - should be disabled for explicit CommonJS files
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
      normalizeToAbsolutePath(path.join(import.meta.dirname, 'file.cjs')),
      'MAIN',
      'DEFAULT',
      'js',
      2022,
    );
    expect(rules).not.toHaveProperty('sonarjs/S7785');
  });

  it('should enable rules when requiredModuleType matches detected module type', async () => {
    // S7785 requires ESM modules - should be enabled for explicit ES modules
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
      normalizeToAbsolutePath(path.join(import.meta.dirname, 'file.mjs')),
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
      normalizeToAbsolutePath(path.join(import.meta.dirname, 'file.js')),
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

    Linter.getRulesForFile(
      normalizeToAbsolutePath(path.join(import.meta.dirname, 'file.mjs')),
      'MAIN',
      'DEFAULT',
      'js',
    );
    Linter.getRulesForFile(
      normalizeToAbsolutePath(path.join(import.meta.dirname, 'file.cjs')),
      'MAIN',
      'DEFAULT',
      'js',
    );
    Linter.getRulesForFile(
      normalizeToAbsolutePath(path.join(import.meta.dirname, 'file.js')),
      'MAIN',
      'DEFAULT',
      'js',
    );

    expect(getProjectAnalysisTelemetry()).toMatchObject({
      esmFileCount: 1,
      cjsFileCount: 1,
    });
  });

  it('should keep configured rules unchanged when only profile rules are set', async () => {
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
    });
    expect(
      Linter.getRulesForFile(
        normalizeToAbsolutePath(path.join(import.meta.dirname, 'file.js')),
        'MAIN',
        'DEFAULT',
        'js',
      ),
    ).toEqual({
      'sonarjs/S100': [
        'error',
        {
          format: '^[_a-z][a-zA-Z0-9]*$',
        },
      ],
    });
  });

  it('should materialize upstream default options for wrapped and external rules', async () => {
    await Linter.initialize({
      baseDir: normalizeToAbsolutePath(import.meta.dirname),
      rules: [
        {
          key: 'S106',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
        {
          key: 'S108',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
        {
          key: 'S2430',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
        {
          key: 'S6325',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
        {
          key: 'S6535',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
        {
          key: 'S1186',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'ts',
          analysisModes: ['DEFAULT'],
        },
        {
          key: 'S905',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'ts',
          analysisModes: ['DEFAULT'],
        },
      ],
    });

    const jsRules = Linter.getRulesForFile(
      normalizeToAbsolutePath(path.join(import.meta.dirname, 'file.js')),
      'MAIN',
      'DEFAULT',
      'js',
    );

    expect(jsRules).toEqual(
      expect.objectContaining({
        'sonarjs/S106': [
          'error',
          expect.objectContaining({
            allow: expect.arrayContaining(['assert', 'trace']),
          }),
        ],
        'sonarjs/S108': [
          'error',
          expect.objectContaining({
            allowEmptyCatch: true,
          }),
        ],
        'sonarjs/S2430': [
          'error',
          expect.objectContaining({
            newIsCap: true,
            capIsNew: false,
            properties: false,
            newIsCapExceptions: [],
            capIsNewExceptions: expect.arrayContaining(['Array', 'Boolean', 'BigInt']),
          }),
        ],
        'sonarjs/S6325': [
          'error',
          {
            disallowRedundantWrapping: false,
          },
        ],
        'sonarjs/S6535': [
          'error',
          {
            allowRegexCharacters: [],
          },
        ],
      }),
    );

    const tsRules = Linter.getRulesForFile(
      normalizeToAbsolutePath(path.join(import.meta.dirname, 'file.ts')),
      'MAIN',
      'DEFAULT',
      'ts',
    );

    expect(tsRules).toEqual(
      expect.objectContaining({
        'sonarjs/S1186': [
          'error',
          expect.objectContaining({
            allow: expect.arrayContaining(['arrowFunctions', 'private-constructors']),
          }),
        ],
        'sonarjs/S905': [
          'error',
          expect.objectContaining({
            allowShortCircuit: true,
            allowTernary: true,
            allowTaggedTemplates: true,
            enforceForJSX: true,
          }),
        ],
      }),
    );
  });

  it('should lint wrapped and external rules that depend on upstream default options', async () => {
    const cases: { rule: RuleConfig; filePath: NormalizedAbsolutePath }[] = [
      {
        rule: {
          key: 'S2430',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
        filePath: normalizeToAbsolutePath(
          path.join(import.meta.dirname, 'fixtures', 'wrapper', 'new-cap.js'),
        ),
      },
      {
        rule: {
          key: 'S6325',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
        filePath: normalizeToAbsolutePath(
          path.join(
            import.meta.dirname,
            'fixtures',
            'wrapper',
            'quickfixes',
            'prefer-regex-literals.js',
          ),
        ),
      },
      {
        rule: {
          key: 'S6535',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
        filePath: normalizeToAbsolutePath(
          path.join(
            import.meta.dirname,
            'fixtures',
            'wrapper',
            'quickfixes',
            'unnecessary-character-escapes.js',
          ),
        ),
      },
    ];

    for (const { rule, filePath } of cases) {
      const parseResult = await parseJavaScriptSourceFile(filePath);
      await Linter.initialize({
        baseDir: normalizeToAbsolutePath(path.dirname(filePath)),
        rules: [rule],
      });

      const { issues } = Linter.lint(parseResult, filePath);

      expect(issues).toEqual([expect.objectContaining({ ruleId: rule.key })]);
    }
  });

  it('should preserve default options for comment-based eslint configurations', async () => {
    const cases: {
      parser: 'js' | 'ts';
      rule: RuleConfig;
      filePath: NormalizedAbsolutePath;
    }[] = [
      {
        parser: 'js',
        rule: {
          key: 'S106',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
        filePath: normalizeToAbsolutePath(
          path.join(import.meta.dirname, 'fixtures', 'wrapper', 'inline-config-no-console.js'),
        ),
      },
      {
        parser: 'js',
        rule: {
          key: 'S108',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
        filePath: normalizeToAbsolutePath(
          path.join(import.meta.dirname, 'fixtures', 'wrapper', 'inline-config-no-empty.js'),
        ),
      },
      {
        parser: 'js',
        rule: {
          key: 'S2430',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
        filePath: normalizeToAbsolutePath(
          path.join(import.meta.dirname, 'fixtures', 'wrapper', 'inline-config-new-cap.js'),
        ),
      },
      {
        parser: 'ts',
        rule: {
          key: 'S1186',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'ts',
          analysisModes: ['DEFAULT'],
        },
        filePath: normalizeToAbsolutePath(
          path.join(
            import.meta.dirname,
            'fixtures',
            'wrapper',
            'inline-config-no-empty-function.ts',
          ),
        ),
      },
      {
        parser: 'ts',
        rule: {
          key: 'S905',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'ts',
          analysisModes: ['DEFAULT'],
        },
        filePath: normalizeToAbsolutePath(
          path.join(
            import.meta.dirname,
            'fixtures',
            'wrapper',
            'inline-config-no-unused-expressions.ts',
          ),
        ),
      },
    ];

    for (const { parser, rule, filePath } of cases) {
      const parseResult =
        parser === 'js'
          ? await parseJavaScriptSourceFile(filePath)
          : await parseTypeScriptSourceFile(filePath, []);
      await Linter.initialize({
        baseDir: normalizeToAbsolutePath(path.dirname(filePath)),
        rules: [rule],
      });

      const { issues } = Linter.lint(parseResult, filePath);

      expect(issues).toEqual([expect.objectContaining({ ruleId: rule.key })]);
    }
  });

  it('should preserve Sonar defaults for severity-only inline configs on wrapped rules', async () => {
    const filePath = normalizeToAbsolutePath(
      path.join(import.meta.dirname, 'fixtures', 'wrapper', 'inline-config-no-console-info.js'),
    );
    const parseResult = await parseJavaScriptSourceFile(filePath);

    await Linter.initialize({
      baseDir: normalizeToAbsolutePath(path.dirname(filePath)),
      rules: [
        {
          key: 'S106',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
      ],
    });

    const { issues } = Linter.lint(parseResult, filePath);

    expect(issues).toHaveLength(0);
  });

  it('should replace array-valued inline overrides instead of merging them', async () => {
    const filePath = normalizeToAbsolutePath(
      path.join(
        import.meta.dirname,
        'fixtures',
        'wrapper',
        'inline-config-no-hardcoded-passwords.js',
      ),
    );
    const parseResult = await parseJavaScriptSourceFile(filePath);

    await Linter.initialize({
      baseDir: normalizeToAbsolutePath(path.dirname(filePath)),
      rules: [
        {
          key: 'S2068',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
      ],
    });

    const { issues } = Linter.lint(parseResult, filePath);

    expect(issues).toHaveLength(0);
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
    const { issues, suppressedIssues } = Linter.lint(parseResult, filePath);

    expect(issues).toHaveLength(0);
    expect(suppressedIssues).toEqual([
      expect.objectContaining({
        ruleId: 'S3504',
        line: 2,
        column: 0,
        endLine: 2,
        endColumn: 7,
        resolutionComment: "Here's a description",
      }),
      expect.objectContaining({
        ruleId: 'S3504',
        line: 5,
        column: 0,
        endLine: 5,
        endColumn: 7,
        resolutionComment: DEFAULT_SUPPRESSED_ISSUE_RESOLUTION_COMMENT,
      }),
    ]);
  });

  it('should use the fallback resolution comment when ESLint justification is missing', async () => {
    const filePath = normalizeToAbsolutePath(
      path.join(import.meta.dirname, 'fixtures', 'wrapper', 'eslint-directive-no-justification.js'),
    );
    const parseResult = build(
      await jsTsInput({
        filePath,
        fileContent: '/* eslint-disable-next-line no-var */\nvar value = 42;\n',
      }),
    );
    const rules: RuleConfig[] = [
      {
        key: 'S3504',
        configurations: [],
        fileTypeTargets: ['MAIN'],
        language: 'js',
        analysisModes: ['DEFAULT'],
      },
    ];

    await Linter.initialize({ baseDir: normalizeToAbsolutePath(path.dirname(filePath)), rules });
    const { issues, suppressedIssues } = Linter.lint(parseResult, filePath);

    expect(issues).toHaveLength(0);
    expect(suppressedIssues).toEqual([
      expect.objectContaining({
        ruleId: 'S3504',
        line: 2,
        column: 0,
        endLine: 2,
        endColumn: 9,
        resolutionComment: DEFAULT_SUPPRESSED_ISSUE_RESOLUTION_COMMENT,
      }),
    ]);
  });

  it('should use the first suppression when ESLint reports multiple suppressions', async () => {
    const filePath = normalizeToAbsolutePath(
      path.join(import.meta.dirname, 'fixtures', 'wrapper', 'eslint-directive-multiple.js'),
    );
    const parseResult = build(
      await jsTsInput({
        filePath,
        fileContent: [
          '/* eslint-disable no-var -- first reason */',
          '/* eslint-disable-next-line no-var -- second reason */',
          'var value = 42;',
        ].join('\n'),
      }),
    );
    const rules: RuleConfig[] = [
      {
        key: 'S3504',
        configurations: [],
        fileTypeTargets: ['MAIN'],
        language: 'js',
        analysisModes: ['DEFAULT'],
      },
    ];

    await Linter.initialize({ baseDir: normalizeToAbsolutePath(path.dirname(filePath)), rules });
    const { issues, suppressedIssues } = Linter.lint(parseResult, filePath);

    expect(issues).toHaveLength(0);
    expect(suppressedIssues).toEqual([
      expect.objectContaining({
        ruleId: 'S3504',
        resolutionComment: 'first reason',
      }),
    ]);
  });

  it('should support Sonar rule ids in directives for wrapped rules', async () => {
    const filePath = normalizeToAbsolutePath(
      path.join(import.meta.dirname, 'fixtures', 'wrapper', 'eslint-directive-sonar-key.js'),
    );
    const parseResult = build(
      await jsTsInput({
        filePath,
        fileContent: '/* eslint-disable-next-line sonarjs/S3504 -- accepted */\nvar value = 42;\n',
      }),
    );
    const rules: RuleConfig[] = [
      {
        key: 'S3504',
        configurations: [],
        fileTypeTargets: ['MAIN'],
        language: 'js',
        analysisModes: ['DEFAULT'],
      },
    ];

    await Linter.initialize({ baseDir: normalizeToAbsolutePath(path.dirname(filePath)), rules });
    const { issues, suppressedIssues } = Linter.lint(parseResult, filePath);

    expect(issues).toHaveLength(0);
    expect(suppressedIssues).toEqual([
      expect.objectContaining({
        ruleId: 'S3504',
        line: 2,
        column: 0,
        endLine: 2,
        endColumn: 9,
        resolutionComment: 'accepted',
      }),
    ]);
  });

  it('should let external inline configs override Sonar defaults for wrapped rules', async () => {
    const filePath = normalizeToAbsolutePath(
      path.join(import.meta.dirname, 'fixtures', 'wrapper', 'inline-eslint-prefer-const.js'),
    );
    const parseResult = await parseJavaScriptSourceFile(filePath);

    await Linter.initialize({
      baseDir: normalizeToAbsolutePath(path.dirname(filePath)),
      rules: [
        {
          key: 'S3353',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
      ],
    });
    const { issues } = Linter.lint(parseResult, filePath);

    expect(issues).toEqual([expect.objectContaining({ ruleId: 'S3353', line: 3 })]);
  });

  it('should keep external rule defaults when remapping inline configs', async () => {
    const filePath = normalizeToAbsolutePath(
      path.join(import.meta.dirname, 'fixtures', 'wrapper', 'inline-eslint-no-sequences.ts'),
    );
    const parseResult = await parseTypeScriptSourceFile(filePath, []);

    await Linter.initialize({
      baseDir: normalizeToAbsolutePath(path.dirname(filePath)),
      rules: [
        {
          key: 'S878',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'ts',
          analysisModes: ['DEFAULT'],
        },
      ],
    });
    const { issues } = Linter.lint(parseResult, filePath, 'MAIN', 'CHANGED', 'DEFAULT', 'ts');

    expect(issues).toEqual([expect.objectContaining({ ruleId: 'S878', line: 7 })]);
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

  it('should report on top-level script declarations for S3798 when no module type is detected', async () => {
    const filePath = normalizeToAbsolutePath(
      path.join(import.meta.dirname, 'fixtures', 'wrapper', 'script.js'),
    );
    const parseResult = await parseJavaScriptSourceFile(filePath);

    await Linter.initialize({
      baseDir: normalizeToAbsolutePath(path.dirname(filePath)),
      rules: [
        {
          key: 'S3798',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
      ],
    });

    const { issues } = Linter.lint(parseResult, filePath);

    expect(issues).toEqual([expect.objectContaining({ ruleId: 'S3798', line: 1 })]);
  });

  it('should not report on CommonJS files for S3798', async () => {
    const filePath = normalizeToAbsolutePath(
      path.join(import.meta.dirname, 'fixtures', 'wrapper', 'commonjs.cjs'),
    );
    const parseResult = await parseJavaScriptSourceFile(filePath);

    await Linter.initialize({
      baseDir: normalizeToAbsolutePath(path.dirname(filePath)),
      rules: [
        {
          key: 'S3798',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
      ],
    });

    const { issues } = Linter.lint(parseResult, filePath);

    expect(issues).toHaveLength(0);
  });

  it('should not report on ES module files for S3798', async () => {
    const filePath = normalizeToAbsolutePath(
      path.join(import.meta.dirname, 'fixtures', 'wrapper', 'module.mjs'),
    );
    const parseResult = await parseJavaScriptSourceFile(filePath);

    await Linter.initialize({
      baseDir: normalizeToAbsolutePath(path.dirname(filePath)),
      rules: [
        {
          key: 'S3798',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
      ],
    });

    const { issues } = Linter.lint(parseResult, filePath);

    expect(issues).toHaveLength(0);
  });

  it('should apply additional rules during linting', async () => {
    const filePath = normalizeToAbsolutePath(
      path.join(import.meta.dirname, 'fixtures', 'wrapper', 'cognitive-function.js'),
    );
    const parseResult = await parseJavaScriptSourceFile(filePath);

    await Linter.initialize({
      baseDir: normalizeToAbsolutePath(path.dirname(filePath)),
      rules: [],
    });
    const { issues } = Linter.lint(
      parseResult,
      filePath,
      'MAIN',
      'CHANGED',
      'DEFAULT',
      'js',
      2022,
      undefined,
      {
        additionalRules: {
          'sonarjs/S3776': ['error', 0],
        },
      },
    );

    expect(issues).toEqual([expect.objectContaining({ ruleId: 'S3776' })]);
  });

  it('should prefer configured rules over additional rules', async () => {
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
    const { issues } = Linter.lint(
      parseResult,
      filePath,
      'MAIN',
      'CHANGED',
      'DEFAULT',
      'js',
      2022,
      undefined,
      {
        additionalRules: {
          'sonarjs/S3776': ['error', 'silence-issues'],
        },
      },
    );

    expect(issues).toEqual([expect.objectContaining({ ruleId: 'S3776' })]);
  });

  it('should pass additional settings to rules during linting', async () => {
    const filePath = normalizeToAbsolutePath(
      path.join(import.meta.dirname, 'fixtures', 'wrapper', 'cognitive-function.js'),
    );
    const parseResult = await parseJavaScriptSourceFile(filePath);

    await Linter.initialize({
      baseDir: normalizeToAbsolutePath(path.dirname(filePath)),
      rules: [],
    });
    const sink = {};
    const { issues } = Linter.lint(
      parseResult,
      filePath,
      'MAIN',
      'CHANGED',
      'DEFAULT',
      'js',
      2022,
      undefined,
      {
        additionalRules: {
          'sonarjs/S3776': ['error', 'silence-issues'],
        },
        additionalSettings: toInternalMetricsSettings(sink),
      },
    );

    expect(sink).toEqual({ cognitiveComplexity: 1 });
    expect(issues).toEqual([]);
  });
});
