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
import { join } from 'node:path';
import { embeddedInput } from '../../../jsts/tests/tools/helpers/input.js';
import { describe, it } from 'node:test';
import { expect } from 'expect';
import { Linter } from '../../../jsts/src/linter/linter.js';
import { analyzeEmbedded } from '../../../jsts/src/embedded/analysis/analyzer.js';
import { parseHTML } from '../../src/parser/parse.js';
import { normalizeToAbsolutePath } from '../../../shared/src/helpers/files.js';
import type { ShouldIgnoreFileParams } from '../../../shared/src/helpers/filter/filter.js';
import { DEFAULT_FILE_SUFFIXES } from '../../../shared/src/helpers/configuration.js';

const defaultShouldIgnoreParams: ShouldIgnoreFileParams = {
  jsTsExclusions: [],
  detectBundles: false,
  maxFileSize: 1000,
  ...DEFAULT_FILE_SUFFIXES,
};

describe('analyzeHTML', () => {
  const fixturesPath = normalizeToAbsolutePath(join(import.meta.dirname, 'fixtures'));

  it('should analyze HTML file', async () => {
    await Linter.initialize({
      baseDir: fixturesPath,
      rules: [
        {
          key: 'S3923',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
      ],
    });
    const {
      issues: [issue],
    } = await analyzeEmbedded(
      await embeddedInput({ filePath: normalizeToAbsolutePath(join(fixturesPath, 'file.html')) }),
      parseHTML,
      defaultShouldIgnoreParams,
    );
    expect(issue).toEqual(
      expect.objectContaining({
        ruleId: 'S3923',
        line: 10,
        column: 2,
        endLine: 10,
        endColumn: 31,
      }),
    );
  });

  it('should not break when using a rule with a quickfix', async () => {
    await Linter.initialize({
      baseDir: fixturesPath,
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
    const result = await analyzeEmbedded(
      await embeddedInput({
        filePath: normalizeToAbsolutePath(join(fixturesPath, 'quickfix.html')),
      }),
      parseHTML,
      defaultShouldIgnoreParams,
    );

    const {
      issues: [{ quickFixes }],
    } = result;
    const [quickFix] = quickFixes!;
    expect(quickFix.edits).toEqual([
      {
        text: ';',
        loc: {
          line: 10,
          column: 42,
          endLine: 10,
          endColumn: 44,
        },
      },
    ]);
  });

  it('should not break when using "S3723" rule', async () => {
    await Linter.initialize({
      baseDir: fixturesPath,
      rules: [
        {
          key: 'S3723',
          configurations: ['always-multiline'],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
      ],
    });
    const { issues } = await analyzeEmbedded(
      await embeddedInput({
        filePath: normalizeToAbsolutePath(join(fixturesPath, 'enforce-trailing-comma.html')),
      }),
      parseHTML,
      defaultShouldIgnoreParams,
    );
    expect(issues).toHaveLength(2);
    expect(issues[0]).toEqual(
      expect.objectContaining({
        line: 13,
        column: 16,
        endLine: 14,
        endColumn: 0,
      }),
    );
    expect(issues[1]).toEqual(
      expect.objectContaining({
        line: 14,
        column: 7,
        endLine: 15,
        endColumn: 0,
      }),
    );
  });

  it('should not break when using a rule with secondary locations', async () => {
    await Linter.initialize({
      baseDir: fixturesPath,
      rules: [
        {
          key: 'S2251',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
      ],
    });
    const result = await analyzeEmbedded(
      await embeddedInput({
        filePath: normalizeToAbsolutePath(join(fixturesPath, 'secondary.html')),
      }),
      parseHTML,
      defaultShouldIgnoreParams,
    );
    const {
      issues: [
        {
          secondaryLocations: [secondaryLocation],
        },
      ],
    } = result;
    expect(secondaryLocation).toEqual({
      line: 10,
      column: 18,
      endLine: 10,
      endColumn: 36,
    });
  });

  it('should not break when using a regex rule', async () => {
    await Linter.initialize({
      baseDir: fixturesPath,
      rules: [
        {
          key: 'S6326',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
      ],
    });
    const result = await analyzeEmbedded(
      await embeddedInput({ filePath: normalizeToAbsolutePath(join(fixturesPath, 'regex.html')) }),
      parseHTML,
      defaultShouldIgnoreParams,
    );
    const {
      issues: [issue],
    } = result;
    expect(issue).toEqual(
      expect.objectContaining({
        line: 10,
        column: 25,
        endLine: 10,
        endColumn: 28,
      }),
    );
  });
});
