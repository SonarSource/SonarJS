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
import path from 'path';

import { Parser, parsersMap } from '../../src/parsers/eslint.js';
import type { TSESTree } from '@typescript-eslint/utils';
import { describe, test } from 'node:test';
import { expect } from 'expect';
import { readFile } from '../../../shared/src/helpers/files.js';
import { JsTsAnalysisInput } from '../../src/analysis/analysis.js';
import { buildParserOptions } from '../../src/parsers/options.js';
import {
  deserializeProtobuf,
  lowerCaseFirstLetter,
  NODE_TYPE_ENUM,
  parseInProtobuf,
  serializeInProtobuf,
  visitNode,
  VisitNodeReturnType,
} from '../../src/parsers/ast.js';
import { parse } from '../../src/parsers/parse.js';

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
];

async function parseSourceFile(filePath: string, parser: Parser, usingBabel = false) {
  const fileContent = await readFile(filePath);
  const fileType = 'MAIN';

  const input = { filePath, fileType, fileContent } as JsTsAnalysisInput;
  const options = buildParserOptions(input, usingBabel);
  return parse(fileContent, parser, options);
}

async function parseSourceCode(code: string, parser: Parser) {
  return parse(code, parser, {
    comment: true,
    loc: true,
    range: true,
    tokens: true,
  }).sourceCode.ast;
}

