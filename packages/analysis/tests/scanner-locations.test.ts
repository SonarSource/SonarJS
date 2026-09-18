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
import assert from 'node:assert';
import type { TSESTree } from '@typescript-eslint/utils';
import { describe, it } from 'node:test';
import { expect } from 'expect';
import {
  alignFileResultWithScanner,
  finalizeFileResultForScanner,
} from '../src/scanner-locations.js';
import type { FileResult } from '../src/projectAnalysis.js';
import { ErrorCode } from '../src/contracts/error.js';
import { normalizeToAbsolutePath } from '../../shared/src/helpers/files.js';
import type { UnserializedJsTsAnalysisOutput } from '../src/jsts/analysis/analyzer.js';
import { parse } from '../src/jsts/parsers/parse.js';
import { parsersMap } from '../src/jsts/parsers/eslint.js';
import { buildTsParserOptions } from '../src/jsts/parsers/options.js';
import { deserializeProtobuf } from '../src/jsts/parsers/ast.js';

describe('alignFileResultWithScanner', () => {
  it('maps every JavaScript output location without changing quick-fix text', () => {
    const filePath = normalizeToAbsolutePath('/project/file.js');
    const quickFixText = `"b\u2028c"`;
    const result = {
      issues: [
        {
          ruleId: 'S1',
          language: 'js',
          line: 2,
          column: 0,
          endLine: 3,
          endColumn: 1,
          message: 'issue',
          secondaryLocations: [
            { line: 2, column: 1, endLine: 3, endColumn: 0, message: 'secondary' },
          ],
          quickFixes: [
            {
              message: 'fix',
              edits: [
                {
                  loc: { line: 2, column: 0, endLine: 3, endColumn: 1 },
                  text: quickFixText,
                },
              ],
            },
          ],
          ruleESLintKeys: [],
          filePath,
        },
        {
          ruleId: 'css-rule',
          language: 'css',
          line: 2,
          column: 0,
          endLine: 2,
          endColumn: 1,
          message: 'CSS coordinates are already scanner-compatible',
        },
      ],
      suppressedIssues: [
        {
          ruleId: 'S2',
          language: 'js',
          line: 3,
          column: 0,
          endLine: 3,
          endColumn: 1,
          message: 'suppressed',
          secondaryLocations: [],
          ruleESLintKeys: [],
          filePath,
          resolutionComment: 'accepted',
        },
      ],
      parsingErrors: [
        {
          message: 'JS parse error',
          code: ErrorCode.Parsing,
          line: 3,
          column: 0,
          language: 'js',
        },
        {
          message: 'CSS parse error',
          code: ErrorCode.Parsing,
          line: 2,
          column: 0,
          language: 'css',
        },
      ],
      highlights: [
        {
          textType: 'STRING',
          location: { startLine: 2, startCol: 0, endLine: 3, endCol: 1 },
        },
      ],
      highlightedSymbols: [
        {
          declaration: { startLine: 2, startCol: 0, endLine: 2, endCol: 1 },
          references: [{ startLine: 3, startCol: 0, endLine: 3, endCol: 1 }],
        },
      ],
      cpdTokens: [
        {
          image: 'identifier',
          location: { startLine: 3, startCol: 0, endLine: 4, endCol: 0 },
        },
      ],
      metrics: {
        ncloc: [1, 2, 3, 4, 5],
        commentLines: [2, 3],
        nosonarLines: [3],
        executableLines: [2, 4],
      },
      sonarResolveComments: [{ line: 3, text: 'SONAR-RESOLVE' }],
    } as FileResult;

    alignFileResultWithScanner(result, `a\u2028bc\u2029d\r\nef\n`);

    expect(result).toMatchObject({
      issues: [
        {
          line: 1,
          column: 2,
          endLine: 1,
          endColumn: 6,
          secondaryLocations: [{ line: 1, column: 3, endLine: 1, endColumn: 5 }],
          quickFixes: [
            {
              edits: [
                {
                  loc: { line: 1, column: 2, endLine: 1, endColumn: 6 },
                  text: quickFixText,
                },
              ],
            },
          ],
        },
        { language: 'css', line: 2, column: 0, endLine: 2, endColumn: 1 },
      ],
      suppressedIssues: [{ line: 1, column: 5, endLine: 1, endColumn: 6 }],
      parsingErrors: [
        { language: 'js', line: 1, column: 5 },
        { language: 'css', line: 2, column: 0 },
      ],
      highlights: [{ location: { startLine: 1, startCol: 2, endLine: 1, endCol: 6 } }],
      highlightedSymbols: [
        {
          declaration: { startLine: 1, startCol: 2, endLine: 1, endCol: 3 },
          references: [{ startLine: 1, startCol: 5, endLine: 1, endCol: 6 }],
        },
      ],
      cpdTokens: [{ location: { startLine: 1, startCol: 5, endLine: 2, endCol: 0 } }],
      metrics: {
        ncloc: [1, 2, 3],
        commentLines: [1],
        nosonarLines: [1],
        executableLines: [1, 2],
      },
      sonarResolveComments: [{ line: 1 }],
    });
  });

  it('returns the original result when no conversion is needed', () => {
    const result: FileResult = { issues: [] };
    expect(alignFileResultWithScanner(result, 'const answer = 42;')).toBe(result);
  });

  it('maps the AST before serializing it without changing parser locations', () => {
    const source = 'const a=1;\u2028const b=2;';
    const sourceCode = parse(source, parsersMap.typescript, buildTsParserOptions()).sourceCode;
    const result: UnserializedJsTsAnalysisOutput = {
      issues: [],
      unserializedAst: sourceCode.ast as TSESTree.Program,
    };

    const finalized = finalizeFileResultForScanner(
      result,
      source,
      normalizeToAbsolutePath('/project/file.js'),
    );

    assert('ast' in finalized && finalized.ast);
    const protobufAst = deserializeProtobuf(finalized.ast);
    const secondStatement = protobufAst.program?.body?.[1];
    expect(secondStatement?.loc).toMatchObject({
      start: { line: 1, column: source.indexOf('const b') },
      end: { line: 1, column: source.length },
    });
    expect(sourceCode.ast.body[1].loc).toMatchObject({
      start: { line: 2, column: 0 },
      end: { line: 2, column: 'const b=2;'.length },
    });
  });
});
