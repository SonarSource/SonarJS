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
import path from 'path';

import { readFile } from '@sonar/shared';
import {
  buildParserOptions,
  parseForESLint,
  parsers,
  deserializeProtobuf,
  parseInProtobuf,
  serializeInProtobuf,
  NODE_TYPE_ENUM,
  type ParseFunction,
  visitNode,
} from '../../src/parsers';
import { JsTsAnalysisInput } from '../../src/analysis';
import { TSESTree } from '@typescript-eslint/utils';

const parseFunctions = [
  {
    parser: parsers.javascript,
    usingBabel: true,
    errorMessage: 'Unterminated string constant. (1:0)',
  },
  { parser: parsers.typescript, usingBabel: false, errorMessage: 'Unterminated string literal.' },
];

async function parseSourceFile(filePath, parser, usingBabel = false) {
  const fileContent = await readFile(filePath);
  const fileType = 'MAIN';

  const input = { filePath, fileType, fileContent } as JsTsAnalysisInput;
  const options = buildParserOptions(input, usingBabel);
  return parseForESLint(fileContent, parser.parse, options);
}

async function parseSourceCode(code: string, parser: { parse: ParseFunction }) {
  return parseForESLint(code, parser.parse, {
    comment: true,
    loc: true,
    range: true,
    tokens: true,
  }).ast;
}

describe('ast', () => {
  describe('serializeInProtobuf()', () => {
    test.each(parseFunctions)(
      'should not lose information between serialize and deserializing JavaScript',
      async ({ parser, usingBabel }) => {
        const filePath = path.join(__dirname, 'fixtures', 'ast', 'base.js');
        const sc = await parseSourceFile(filePath, parser, usingBabel);
        const protoMessage = parseInProtobuf(sc.ast as TSESTree.Program);
        const serialized = serializeInProtobuf(sc.ast as TSESTree.Program);
        const deserializedProtoMessage = deserializeProtobuf(serialized);
        compareASTs(protoMessage, deserializedProtoMessage);
      },
    );
  });
  test('should encode unknown nodes', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'ast', 'unknownNode.ts');
    const sc = await parseSourceFile(filePath, parsers.typescript);
    const protoMessage = parseInProtobuf(sc.ast as TSESTree.Program);
    expect((protoMessage as any).program.body[0].type).toEqual(
      NODE_TYPE_ENUM.values['UnknownNodeType'],
    );
  });
  test('should support TSAsExpression nodes', async () => {
    const code = `const foo = '5' as string;`;
    const ast = await parseSourceCode(code, parsers.typescript);
    const serializedAST = visitNode(ast as TSESTree.Program);

    // we are only interested in checking that the serialized AST only contains nodes relevant at runtime
    expect(serializedAST.type).toEqual(0); // Program
    expect(serializedAST.program.body[0].type).toEqual(
      NODE_TYPE_ENUM.values['VariableDeclarationType'],
    ); // VariableDeclaration
    expect(serializedAST.program.body[0].variableDeclaration.declarations[0].type).toEqual(
      NODE_TYPE_ENUM.values['VariableDeclaratorType'],
    ); // VariableDeclarator
    expect(
      serializedAST.program.body[0].variableDeclaration.declarations[0].variableDeclarator.id.type,
    ).toEqual(NODE_TYPE_ENUM.values['IdentifierType']); // Identifier
    expect(
      serializedAST.program.body[0].variableDeclaration.declarations[0].variableDeclarator.init
        .type,
    ).toEqual(NODE_TYPE_ENUM.values['LiteralType']); // Literal
  });

  test('should support TSTypeAssertion nodes', async () => {
    const code = `<Foo>foo;`;
    const ast = await parseSourceCode(code, parsers.typescript);
    const serializedAST = visitNode(ast as TSESTree.Program);

    const identifier = serializedAST.program.body[0].expressionStatement.expression;
    expect(identifier.type).toEqual(NODE_TYPE_ENUM.values['IdentifierType']);
    expect(identifier.identifier.name).toEqual('foo');
  });
});

/**
 * Put breakpoints on the lines that throw to debug the AST comparison.
 */
function compareASTs(parsedAst, deserializedAst) {
  let expected, received;
  for (const [key, value] of Object.entries(parsedAst)) {
    if (value !== undefined && deserializedAst[key] === undefined) {
      throw new Error(`Key ${key} not found in ${deserializedAst.type}`);
    }
    if (key === 'type') continue;
    if (Array.isArray(value)) {
      if (!Array.isArray(deserializedAst[key])) {
        throw new Error(`Expected array for key ${key} in ${parsedAst.type}`);
      }
      expected = value.length;
      received = deserializedAst[key].length;
      if (expected !== received) {
        throw new Error(
          `Length mismatch for key ${key} in ${parsedAst.type}. Expected ${expected}, got ${received}`,
        );
      }
      for (let i = 0; i < value.length; i++) {
        compareASTs(value[i], deserializedAst[key][i]);
      }
    } else if (typeof value === 'object') {
      compareASTs(value, deserializedAst[key]);
    } else {
      if (areDifferent(value, deserializedAst[key])) {
        throw new Error(
          `Value mismatch for key ${key} in ${parsedAst.type}. Expected ${value}, got ${deserializedAst[key]}`,
        );
      }
    }
  }

  function areDifferent(a, b) {
    if (isNullOrUndefined(a) && isNullOrUndefined(b)) return false;
    return a !== b;
    function isNullOrUndefined(a) {
      return a === null || a === undefined;
    }
  }
}