describe('ast', () => {
  describe('serializeInProtobuf()', () => {
    parseFunctions.forEach(({ parser, usingBabel }) =>
      test('should not lose information between serialize and deserializing JavaScript', async () => {
        const filePath = path.join(import.meta.dirname, 'fixtures', 'ast', 'base.js');
        const sc = await parseSourceFile(filePath, parser, usingBabel);
        const protoMessage = parseInProtobuf(sc.sourceCode.ast as TSESTree.Program);
        const serialized = serializeInProtobuf(sc.sourceCode.ast as TSESTree.Program, filePath);
        const deserializedProtoMessage = deserializeProtobuf(serialized);
        compareASTs(protoMessage, deserializedProtoMessage);
      }),
    );
  });
  test('should support TSAsExpression nodes', async () => {
    const code = `const foo = '5' as string;`;
    const ast = await parseSourceCode(code, parsersMap.typescript);
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

  test('should support TSSatisfiesExpression nodes', async () => {
    const code = `42 satisfies Bar;`;
    const ast = await parseSourceCode(code, parsersMap.typescript);
    const serializedAST = visitNode(ast as TSESTree.Program);
    const literalNode = serializedAST.program.body[0].expressionStatement.expression.literal;
    expect(literalNode.type).toEqual(NODE_TYPE_ENUM.values['Literal']);
    expect(literalNode.valueNumber).toEqual(42);
  });

  test('should support TSNonNullExpression nodes', async () => {
    const code = `foo!;`;
    const ast = await parseSourceCode(code, parsersMap.typescript);
    const serializedAST = visitNode(ast as TSESTree.Program);

    const identifier = serializedAST.program.body[0].expressionStatement.expression;
    expect(identifier.type).toEqual(NODE_TYPE_ENUM.values['IdentifierType']);
    expect(identifier.identifier.name).toEqual('foo');
  });

  test('should support TSTypeAssertion nodes', async () => {
    const code = `<Foo>foo;`;
    const ast = await parseSourceCode(code, parsersMap.typescript);
    const serializedAST = visitNode(ast as TSESTree.Program);

    const identifier = serializedAST.program.body[0].expressionStatement.expression;
    expect(identifier.type).toEqual(NODE_TYPE_ENUM.values['IdentifierType']);
    expect(identifier.identifier.name).toEqual('foo');
  });

  test('should support TSParameterProperty nodes', async () => {
    const code = `
    class Foo {
      constructor(public foo: Bar) {}
    }`;
    const ast = await parseSourceCode(code, parsersMap.typescript);
    const protoMessage = visitNode(ast as TSESTree.Program);
    const classDeclaration = protoMessage.program.body[0].classDeclaration;
    const constructorMethod = classDeclaration.body.classBody.body[0].methodDefinition;
    const constructorFunction = constructorMethod.value.functionExpression;
    expect(constructorFunction.params[0].type).toEqual(
      NODE_TYPE_ENUM.values['TSParameterPropertyType'],
    );
    const parameterProperty = constructorFunction.params[0].tSParameterProperty;
    expect(parameterProperty.accessibility).toEqual('public');
    expect(parameterProperty.readonly).toEqual(false);
    expect(parameterProperty.parameter.type).toEqual(NODE_TYPE_ENUM.values['IdentifierType']);
    expect(parameterProperty.parameter.identifier.name).toEqual('foo');
  });

  test('should support TSExportAssignment nodes', async () => {
    const code = `export = foo();`;
    const ast = await parseSourceCode(code, parsersMap.typescript);
    const serializedAST = visitNode(ast as TSESTree.Program);

    const expression = serializedAST.program.body[0].tSExportAssignment.expression;
    expect(expression.type).toEqual(NODE_TYPE_ENUM.values['CallExpressionType']);
    expect(expression.callExpression.callee.identifier.name).toEqual('foo');
  });

  test('should support TSImportEquals nodes with Identifier module reference', async () => {
    const code = `import a = foo;`;
    const ast = await parseSourceCode(code, parsersMap.typescript);
    const protoMessage = visitNode(ast as TSESTree.Program);

    expect(protoMessage.program.body[0].type).toEqual(
      NODE_TYPE_ENUM.values['TSImportEqualsDeclarationType'],
    );

    const tSImportEqualsDeclaration = protoMessage.program.body[0].tSImportEqualsDeclaration;
    expect(tSImportEqualsDeclaration.importKind).toEqual('value');

    let id = tSImportEqualsDeclaration.id;
    expect(id.type).toEqual(NODE_TYPE_ENUM.values['IdentifierType']);
    expect(id.identifier.name).toEqual('a');

    let moduleReference = tSImportEqualsDeclaration.moduleReference;
    expect(moduleReference.type).toEqual(NODE_TYPE_ENUM.values['IdentifierType']);
    expect(moduleReference.identifier.name).toEqual('foo');

    checkAstIsProperlySerializedAndDeserialized(ast as TSESTree.Program, protoMessage, 'foo.ts');
  });

  test('should support TSImportEquals nodes with TSQualifiedName module reference', async () => {
    const code = `import a = a.b.c;`;
    const ast = await parseSourceCode(code, parsersMap.typescript);
    const protoMessage = visitNode(ast as TSESTree.Program);

    expect(protoMessage.program.body[0].type).toEqual(
      NODE_TYPE_ENUM.values['TSImportEqualsDeclarationType'],
    );

    const tSImportEqualsDeclaration = protoMessage.program.body[0].tSImportEqualsDeclaration;
    expect(tSImportEqualsDeclaration.importKind).toEqual('value');

    let id = tSImportEqualsDeclaration.id;
    expect(id.type).toEqual(NODE_TYPE_ENUM.values['IdentifierType']);
    expect(id.identifier.name).toEqual('a');
    expect(tSImportEqualsDeclaration.moduleReference.type).toEqual(
      NODE_TYPE_ENUM.values['TSQualifiedNameType'],
    );

    let tSQualifiedName = tSImportEqualsDeclaration.moduleReference.tSQualifiedName;
    expect(tSQualifiedName.right.type).toEqual(NODE_TYPE_ENUM.values['IdentifierType']);
    expect(tSQualifiedName.right.identifier.name).toEqual('c');
    expect(tSQualifiedName.left.type).toEqual(NODE_TYPE_ENUM.values['TSQualifiedNameType']);
    expect(tSQualifiedName.left.tSQualifiedName.left.identifier.name).toEqual('a');
    expect(tSQualifiedName.left.tSQualifiedName.right.identifier.name).toEqual('b');

    checkAstIsProperlySerializedAndDeserialized(ast as TSESTree.Program, protoMessage, 'foo.ts');
  });

  test('should support TSImportEquals nodes with TSExternalModuleReference', async () => {
    const code = `import a = require('foo');`;
    const ast = await parseSourceCode(code, parsersMap.typescript);
    const protoMessage = visitNode(ast as TSESTree.Program);

    expect(protoMessage.program.body[0].type).toEqual(
      NODE_TYPE_ENUM.values['TSImportEqualsDeclarationType'],
    );

    const tSImportEqualsDeclaration = protoMessage.program.body[0].tSImportEqualsDeclaration;
    expect(tSImportEqualsDeclaration.importKind).toEqual('value');

    let id = tSImportEqualsDeclaration.id;
    expect(id.type).toEqual(NODE_TYPE_ENUM.values['IdentifierType']);
    expect(id.identifier.name).toEqual('a');
    expect(tSImportEqualsDeclaration.moduleReference.type).toEqual(
      NODE_TYPE_ENUM.values['TSExternalModuleReferenceType'],
    );

    const tSExternalModuleReference =
      tSImportEqualsDeclaration.moduleReference.tSExternalModuleReference;
    expect(tSExternalModuleReference.expression.literal.valueString).toEqual('foo');

    checkAstIsProperlySerializedAndDeserialized(ast as TSESTree.Program, protoMessage, 'foo.ts');
  });

  test('should support TSImportEquals nodes with type TSExternalModuleReference', async () => {
    const code = `import type a = require('foo');`;
    const ast = await parseSourceCode(code, parsersMap.typescript);
    const protoMessage = visitNode(ast as TSESTree.Program);

    expect(protoMessage.program.body[0].type).toEqual(
      NODE_TYPE_ENUM.values['TSImportEqualsDeclarationType'],
    );

    const tSImportEqualsDeclaration = protoMessage.program.body[0].tSImportEqualsDeclaration;
    expect(tSImportEqualsDeclaration.importKind).toEqual('type');

    let id = tSImportEqualsDeclaration.id;
    expect(id.type).toEqual(NODE_TYPE_ENUM.values['IdentifierType']);
    expect(id.identifier.name).toEqual('a');
    expect(tSImportEqualsDeclaration.moduleReference.type).toEqual(
      NODE_TYPE_ENUM.values['TSExternalModuleReferenceType'],
    );

    const tSExternalModuleReference =
      tSImportEqualsDeclaration.moduleReference.tSExternalModuleReference;
    expect(tSExternalModuleReference.expression.literal.valueString).toEqual('foo');

    checkAstIsProperlySerializedAndDeserialized(ast as TSESTree.Program, protoMessage, 'foo.ts');
  });

  test('should support TSModuleDeclaration nodes', async () => {
    const code = `namespace Foo { let a = 42;}`;
    const ast = await parseSourceCode(code, parsersMap.typescript);
    const protoMessage = visitNode(ast as TSESTree.Program);

    expect(protoMessage.program.body[0].type).toEqual(
      NODE_TYPE_ENUM.values['TSModuleDeclarationType'],
    );
    const tSModuleDeclaration = protoMessage.program.body[0].tSModuleDeclaration;
    expect(tSModuleDeclaration.kind).toEqual('namespace');
    expect(tSModuleDeclaration.id.type).toEqual(NODE_TYPE_ENUM.values['IdentifierType']);
    expect(tSModuleDeclaration.id.identifier.name).toEqual('Foo');
    expect(tSModuleDeclaration.body.type).toEqual(NODE_TYPE_ENUM.values['TSModuleBlockType']);
    expect(tSModuleDeclaration.body.tSModuleBlock.body[0].type).toEqual(
      NODE_TYPE_ENUM.values['VariableDeclarationType'],
    );
    checkAstIsProperlySerializedAndDeserialized(ast as TSESTree.Program, protoMessage, 'foo.ts');
  });

  test('should support TSModuleDeclaration nodes, global kind', async () => {
    const code = `global { let a = 42;}`;
    const ast = await parseSourceCode(code, parsersMap.typescript);
    const protoMessage = visitNode(ast as TSESTree.Program);

    expect(protoMessage.program.body[0].type).toEqual(
      NODE_TYPE_ENUM.values['TSModuleDeclarationType'],
    );
    const tSModuleDeclaration = protoMessage.program.body[0].tSModuleDeclaration;
    expect(tSModuleDeclaration.kind).toEqual('global');
    expect(tSModuleDeclaration.id.type).toEqual(NODE_TYPE_ENUM.values['IdentifierType']);
    expect(tSModuleDeclaration.id.identifier.name).toEqual('global');
    expect(tSModuleDeclaration.body.type).toEqual(NODE_TYPE_ENUM.values['TSModuleBlockType']);
    expect(tSModuleDeclaration.body.tSModuleBlock.body[0].type).toEqual(
      NODE_TYPE_ENUM.values['VariableDeclarationType'],
    );
    checkAstIsProperlySerializedAndDeserialized(ast as TSESTree.Program, protoMessage, 'foo.ts');
  });

  test('should support TSModuleDeclaration nodes, without body', async () => {
    const code = `declare module 'Foo'`;
    const ast = await parseSourceCode(code, parsersMap.typescript);
    const protoMessage = visitNode(ast as TSESTree.Program);

    expect(protoMessage.program.body[0].type).toEqual(
      NODE_TYPE_ENUM.values['TSModuleDeclarationType'],
    );
    const tSModuleDeclaration = protoMessage.program.body[0].tSModuleDeclaration;
    expect(tSModuleDeclaration.kind).toEqual('module');
    expect(tSModuleDeclaration.id.type).toEqual(NODE_TYPE_ENUM.values['LiteralType']);
    expect(tSModuleDeclaration.id.literal.valueString).toEqual('Foo');
    expect(tSModuleDeclaration.body).toEqual(undefined);
    checkAstIsProperlySerializedAndDeserialized(ast as TSESTree.Program, protoMessage, 'foo.ts');
  });
  [
    { nodeType: 'TSTypeAliasDeclaration', code: `type A = { a: string };` },
    { nodeType: 'TSInterfaceDeclaration', code: `interface A { a: string; }` },
    { nodeType: 'TSEnumDeclaration', code: `enum Direction {}` },
    { nodeType: 'TSDeclareFunction', code: `declare function foo()` },
  ].forEach(({ nodeType, code }) =>
    test(`should serialize ${nodeType} to empty object`, async () => {
      const ast = await parseSourceCode(code, parsersMap.typescript);
      const protoMessage = visitNode(ast as TSESTree.Program);
      expect(protoMessage.program.body[0].type).toEqual(NODE_TYPE_ENUM.values[`${nodeType}Type`]);
      const tSModuleDeclaration = protoMessage.program.body[0][lowerCaseFirstLetter(nodeType)];
      expect(tSModuleDeclaration).toEqual({});
      checkAstIsProperlySerializedAndDeserialized(ast as TSESTree.Program, protoMessage, 'foo.ts');
    }),
  );

  test('should serialize TSEmptyBodyFunctionExpression node to empty object', async () => {
    const code = `class Foo { bar() }`;
    const ast = await parseSourceCode(code, parsersMap.typescript);
    const protoMessage = visitNode(ast as TSESTree.Program);

    expect(protoMessage.program.body[0].type).toEqual(
      NODE_TYPE_ENUM.values['ClassDeclarationType'],
    );
    const methodDefinition =
      protoMessage.program.body[0].classDeclaration.body.classBody.body[0].methodDefinition.value;
    expect(methodDefinition.type).toEqual(
      NODE_TYPE_ENUM.values['TSEmptyBodyFunctionExpressionType'],
    );
    expect(methodDefinition.tSEmptyBodyFunctionExpression).toEqual({});
    checkAstIsProperlySerializedAndDeserialized(ast as TSESTree.Program, protoMessage, 'foo.ts');
  });

  test('should serialize TSAbstractMethodDefinition nodes to empty objects', async () => {
    const code = `class Foo { abstract bar() }`;
    const ast = await parseSourceCode(code, parsersMap.typescript);
    const protoMessage = visitNode(ast as TSESTree.Program);

    expect(protoMessage.program.body[0].type).toEqual(
      NODE_TYPE_ENUM.values['ClassDeclarationType'],
    );
    let body = protoMessage.program.body[0].classDeclaration.body.classBody.body;
    expect(body[0].type).toEqual(NODE_TYPE_ENUM.values['TSAbstractMethodDefinitionType']);
    expect(body[0].tSAbstractMethodDefinition).toEqual({});
    checkAstIsProperlySerializedAndDeserialized(ast as TSESTree.Program, protoMessage, 'foo.ts');
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

function checkAstIsProperlySerializedAndDeserialized(
  ast: TSESTree.Program,
  expectedProtoMessage: VisitNodeReturnType,
  fileName: string,
) {
  const serialized = serializeInProtobuf(ast, fileName);
  const deserializedProtoMessage = deserializeProtobuf(serialized);
  compareASTs(deserializedProtoMessage, expectedProtoMessage);
}
