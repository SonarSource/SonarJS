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
import { join } from 'node:path';
import { embeddedInput } from '../../jsts/tools/helpers/input.js';
import { describe, it } from 'node:test';
import { expect } from 'expect';
import { Linter } from '../../../src/jsts/linter/linter.js';
import { analyzeEmbedded } from '../../../src/jsts/embedded/analysis/analyzer.js';
import type { JsTsIssue } from '../../../src/jsts/linter/issues/issue.js';
import { parseHTML } from '../../../src/html/parser/parse.js';
import { normalizeToAbsolutePath } from '../../../../shared/src/helpers/files.js';

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

  it('should return suppressed issues for embedded HTML scripts separately', async () => {
    await Linter.initialize({
      baseDir: fixturesPath,
      rules: [
        {
          key: 'S3504',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
      ],
    });

    const result = await analyzeEmbedded(
      await embeddedInput({
        filePath: normalizeToAbsolutePath(join(fixturesPath, 'suppressed.html')),
        fileContent: [
          '<html>',
          '<script>',
          '/* eslint-disable-next-line no-var -- accepted */',
          'var value = 42;',
          '</script>',
          '</html>',
        ].join('\n'),
      }),
      parseHTML,
    );

    expect(result.issues).toEqual([]);
    expect(result.suppressedIssues).toEqual([
      expect.objectContaining({
        ruleId: 'S3504',
        line: 4,
        column: 0,
        endLine: 4,
        endColumn: 9,
        resolutionComment: 'accepted',
      }),
    ]);
  });

  it('should preserve host line numbers for sonar-resolve directives in embedded JS', async () => {
    await Linter.initialize({ baseDir: fixturesPath, rules: [] });

    const result = await analyzeEmbedded(
      await embeddedInput({
        filePath: normalizeToAbsolutePath(join(fixturesPath, 'sonar-resolve.html')),
        fileContent: [
          '<html>',
          '<script>',
          '// sonar-resolve javascript:S1116 "reason"',
          'const x = 1;',
          '</script>',
          '</html>',
        ].join('\n'),
      }),
      parseHTML,
    );

    expect(result.sonarResolveComments).toEqual([
      {
        line: 3,
        text: ' sonar-resolve javascript:S1116 "reason"',
      },
    ]);
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
    );

    const { quickFixes } = result.issues[0] as JsTsIssue;
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
    );
    const { secondaryLocations } = result.issues[0] as JsTsIssue;
    const [secondaryLocation] = secondaryLocations;
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

  it('should skip minified script tags but analyze normal scripts', async () => {
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
        {
          key: 'S7739',
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
      ],
    });
    const { issues } = await analyzeEmbedded(
      await embeddedInput({ filePath: join(fixturesPath, 'minified-bundle.html') }),
      parseHTML,
    );
    // The minified script (avg line length > 200, with S7739 violation for 'then') should be skipped
    // The normal script (with S3923 violation) should still be analyzed
    expect(issues).toHaveLength(1);
    expect(issues[0]).toEqual(
      expect.objectContaining({
        ruleId: 'S3923',
        line: 12,
      }),
    );
  });

  describe('shared global scope across the script blocks of one HTML page (JS-2371)', () => {
    const implicitGlobalMessage =
      'Add the "let", "const" or "var" keyword to this declaration of "TOKEN" to make it explicit.';
    const undeclaredTokenMessage =
      '"TOKEN" does not exist. Change its name or declare it so that its usage doesn\'t result in a "ReferenceError".';

    async function analyzeFixtureWithRule(ruleKey: string, fixture: string) {
      await Linter.initialize({
        baseDir: fixturesPath,
        rules: [
          {
            key: ruleKey,
            configurations: [],
            fileTypeTargets: ['MAIN'],
            language: 'js',
            analysisModes: ['DEFAULT'],
          },
        ],
      });
      const { issues } = await analyzeEmbedded(
        await embeddedInput({
          filePath: normalizeToAbsolutePath(join(fixturesPath, fixture)),
        }),
        parseHTML,
      );
      return issues;
    }

    describe('S2703', () => {
      it('should not flag a write to a "let" declared in an earlier classic script block', async () => {
        expect(await analyzeFixtureWithRule('S2703', 'shared-global-scope.html')).toEqual([]);
      });

      it('should not flag a write to a "var" declared in an earlier classic script block', async () => {
        expect(await analyzeFixtureWithRule('S2703', 'shared-global-scope-var.html')).toEqual([]);
      });

      it('should not flag a write to a "var" hoisted out of a nested block in an earlier classic script block', async () => {
        expect(
          await analyzeFixtureWithRule('S2703', 'shared-global-scope-var-nested-block.html'),
        ).toEqual([]);
      });

      it('should not flag a write to a "function" hoisted out of a nested block in an earlier classic script block', async () => {
        expect(
          await analyzeFixtureWithRule('S2703', 'shared-global-scope-nested-function.html'),
        ).toEqual([]);
      });

      it('should not flag a write relying on a "let" declared in a "defer" script block, since "defer" has no effect on inline scripts', async () => {
        expect(await analyzeFixtureWithRule('S2703', 'shared-global-scope-defer.html')).toEqual([]);
      });

      it('should not flag a write from a "type=module" script block to a "let" declared in an earlier classic script block', async () => {
        expect(
          await analyzeFixtureWithRule('S2703', 'module-script-shares-classic-globals.html'),
        ).toEqual([]);
      });

      it('should not flag a write from a "type=module" script block to a "let" declared in a later classic script block, since modules are deferred', async () => {
        expect(
          await analyzeFixtureWithRule('S2703', 'module-script-shares-later-classic-globals.html'),
        ).toEqual([]);
      });

      it('should still flag a write relying on a "let" declared in a "type=module" script block', async () => {
        expect(await analyzeFixtureWithRule('S2703', 'module-script-not-shared.html')).toEqual([
          expect.objectContaining({ ruleId: 'S2703', message: implicitGlobalMessage }),
        ]);
      });

      it('should still flag a write relying on a "var" declared in a class static block, which is its own "var" scope', async () => {
        expect(await analyzeFixtureWithRule('S2703', 'static-block-var-not-shared.html')).toEqual([
          expect.objectContaining({ ruleId: 'S2703', message: implicitGlobalMessage }),
        ]);
      });

      it('should still flag a write to a "let" declared only in a later classic script block', async () => {
        expect(
          await analyzeFixtureWithRule('S2703', 'shared-global-scope-wrong-order.html'),
        ).toEqual([expect.objectContaining({ ruleId: 'S2703', message: implicitGlobalMessage })]);
      });
    });

    describe('S3827', () => {
      it('should not report a read of a name declared in an earlier classic script block', async () => {
        expect(await analyzeFixtureWithRule('S3827', 'shared-global-scope-read.html')).toEqual([]);
      });

      it('should still report a read of a name declared only in a later classic script block', async () => {
        expect(
          await analyzeFixtureWithRule('S3827', 'shared-global-scope-read-wrong-order.html'),
        ).toEqual([expect.objectContaining({ ruleId: 'S3827', message: undeclaredTokenMessage })]);
      });
    });
  });
});
