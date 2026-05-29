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
import { describe, it } from 'node:test';
import { expect } from 'expect';
import { Linter } from '../../../src/jsts/linter/linter.js';
import { RuleConfig } from '../../../src/jsts/linter/config/rule-config.js';
import {
  normalizeToAbsolutePath,
  type NormalizedAbsolutePath,
} from '../../../../shared/src/helpers/files.js';

describe('Linter wrapper defaults', () => {
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

      const issues = Linter.lint(parseResult, filePath);

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

      const issues = Linter.lint(parseResult, filePath);

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

    const issues = Linter.lint(parseResult, filePath);

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

    const issues = Linter.lint(parseResult, filePath);

    expect(issues).toHaveLength(0);
  });
});
