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
import { parsersMap } from '../../../src/jsts/parsers/eslint.js';
import { parse } from '../../../src/jsts/parsers/parse.js';
import {
  buildBabelParserOptions,
  buildTsParserOptions,
} from '../../../src/jsts/parsers/options.js';
import path from 'node:path';
import { describe, it } from 'node:test';
import { expect } from 'expect';
import { readFile, normalizeToAbsolutePath } from '../../../../shared/src/helpers/files.js';
import { JsTsAnalysisInput } from '../../../src/jsts/analysis/analysis.js';
import { APIError } from '../../../src/contracts/error.js';

const parseFunctions = [
  {
    parser: parsersMap.javascript,
    usingBabel: true,
    errorMessage: 'Unterminated string constant. (1:0)',
  },
  {
    parser: parsersMap.typescript,
    usingBabel: false,
    errorMessage: 'Unterminated string literal.',
  },
] as const;

describe('parseForESLint', () => {
  it('should parse JSX with Babel in no-config mode via parser plugins', async () => {
    const filePath = normalizeToAbsolutePath(
      path.join(import.meta.dirname, 'fixtures', 'parse', 'valid.js'),
    );
    const fileContent = await readFile(filePath);
    const fileType = 'MAIN';

    const input = { filePath, fileType, fileContent } as JsTsAnalysisInput;
    const options = buildBabelParserOptions(input);
    options.babelOptions.presets = [];
    options.babelOptions.plugins = [];

    expect(() => parse(fileContent, parseFunctions[0].parser, options)).not.toThrow();
  });

  for (const { parser, usingBabel, errorMessage } of parseFunctions) {
    it(`should parse a valid input with ${parser.meta!.name}`, async () => {
      const filePath = normalizeToAbsolutePath(
        path.join(import.meta.dirname, 'fixtures', 'parse', 'valid.js'),
      );
      const fileContent = await readFile(filePath);
      const fileType = 'MAIN';

      const input = { filePath, fileType, fileContent } as JsTsAnalysisInput;
      const options = usingBabel ? buildBabelParserOptions(input) : buildTsParserOptions(input);
      const sourceCode = parse(fileContent, parser, options).sourceCode;

      expect(sourceCode).toBeDefined();
      expect(sourceCode.ast).toBeDefined();
    });

    it(`should parse a valid input with ${parser.meta!.name}`, () => {
      const fileContent = 'if (foo()) bar();';
      const fileType = 'MAIN';

      const input = { fileContent, fileType } as JsTsAnalysisInput;
      const options = usingBabel ? buildBabelParserOptions(input) : buildTsParserOptions(input);
      const sourceCode = parse(fileContent, parser, options).sourceCode;

      expect(sourceCode).toBeDefined();
      expect(sourceCode.ast).toBeDefined();
    });

    it(`should fail parsing an invalid input with ${parser.meta!.name}`, async () => {
      const filePath = normalizeToAbsolutePath(
        path.join(import.meta.dirname, 'fixtures', 'parse', 'invalid.js'),
      );
      const fileContent = await readFile(filePath);
      const fileType = 'MAIN';

      const input = { filePath, fileType, fileContent } as JsTsAnalysisInput;
      const options = usingBabel ? buildBabelParserOptions(input) : buildTsParserOptions(input);

      expect(() => parse(fileContent, parser, options)).toThrow(
        APIError.parsingError(errorMessage, { line: 1 }),
      );
    });

    it(`should use scanner-compatible locations with ${parser.meta!.name}`, () => {
      const lineSeparator = '\u2028';
      const paragraphSeparator = '\u2029';
      const fileContent = `// comment${lineSeparator}const value = 'before${paragraphSeparator}after';\nconst next = 42;`;
      const input = { fileContent, fileType: 'MAIN' } as JsTsAnalysisInput;
      const options = usingBabel ? buildBabelParserOptions(input) : buildTsParserOptions(input);

      const { sourceCode } = parse(fileContent, parser, options);
      const firstDeclaration = sourceCode.ast.body[0];
      const secondDeclaration = sourceCode.ast.body[1];
      const value = (firstDeclaration as any).declarations[0].init.value;
      const secondDeclarationOffset = fileContent.indexOf('const next');

      expect(sourceCode.text).toBe(fileContent);
      expect(sourceCode.lines).toEqual([
        `// comment${lineSeparator}const value = 'before${paragraphSeparator}after';`,
        'const next = 42;',
      ]);
      expect(value).toBe(`before${paragraphSeparator}after`);
      expect(firstDeclaration.loc).toEqual({
        start: { line: 1, column: 11 },
        end: { line: 1, column: 40 },
      });
      expect(secondDeclaration.loc).toEqual({
        start: { line: 2, column: 0 },
        end: { line: 2, column: 16 },
      });
      expect(sourceCode.getLocFromIndex(secondDeclarationOffset)).toEqual({ line: 2, column: 0 });
      expect(sourceCode.getIndexFromLoc({ line: 2, column: 0 })).toBe(secondDeclarationOffset);
    });
  }
});
