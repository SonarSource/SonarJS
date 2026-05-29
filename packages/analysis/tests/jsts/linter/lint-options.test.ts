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
import { describe, it } from 'node:test';
import { expect } from 'expect';
import { Linter } from '../../../src/jsts/linter/linter.js';
import { RuleConfig } from '../../../src/jsts/linter/config/rule-config.js';
import { JsTsLanguage } from '../../../src/common/configuration.js';
import { AnalysisMode } from '../../../src/jsts/analysis/analysis.js';
import { normalizeToAbsolutePath } from '../../../../shared/src/helpers/files.js';
import { toInternalMetricsSettings } from '../../../src/jsts/rules/helpers/internal-metrics.js';

describe('Linter lint options', () => {
  const ecma2022 = 2022;

  it('should take into account comment-based eslint configurations', async () => {
    const filePath = normalizeToAbsolutePath(
      path.join(import.meta.dirname, 'fixtures', 'wrapper', 'eslint-config.js'),
    );
    const parseResult = await parseJavaScriptSourceFile(filePath);

    await Linter.initialize({
      baseDir: normalizeToAbsolutePath(path.dirname(filePath)),
      rules: [],
    });
    const issues = Linter.lint(parseResult, filePath);

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
    const issues = Linter.lint(parseResult, filePath);
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
      globals,
    });
    const issues = Linter.lint(parseResult, filePath);

    expect(Linter.globals.has('angular')).toEqual(true);
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
    const issues = Linter.lint(parseResult, filePath, {
      fileType: 'MAIN',
      fileStatus: 'CHANGED',
      analysisMode: 'DEFAULT',
      language: 'js',
      detectedEsYear: ecma2022,
      lintOptions: {
        additionalRules: {
          'sonarjs/S3776': ['error', 0],
        },
      },
    });

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
    const issues = Linter.lint(parseResult, filePath, {
      fileType: 'MAIN',
      fileStatus: 'CHANGED',
      analysisMode: 'DEFAULT',
      language: 'js',
      detectedEsYear: ecma2022,
      lintOptions: {
        additionalRules: {
          'sonarjs/S3776': ['error', 'silence-issues'],
        },
      },
    });

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
    const issues = Linter.lint(parseResult, filePath, {
      fileType: 'MAIN',
      fileStatus: 'CHANGED',
      analysisMode: 'DEFAULT',
      language: 'js',
      detectedEsYear: ecma2022,
      lintOptions: {
        additionalRules: {
          'sonarjs/S3776': ['error', 'silence-issues'],
        },
        additionalSettings: toInternalMetricsSettings(sink),
      },
    });

    expect(sink).toEqual({ cognitiveComplexity: 1 });
    expect(issues).toEqual([]);
  });
});
