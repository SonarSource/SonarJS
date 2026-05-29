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
import { normalizeToAbsolutePath } from '../../../../shared/src/helpers/files.js';

describe('Linter issue reporting', () => {
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
    const issues = Linter.lint(parseResult, filePath, {
      fileType: 'MAIN',
      fileStatus: 'SAME',
    });

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
    const issues = Linter.lint(parseResult, filePath, {
      fileType: 'MAIN',
      fileStatus: 'SAME',
      analysisMode: 'SKIP_UNCHANGED',
    });

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
    const issues = Linter.lint(parseResult, filePath);

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
    const issues = Linter.lint(parseResult, filePath, { fileType: 'TEST' });

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
    const issues = Linter.lint(parseResult, filePath);

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
    const issues = Linter.lint(parseResult, filePath);

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
    const issues = Linter.lint(parseResult, filePath);

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
    const issues = Linter.lint(parseResult, filePath);

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
    const issues = Linter.lint(parseResult, filePath);

    expect(issues).toHaveLength(0);
  });

  it('should preserve Sonar defaults for external severity-only inline configs', async () => {
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
    const issues = Linter.lint(parseResult, filePath);

    expect(issues).toHaveLength(0);
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
    const issues = Linter.lint(parseResult, filePath, {
      fileType: 'MAIN',
      fileStatus: 'CHANGED',
      analysisMode: 'DEFAULT',
      language: 'ts',
    });

    expect(issues).toEqual([expect.objectContaining({ ruleId: 'S878', line: 7 })]);
  });
});
