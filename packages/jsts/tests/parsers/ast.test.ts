/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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

import { readFile } from '@sonar/shared';
import {
  buildParserOptions,
  deserializeFromProtobuf,
  gatherAstNodes,
  parseAst,
  parseForESLint,
  parsers,
  serialize,
  serializeInProtobuf,
  verifyProtobuf,
} from '../../src/parsers';
import { JsTsAnalysisInput } from '../../src/analysis';
import path from 'path';

const parseFunctions = [
  {
    parser: parsers.javascript,
    usingBabel: true,
    errorMessage: 'Unterminated string constant. (1:0)',
  },
  //{ parser: parsers.typescript, usingBabel: false, errorMessage: 'Unterminated string literal.' },
];

async function parseSourceCode(filePath, parser, usingBabel = false) {
  const fileContent = await readFile(filePath);
  const fileType = 'MAIN';

  const input = { filePath, fileType, fileContent } as JsTsAnalysisInput;
  const options = buildParserOptions(input, usingBabel);
  return parseForESLint(fileContent, parser.parse, options);
}

describe('parseAst', () => {
  test.each(parseFunctions)(
    'should remove circular references from the AST',
    async ({ parser, usingBabel }) => {
      const filePath = path.join(__dirname, 'fixtures', 'ast', 'base.js');
      const sourceCode = await parseSourceCode(filePath, parser, usingBabel);
      const ast = parseAst(sourceCode);
      JSON.stringify(ast);
      expect(() => JSON.stringify(ast)).not.toThrow();
    },
  );

  test.each(parseFunctions)(
    'should parse ast into an array of nodes',
    async ({ parser, usingBabel }) => {
      const filePath = path.join(__dirname, 'fixtures', 'ast', 'base.js');
      const sc = await parseSourceCode(filePath, parser, usingBabel);
      const nodes = gatherAstNodes(sc);
      expect(nodes).toBeDefined();
      expect(nodes).toHaveLength(836);
    },
  );

  test.each(parseFunctions)(
    'should serialize the AST in protobuf',
    async ({ parser, usingBabel }) => {
      const filePath = path.join(__dirname, 'fixtures', 'ast', 'base.js');
      const sc = await parseSourceCode(filePath, parser, usingBabel);
      const buf = serializeInProtobuf(sc);
      expect(buf).toBeDefined();
      //fs.writeFileSync(path.join(__dirname, 'fixtures', 'ast', 'base.data'), buf);
      const debuf = deserializeFromProtobuf(buf);
      debuf;
    },
  );

  test.each(parseFunctions)('should verify the AST in protobuf', async ({ parser, usingBabel }) => {
    const filePath = path.join(__dirname, 'fixtures', 'ast', 'base.js');
    const sc = await parseSourceCode(filePath, parser, usingBabel);
    const v = verifyProtobuf(sc);
    expect(v).toBeDefined();
  });

  test.each(parseFunctions)('should do that smart serialize', async ({ parser, usingBabel }) => {
    const filePath = path.join(__dirname, 'fixtures', 'ast', 'base.js');
    const sc = await parseSourceCode(filePath, parser, usingBabel);
    const v = serialize(sc.ast, sc);
    expect(v).toBeDefined();
  });
});