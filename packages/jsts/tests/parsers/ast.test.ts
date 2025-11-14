/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import path from 'node:path';

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
import assert from 'node:assert';

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

/**
 * Parse source code for testing purposes.
 *
 * The `enableJsx` parameter serves as a file extension proxy to resolve angular bracket
 * ambiguity: TypeScript interprets `<T>` as type assertions while JSX/TSX treats them
 * as elements. Since we're parsing raw strings without file context, this flag controls
 * the parsing mode.
 */
async function parseSourceCode(code: string, parser: Parser, enableJsx: boolean = false) {
  return parse(code, parser, {
    comment: true,
    loc: true,
    range: true,
    tokens: true,
    ecmaFeatures: {
      jsx: enableJsx,
    },
  }).sourceCode.ast;
}

describe('ast', () => {
  describe('serializeInProtobuf()', () => {
    for (const { parser, usingBabel } of parseFunctions)
      test('should not lose information between serialize and deserializing JavaScript', async () => {
        const filePath = path.join(import.meta.dirname, 'fixtures', 'ast', 'base.js');
        const sc = await parseSourceFile(filePath, parser, usingBabel);
        const protoMessage = parseInProtobuf(sc.sourceCode.ast as TSESTree.Program);
        const serialized = serializeInProtobuf(sc.sourceCode.ast as TSESTree.Program, filePath);
        const deserializedProtoMessage = deserializeProtobuf(serialized);
        compareASTs(protoMessage, deserializedProtoMessage);
      });
  });
  test('should support TSAsExpression nodes', async () => {
    const code = `const foo = '5' as string;`;
    const ast = await parseSourceCode(code, parsersMap.typescript);
    const serializedAST = visitNode(ast as TSESTree.Program);

    assert.ok(serializedAST);
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
    assert.ok(serializedAST);
    const literalNode = serializedAST.program.body[0].expressionStatement.expression.literal;
    expect(literalNode.type).toEqual(NODE_TYPE_ENUM.values['Literal']);
    expect(literalNode.valueNumber).toEqual(42);
  });

  test('should support TSNonNullExpression nodes', async () => {
    const code = `foo!;`;
    const ast = await parseSourceCode(code, parsersMap.typescript);
    const serializedAST = visitNode(ast as TSESTree.Program);

    assert.ok(serializedAST);
    const identifier = serializedAST.program.body[0].expressionStatement.expression;
    expect(identifier.type).toEqual(NODE_TYPE_ENUM.values['IdentifierType']);
    expect(identifier.identifier.name).toEqual('foo');
  });

  test('should support TSTypeAssertion nodes', async () => {
    const code = `<Foo>foo;`;
    const ast = await parseSourceCode(code, parsersMap.typescript);
    const serializedAST = visitNode(ast as TSESTree.Program);

    assert.ok(serializedAST);
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
    assert.ok(protoMessage);
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

    assert.ok(serializedAST);
    const expression = serializedAST.program.body[0].tSExportAssignment.expression;
    expect(expression.type).toEqual(NODE_TYPE_ENUM.values['CallExpressionType']);
    expect(expression.callExpression.callee.identifier.name).toEqual('foo');
  });

  test('should support TSImportEquals nodes with Identifier module reference', async () => {
    const code = `import a = foo;`;
    const ast = await parseSourceCode(code, parsersMap.typescript);
    const protoMessage = visitNode(ast as TSESTree.Program);

    assert.ok(protoMessage);
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

    assert.ok(protoMessage);
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

    assert.ok(protoMessage);
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

    assert.ok(protoMessage);
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

    assert.ok(protoMessage);
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

    assert.ok(protoMessage);
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

    assert.ok(protoMessage);
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
  for (const { nodeType, code } of [
    { nodeType: 'TSTypeAliasDeclaration', code: `type A = { a: string };` },
    { nodeType: 'TSInterfaceDeclaration', code: `interface A { a: string; }` },
    { nodeType: 'TSEnumDeclaration', code: `enum Direction {}` },
    { nodeType: 'TSDeclareFunction', code: `declare function foo()` },
  ])
    test(`should serialize ${nodeType} to empty object`, async () => {
      const ast = await parseSourceCode(code, parsersMap.typescript);
      const protoMessage = visitNode(ast as TSESTree.Program);
      assert.ok(protoMessage);
      expect(protoMessage.program.body[0].type).toEqual(NODE_TYPE_ENUM.values[`${nodeType}Type`]);
      const tSModuleDeclaration = protoMessage.program.body[0][lowerCaseFirstLetter(nodeType)];
      expect(tSModuleDeclaration).toEqual({});
      checkAstIsProperlySerializedAndDeserialized(ast as TSESTree.Program, protoMessage, 'foo.ts');
    });

  test('should serialize TSEmptyBodyFunctionExpression node to empty object', async () => {
    const code = `class Foo { bar() }`;
    const ast = await parseSourceCode(code, parsersMap.typescript);
    const protoMessage = visitNode(ast as TSESTree.Program);

    assert.ok(protoMessage);
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

    assert.ok(protoMessage);
    expect(protoMessage.program.body[0].type).toEqual(
      NODE_TYPE_ENUM.values['ClassDeclarationType'],
    );
    let body = protoMessage.program.body[0].classDeclaration.body.classBody.body;
    expect(body[0].type).toEqual(NODE_TYPE_ENUM.values['TSAbstractMethodDefinitionType']);
    expect(body[0].tSAbstractMethodDefinition).toEqual({});
    checkAstIsProperlySerializedAndDeserialized(ast as TSESTree.Program, protoMessage, 'foo.ts');
  });

  test('should support JSXElement nodes', async () => {
    const code = `<h1>Hello, World!</h1>`;
    const ast = await parseSourceCode(code, parsersMap.typescript, /* enableJsx */ true);
    const protoMessage = visitNode(ast as TSESTree.Program);

    assert.ok(protoMessage);

    const jsxElementNode = protoMessage.program.body[0].expressionStatement.expression;
    expect(jsxElementNode.type).toEqual(NODE_TYPE_ENUM.values['JSXElementType']);

    const jsxElement = jsxElementNode.jSXElement;
    const openingElementNode = jsxElement.openingElement;
    const closingElementNode = jsxElement.closingElement;
    const textNode = jsxElement.children[0];
    expect(openingElementNode.type).toEqual(NODE_TYPE_ENUM.values['JSXOpeningElementType']);
    expect(closingElementNode.type).toEqual(NODE_TYPE_ENUM.values['JSXClosingElementType']);
    expect(textNode.type).toEqual(NODE_TYPE_ENUM.values['JSXTextType']);

    const openingElement = openingElementNode.jSXOpeningElement;
    const closingElement = closingElementNode.jSXClosingElement;
    const text = textNode.jSXText;
    expect(openingElement.typeArguments).toEqual(undefined);
    expect(openingElement.selfClosing).toEqual(false);
    expect(text.value).toEqual('Hello, World!');

    const openingIdentifierName = openingElement.name.jSXIdentifier.name;
    const closingIdentifierName = closingElement.name.jSXIdentifier.name;

    expect(openingIdentifierName).toEqual('h1');
    expect(closingIdentifierName).toEqual('h1');

    checkAstIsProperlySerializedAndDeserialized(ast as TSESTree.Program, protoMessage, 'foo.tsx');
  });

  test('should support JSXFragment nodes', async () => {
    const code = `<><h1>Hello,</h1><h2>World!</h2></>`;
    const ast = await parseSourceCode(code, parsersMap.typescript, /* enableJsx */ true);
    const protoMessage = visitNode(ast as TSESTree.Program);

    assert.ok(protoMessage);

    const jsxFragmentNode = protoMessage.program.body[0].expressionStatement.expression;
    expect(jsxFragmentNode.type).toEqual(NODE_TYPE_ENUM.values['JSXFragmentType']);

    const jsxFragment = jsxFragmentNode.jSXFragment;
    const openingFragmentNode = jsxFragment.openingFragment;
    const closingFragmentNode = jsxFragment.closingFragment;
    expect(openingFragmentNode.type).toEqual(NODE_TYPE_ENUM.values['JSXOpeningFragmentType']);
    expect(closingFragmentNode.type).toEqual(NODE_TYPE_ENUM.values['JSXClosingFragmentType']);
    expect(openingFragmentNode.jSXOpeningFragment).toEqual({});
    expect(closingFragmentNode.jSXClosingFragment).toEqual({});

    expect(jsxFragment.children.length).toEqual(2);

    const h1ElementNode = jsxFragment.children[0];
    const h2ElementNode = jsxFragment.children[1];
    expect(h1ElementNode.type).toEqual(NODE_TYPE_ENUM.values['JSXElementType']);
    expect(h2ElementNode.type).toEqual(NODE_TYPE_ENUM.values['JSXElementType']);

    const h1Element = h1ElementNode.jSXElement;
    const h2Element = h2ElementNode.jSXElement;
    expect(h1Element.openingElement.jSXOpeningElement.name.jSXIdentifier.name).toEqual('h1');
    expect(h2Element.openingElement.jSXOpeningElement.name.jSXIdentifier.name).toEqual('h2');

    checkAstIsProperlySerializedAndDeserialized(ast as TSESTree.Program, protoMessage, 'foo.tsx');
  });

  test('should support JSXElement nodes with type arguments', async () => {
    const code = `<Component<a> prop="value"/>`;
    const ast = await parseSourceCode(code, parsersMap.typescript, /* enableJsx */ true);
    const protoMessage = visitNode(ast as TSESTree.Program);

    assert.ok(protoMessage);

    const jsxElementNode = protoMessage.program.body[0].expressionStatement.expression;
    expect(jsxElementNode.type).toEqual(NODE_TYPE_ENUM.values['JSXElementType']);

    const jsxElement = jsxElementNode.jSXElement;
    const openingElementNode = jsxElement.openingElement;
    expect(openingElementNode.type).toEqual(NODE_TYPE_ENUM.values['JSXOpeningElementType']);

    const openingElement = openingElementNode.jSXOpeningElement;
    expect(openingElement.name.jSXIdentifier.name).toEqual('Component');
    expect(openingElement.selfClosing).toEqual(true);
    expect(openingElement.typeArguments).toBeDefined();
    expect(openingElement.typeArguments.type).toEqual(
      NODE_TYPE_ENUM.values['TSTypeParameterInstantiationType'],
    );
    expect(openingElement.typeArguments.tSTypeParameterInstantiation).toEqual({});
    expect(openingElement.attributes.length).toEqual(1);

    const attributeNode = openingElement.attributes[0];
    expect(attributeNode.type).toEqual(NODE_TYPE_ENUM.values['JSXAttributeType']);
    expect(attributeNode.jSXAttribute.name.jSXIdentifier.name).toEqual('prop');
    expect(attributeNode.jSXAttribute.value.literal.valueString).toEqual('value');

    checkAstIsProperlySerializedAndDeserialized(ast as TSESTree.Program, protoMessage, 'foo.tsx');
  });

  test('should support JSXAttribute nodes', async () => {
    const code = `<div id="test"/>`;
    const ast = await parseSourceCode(code, parsersMap.typescript, /* enableJsx */ true);
    const protoMessage = visitNode(ast as TSESTree.Program);

    assert.ok(protoMessage);

    const jsxElementNode = protoMessage.program.body[0].expressionStatement.expression;
    expect(jsxElementNode.type).toEqual(NODE_TYPE_ENUM.values['JSXElementType']);

    const openingElement = jsxElementNode.jSXElement.openingElement.jSXOpeningElement;
    expect(openingElement.attributes.length).toEqual(1);

    const attributeNode = openingElement.attributes[0];
    expect(attributeNode.type).toEqual(NODE_TYPE_ENUM.values['JSXAttributeType']);

    const attribute = attributeNode.jSXAttribute;
    expect(attribute.name.jSXIdentifier.name).toEqual('id');
    expect(attribute.value.type).toEqual(NODE_TYPE_ENUM.values['LiteralType']);
    expect(attribute.value.literal.valueString).toEqual('test');

    checkAstIsProperlySerializedAndDeserialized(ast as TSESTree.Program, protoMessage, 'foo.tsx');
  });

  test('should support JSXAttribute with no value (boolean attribute)', async () => {
    const code = `<input disabled/>`;
    const ast = await parseSourceCode(code, parsersMap.typescript, /* enableJsx */ true);
    const protoMessage = visitNode(ast as TSESTree.Program);

    assert.ok(protoMessage);

    const jsxElementNode = protoMessage.program.body[0].expressionStatement.expression;
    const openingElement = jsxElementNode.jSXElement.openingElement.jSXOpeningElement;
    expect(openingElement.attributes.length).toEqual(1);

    const attributeNode = openingElement.attributes[0];
    expect(attributeNode.type).toEqual(NODE_TYPE_ENUM.values['JSXAttributeType']);

    const attribute = attributeNode.jSXAttribute;
    expect(attribute.name.jSXIdentifier.name).toEqual('disabled');
    expect(attribute.value).toBeUndefined();

    checkAstIsProperlySerializedAndDeserialized(ast as TSESTree.Program, protoMessage, 'foo.tsx');
  });

  test('should support JSXAttribute with JSXElement value', async () => {
    const code = `<div prop={<span/>}/>`;
    const ast = await parseSourceCode(code, parsersMap.typescript, /* enableJsx */ true);
    const protoMessage = visitNode(ast as TSESTree.Program);

    assert.ok(protoMessage);

    const jsxElementNode = protoMessage.program.body[0].expressionStatement.expression;
    const openingElement = jsxElementNode.jSXElement.openingElement.jSXOpeningElement;
    expect(openingElement.attributes.length).toEqual(1);

    const attributeNode = openingElement.attributes[0];
    const attribute = attributeNode.jSXAttribute;
    expect(attribute.name.jSXIdentifier.name).toEqual('prop');
    expect(attribute.value.type).toEqual(NODE_TYPE_ENUM.values['JSXExpressionContainerType']);

    const expressionContainer = attribute.value.jSXExpressionContainer;
    expect(expressionContainer.expression.type).toEqual(NODE_TYPE_ENUM.values['JSXElementType']);
    expect(
      expressionContainer.expression.jSXElement.openingElement.jSXOpeningElement.name.jSXIdentifier
        .name,
    ).toEqual('span');

    checkAstIsProperlySerializedAndDeserialized(ast as TSESTree.Program, protoMessage, 'foo.tsx');
  });

  test('should support JSXAttribute with JSXNamespacedName', async () => {
    const code = `<svg xmlns:xlink="http://www.w3.org/1999/xlink"/>`;
    const ast = await parseSourceCode(code, parsersMap.typescript, /* enableJsx */ true);
    const protoMessage = visitNode(ast as TSESTree.Program);

    assert.ok(protoMessage);

    const jsxElementNode = protoMessage.program.body[0].expressionStatement.expression;
    const openingElement = jsxElementNode.jSXElement.openingElement.jSXOpeningElement;
    expect(openingElement.attributes.length).toEqual(1);

    const attributeNode = openingElement.attributes[0];
    const attribute = attributeNode.jSXAttribute;
    expect(attribute.name.type).toEqual(NODE_TYPE_ENUM.values['JSXNamespacedNameType']);

    const namespacedName = attribute.name.jSXNamespacedName;
    expect(namespacedName.namespace.jSXIdentifier.name).toEqual('xmlns');
    expect(namespacedName.name.jSXIdentifier.name).toEqual('xlink');
    expect(attribute.value.type).toEqual(NODE_TYPE_ENUM.values['LiteralType']);
    expect(attribute.value.literal.valueString).toEqual('http://www.w3.org/1999/xlink');

    checkAstIsProperlySerializedAndDeserialized(ast as TSESTree.Program, protoMessage, 'foo.tsx');
  });

  test('should support JSXMemberExpression nodes', async () => {
    const code = `<Foo.Bar/>`;
    const ast = await parseSourceCode(code, parsersMap.typescript, /* enableJsx */ true);
    const protoMessage = visitNode(ast as TSESTree.Program);

    assert.ok(protoMessage);

    const jsxElementNode = protoMessage.program.body[0].expressionStatement.expression;
    expect(jsxElementNode.type).toEqual(NODE_TYPE_ENUM.values['JSXElementType']);

    const nameNode = jsxElementNode.jSXElement.openingElement.jSXOpeningElement.name;
    expect(nameNode.type).toEqual(NODE_TYPE_ENUM.values['JSXMemberExpressionType']);

    const memberExpression = nameNode.jSXMemberExpression;
    expect(memberExpression.object.type).toEqual(NODE_TYPE_ENUM.values['JSXIdentifierType']);
    expect(memberExpression.object.jSXIdentifier.name).toEqual('Foo');
    expect(memberExpression.property.type).toEqual(NODE_TYPE_ENUM.values['JSXIdentifierType']);
    expect(memberExpression.property.jSXIdentifier.name).toEqual('Bar');

    checkAstIsProperlySerializedAndDeserialized(ast as TSESTree.Program, protoMessage, 'foo.tsx');
  });

  test('should support deeply nested JSXMemberExpression', async () => {
    const code = `<Foo.Bar.Baz.Qux/>`;
    const ast = await parseSourceCode(code, parsersMap.typescript, /* enableJsx */ true);
    const protoMessage = visitNode(ast as TSESTree.Program);

    assert.ok(protoMessage);

    const jsxElementNode = protoMessage.program.body[0].expressionStatement.expression;
    const nameNode = jsxElementNode.jSXElement.openingElement.jSXOpeningElement.name;
    expect(nameNode.type).toEqual(NODE_TYPE_ENUM.values['JSXMemberExpressionType']);

    // Traverse: Foo.Bar.Baz.Qux
    // Should be: ((Foo.Bar).Baz).Qux

    const quxMember = nameNode.jSXMemberExpression;
    expect(quxMember.property.jSXIdentifier.name).toEqual('Qux');

    const bazMember = quxMember.object.jSXMemberExpression;
    expect(bazMember.property.jSXIdentifier.name).toEqual('Baz');

    const barMember = bazMember.object.jSXMemberExpression;
    expect(barMember.property.jSXIdentifier.name).toEqual('Bar');

    const fooIdentifier = barMember.object.jSXIdentifier;
    expect(fooIdentifier.name).toEqual('Foo');

    checkAstIsProperlySerializedAndDeserialized(ast as TSESTree.Program, protoMessage, 'foo.tsx');
  });

  test('should support JSXNamespacedName nodes', async () => {
    const code = `<foo:bar/>`;
    const ast = await parseSourceCode(code, parsersMap.typescript, /* enableJsx */ true);
    const protoMessage = visitNode(ast as TSESTree.Program);

    assert.ok(protoMessage);

    const jsxElementNode = protoMessage.program.body[0].expressionStatement.expression;
    expect(jsxElementNode.type).toEqual(NODE_TYPE_ENUM.values['JSXElementType']);

    const nameNode = jsxElementNode.jSXElement.openingElement.jSXOpeningElement.name;
    expect(nameNode.type).toEqual(NODE_TYPE_ENUM.values['JSXNamespacedNameType']);

    const namespacedName = nameNode.jSXNamespacedName;
    expect(namespacedName.namespace.type).toEqual(NODE_TYPE_ENUM.values['JSXIdentifierType']);
    expect(namespacedName.namespace.jSXIdentifier.name).toEqual('foo');
    expect(namespacedName.name.type).toEqual(NODE_TYPE_ENUM.values['JSXIdentifierType']);
    expect(namespacedName.name.jSXIdentifier.name).toEqual('bar');

    checkAstIsProperlySerializedAndDeserialized(ast as TSESTree.Program, protoMessage, 'foo.tsx');
  });

  test('should support JSXSpreadAttribute nodes', async () => {
    const code = `<div {...props}/>`;
    const ast = await parseSourceCode(code, parsersMap.typescript, /* enableJsx */ true);
    const protoMessage = visitNode(ast as TSESTree.Program);

    assert.ok(protoMessage);

    const jsxElementNode = protoMessage.program.body[0].expressionStatement.expression;
    expect(jsxElementNode.type).toEqual(NODE_TYPE_ENUM.values['JSXElementType']);

    const openingElement = jsxElementNode.jSXElement.openingElement.jSXOpeningElement;
    expect(openingElement.attributes.length).toEqual(1);

    const attributeNode = openingElement.attributes[0];
    expect(attributeNode.type).toEqual(NODE_TYPE_ENUM.values['JSXSpreadAttributeType']);

    const spreadAttribute = attributeNode.jSXSpreadAttribute;
    expect(spreadAttribute.argument.type).toEqual(NODE_TYPE_ENUM.values['IdentifierType']);
    expect(spreadAttribute.argument.identifier.name).toEqual('props');

    checkAstIsProperlySerializedAndDeserialized(ast as TSESTree.Program, protoMessage, 'foo.tsx');
  });

  test('should support JSXExpressionContainer nodes', async () => {
    const code = `<div>{value}</div>`;
    const ast = await parseSourceCode(code, parsersMap.typescript, /* enableJsx */ true);
    const protoMessage = visitNode(ast as TSESTree.Program);

    assert.ok(protoMessage);

    const jsxElementNode = protoMessage.program.body[0].expressionStatement.expression;
    expect(jsxElementNode.type).toEqual(NODE_TYPE_ENUM.values['JSXElementType']);

    const jsxElement = jsxElementNode.jSXElement;
    expect(jsxElement.children.length).toEqual(1);

    const childNode = jsxElement.children[0];
    expect(childNode.type).toEqual(NODE_TYPE_ENUM.values['JSXExpressionContainerType']);

    const expressionContainer = childNode.jSXExpressionContainer;
    expect(expressionContainer.expression.type).toEqual(NODE_TYPE_ENUM.values['IdentifierType']);
    expect(expressionContainer.expression.identifier.name).toEqual('value');

    checkAstIsProperlySerializedAndDeserialized(ast as TSESTree.Program, protoMessage, 'foo.tsx');
  });

  test('should support JSXSpreadChild nodes', async () => {
    const code = `<div>{...children}</div>`;
    const ast = await parseSourceCode(code, parsersMap.typescript, /* enableJsx */ true);
    const protoMessage = visitNode(ast as TSESTree.Program);

    assert.ok(protoMessage);

    const jsxElementNode = protoMessage.program.body[0].expressionStatement.expression;
    expect(jsxElementNode.type).toEqual(NODE_TYPE_ENUM.values['JSXElementType']);

    const jsxElement = jsxElementNode.jSXElement;
    expect(jsxElement.children.length).toEqual(1);

    const childNode = jsxElement.children[0];
    expect(childNode.type).toEqual(NODE_TYPE_ENUM.values['JSXSpreadChildType']);

    const spreadChild = childNode.jSXSpreadChild;
    expect(spreadChild.expression.type).toEqual(NODE_TYPE_ENUM.values['IdentifierType']);
    expect(spreadChild.expression.identifier.name).toEqual('children');

    checkAstIsProperlySerializedAndDeserialized(ast as TSESTree.Program, protoMessage, 'foo.tsx');
  });

  test('should support JSXEmptyExpression nodes', async () => {
    const code = `<div>{}</div>`;
    const ast = await parseSourceCode(code, parsersMap.typescript, /* enableJsx */ true);
    const protoMessage = visitNode(ast as TSESTree.Program);

    assert.ok(protoMessage);

    const jsxElementNode = protoMessage.program.body[0].expressionStatement.expression;
    expect(jsxElementNode.type).toEqual(NODE_TYPE_ENUM.values['JSXElementType']);

    const jsxElement = jsxElementNode.jSXElement;
    expect(jsxElement.children.length).toEqual(1);

    const childNode = jsxElement.children[0];
    expect(childNode.type).toEqual(NODE_TYPE_ENUM.values['JSXExpressionContainerType']);

    const expressionContainer = childNode.jSXExpressionContainer;
    expect(expressionContainer.expression.type).toEqual(
      NODE_TYPE_ENUM.values['JSXEmptyExpressionType'],
    );
    expect(expressionContainer.expression.jSXEmptyExpression).toEqual({});

    checkAstIsProperlySerializedAndDeserialized(ast as TSESTree.Program, protoMessage, 'foo.tsx');
  });

  test('should support mixed JSX children types', async () => {
    const code = `<div>Hello {world}<Child/>{...items}</div>`;
    const ast = await parseSourceCode(code, parsersMap.typescript, /* enableJsx */ true);
    const protoMessage = visitNode(ast as TSESTree.Program);

    assert.ok(protoMessage);

    const jsxElementNode = protoMessage.program.body[0].expressionStatement.expression;
    expect(jsxElementNode.type).toEqual(NODE_TYPE_ENUM.values['JSXElementType']);

    const jsxElement = jsxElementNode.jSXElement;
    expect(jsxElement.children.length).toEqual(4);

    const textNode = jsxElement.children[0];
    expect(textNode.type).toEqual(NODE_TYPE_ENUM.values['JSXTextType']);

    const text = textNode.jSXText;
    expect(text.value).toEqual('Hello ');

    const exprContainerNode = jsxElement.children[1];
    expect(exprContainerNode.type).toEqual(NODE_TYPE_ENUM.values['JSXExpressionContainerType']);

    const expressionContainer = exprContainerNode.jSXExpressionContainer;
    expect(expressionContainer.expression.identifier.name).toEqual('world');

    const childElementNode = jsxElement.children[2];
    expect(childElementNode.type).toEqual(NODE_TYPE_ENUM.values['JSXElementType']);

    const childElement = childElementNode.jSXElement;
    expect(childElement.openingElement.jSXOpeningElement.name.jSXIdentifier.name).toEqual('Child');

    const spreadChildNode = jsxElement.children[3];
    expect(spreadChildNode.type).toEqual(NODE_TYPE_ENUM.values['JSXSpreadChildType']);

    const spreadChild = spreadChildNode.jSXSpreadChild;
    expect(spreadChild.expression.identifier.name).toEqual('items');

    checkAstIsProperlySerializedAndDeserialized(ast as TSESTree.Program, protoMessage, 'foo.tsx');
  });

  test('should support self-closing JSXElement', async () => {
    const code = `<Component/>`;
    const ast = await parseSourceCode(code, parsersMap.typescript, /* enableJsx */ true);
    const protoMessage = visitNode(ast as TSESTree.Program);

    assert.ok(protoMessage);

    const jsxElementNode = protoMessage.program.body[0].expressionStatement.expression;
    expect(jsxElementNode.type).toEqual(NODE_TYPE_ENUM.values['JSXElementType']);

    const jsxElement = jsxElementNode.jSXElement;
    expect(jsxElement.closingElement).toBeUndefined();
    expect(jsxElement.openingElement.jSXOpeningElement.selfClosing).toEqual(true);
    expect(jsxElement.children.length).toEqual(0);

    checkAstIsProperlySerializedAndDeserialized(ast as TSESTree.Program, protoMessage, 'foo.tsx');
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
        throw new TypeError(`Expected array for key ${key} in ${parsedAst.type}`);
      }
      expected = value.length;
      received = deserializedAst[key].length;
      if (expected !== received) {
        throw new Error(
          `Length mismatch for key ${key} in ${parsedAst.type}. Expected ${expected}, got ${received}`,
        );
      }
      for (const [i, element] of value.entries()) {
        compareASTs(element, deserializedAst[key][i]);
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
}

function areDifferent(a: unknown, b: unknown) {
  if (!a && !b) {
    return false;
  }
  return a !== b;
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
