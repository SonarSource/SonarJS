/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { join } from 'path';
import { embeddedInput } from '../../../jsts/tests/tools/index.js';
import { describe, before, it } from 'node:test';
import { expect } from 'expect';
import { setContext } from '../../../shared/src/helpers/context.js';
import { initializeLinter } from '../../../jsts/src/linter/linters.js';
import { analyzeEmbedded } from '../../../jsts/src/embedded/analysis/analyzer.js';
import { parseHTML } from '../../src/parser/parse.js';

describe('analyzeHTML', () => {
  const fixturesPath = join(import.meta.dirname, 'fixtures');

  before(() => {
    setContext({
      workDir: '/tmp/workdir',
      shouldUseTypeScriptParserForJS: true,
      sonarlint: false,
      bundles: [],
    });
  });

  it('should analyze HTML file', async () => {
    await initializeLinter([{ key: 'S3923', configurations: [], fileTypeTarget: ['MAIN'] }]);
    const {
      issues: [issue],
    } = analyzeEmbedded(
      await embeddedInput({ filePath: join(fixturesPath, 'file.html') }),
      parseHTML,
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
    await initializeLinter([{ key: 'S1116', configurations: [], fileTypeTarget: ['MAIN'] }]);
    const result = analyzeEmbedded(
      await embeddedInput({ filePath: join(fixturesPath, 'quickfix.html') }),
      parseHTML,
    );

    const {
      issues: [
        {
          quickFixes: [quickFix],
        },
      ],
    } = result;
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
    await initializeLinter([
      {
        key: 'S3723',
        configurations: ['always-multiline'],
        fileTypeTarget: ['MAIN'],
      },
    ]);
    const { issues } = analyzeEmbedded(
      await embeddedInput({ filePath: join(fixturesPath, 'enforce-trailing-comma.html') }),
      parseHTML,
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
    await initializeLinter([{ key: 'S2251', configurations: [], fileTypeTarget: ['MAIN'] }]);
    const result = analyzeEmbedded(
      await embeddedInput({ filePath: join(fixturesPath, 'secondary.html') }),
      parseHTML,
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
    await initializeLinter([{ key: 'S6326', configurations: [], fileTypeTarget: ['MAIN'] }]);
    const result = analyzeEmbedded(
      await embeddedInput({ filePath: join(fixturesPath, 'regex.html') }),
      parseHTML,
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
