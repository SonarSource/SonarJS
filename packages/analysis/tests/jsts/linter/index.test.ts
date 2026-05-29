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
import { parseJavaScriptSourceFile } from '../tools/helpers/parsing.js';
import { describe, it, type Mock } from 'node:test';
import { expect } from 'expect';
import { Linter } from '../../../src/jsts/linter/linter.js';
import { RuleConfig } from '../../../src/jsts/linter/config/rule-config.js';
import { normalizeToAbsolutePath } from '../../../../shared/src/helpers/files.js';

describe('Linter initialization and rule configuration', () => {
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

    const [issue] = Linter.lint(await parseJavaScriptSourceFile(filePath), filePath);
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

    const [issue] = Linter.lint(
      await parseJavaScriptSourceFile(filePath, [], 'MAIN', false, false),
      filePath,
    );
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
});
