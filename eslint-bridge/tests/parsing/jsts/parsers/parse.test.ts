/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

import { SourceCode } from 'eslint';
import { buildParserOptions, parseForESLint, parsers } from 'parsing/jsts';
import path from 'path';
import { AnalysisError, AnalysisErrorCode } from 'services/analysis';
import { JsTsAnalysisInput } from 'services/analysis/analyzers/js';

const parseFunctions = [
  { parser: parsers.javascript, usingBabel: true },
  { parser: parsers.typescript, usingBabel: false },
];

describe('parseForESLint', () => {
  test.each(parseFunctions)(
    'should parse a valid input with $parser.parser',
    ({ parser, usingBabel }) => {
      const filePath = path.join(__dirname, 'fixtures', 'parse', 'valid.js');
      const fileType = 'MAIN';

      const input = { filePath, fileType } as JsTsAnalysisInput;
      const options = buildParserOptions(input, usingBabel);
      const sourceCode = parseForESLint(input, parser.parse, options) as SourceCode;

      expect(sourceCode).toBeDefined();
      expect(sourceCode.ast).toBeDefined();
    },
  );

  test.each(parseFunctions)(
    'should parse a valid input with $parser.parser',
    ({ parser, usingBabel }) => {
      const fileContent = 'if (foo()) bar();';
      const fileType = 'MAIN';

      const input = { fileContent, fileType } as JsTsAnalysisInput;
      const options = buildParserOptions(input, usingBabel);
      const sourceCode = parseForESLint(input, parser.parse, options) as SourceCode;

      expect(sourceCode).toBeDefined();
      expect(sourceCode.ast).toBeDefined();
    },
  );

  test.each(parseFunctions)(
    'should fail parsing an invalid input with $parser.parser',
    ({ parser, usingBabel }) => {
      const filePath = path.join(__dirname, 'fixtures', 'parse', 'invalid.js');
      const fileType = 'MAIN';

      const input = { filePath, fileType } as JsTsAnalysisInput;
      const options = buildParserOptions(input, usingBabel);
      const parsingError = parseForESLint(input, parser.parse, options) as AnalysisError;

      expect(parsingError).toEqual(
        expect.objectContaining({
          code: AnalysisErrorCode.Parsing,
          line: 1,
        }),
      );
    },
  );
});
