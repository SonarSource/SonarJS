/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
import { parsersMap } from '../../src/parsers/eslint.js';
import { parse } from '../../src/parsers/parse.js';
import { buildParserOptions } from '../../src/parsers/options.js';
import path from 'node:path';
import { describe, it } from 'node:test';
import { expect } from 'expect';
import { readFile } from '../../../shared/src/helpers/files.js';
import { JsTsAnalysisInput } from '../../src/analysis/analysis.js';
import { APIError } from '../../../shared/src/errors/error.js';

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
  it(`Babel should fail parsing input with JSX without the React preset`, async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'parse', 'valid.js');
    const fileContent = await readFile(filePath);
    const fileType = 'MAIN';

    const input = { filePath, fileType, fileContent } as JsTsAnalysisInput;
    const options = buildParserOptions(input, true);
    options.babelOptions.presets.shift();

    expect(() => parse(fileContent, parseFunctions[0].parser, options)).toThrow(
      APIError.parsingError('Unexpected token (2:15)', { line: 2 }),
    );
  });

  parseFunctions.forEach(({ parser, usingBabel, errorMessage }) => {
    it(`should parse a valid input with ${parser.meta!.name}`, async () => {
      const filePath = path.join(import.meta.dirname, 'fixtures', 'parse', 'valid.js');
      const fileContent = await readFile(filePath);
      const fileType = 'MAIN';

      const input = { filePath, fileType, fileContent } as JsTsAnalysisInput;
      const options = buildParserOptions(input, usingBabel);
      const sourceCode = parse(fileContent, parser, options).sourceCode;

      expect(sourceCode).toBeDefined();
      expect(sourceCode.ast).toBeDefined();
    });

    it(`should parse a valid input with ${parser.meta!.name}`, () => {
      const fileContent = 'if (foo()) bar();';
      const fileType = 'MAIN';

      const input = { fileContent, fileType } as JsTsAnalysisInput;
      const options = buildParserOptions(input, usingBabel);
      const sourceCode = parse(fileContent, parser, options).sourceCode;

      expect(sourceCode).toBeDefined();
      expect(sourceCode.ast).toBeDefined();
    });

    it(`should fail parsing an invalid input with ${parser.meta!.name}`, async () => {
      const filePath = path.join(import.meta.dirname, 'fixtures', 'parse', 'invalid.js');
      const fileContent = await readFile(filePath);
      const fileType = 'MAIN';

      const input = { filePath, fileType, fileContent } as JsTsAnalysisInput;
      const options = buildParserOptions(input, usingBabel);

      expect(() => parse(fileContent, parser, options)).toThrow(
        APIError.parsingError(errorMessage, { line: 1 }),
      );
    });
  });
});
