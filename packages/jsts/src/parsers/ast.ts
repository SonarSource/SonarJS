/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
import protobuf from 'protobufjs';
import base64 from '@protobufjs/base64';
import type { TSESTree } from '@typescript-eslint/utils';

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { debug } from '../../../shared/src/helpers/logging.js';
import type { NormalizedAbsolutePath } from '../rules/helpers/index.js';

const PATH_TO_PROTOFILE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'estree.proto');
const PROTO_ROOT = protobuf.loadSync(PATH_TO_PROTOFILE);
const NODE_TYPE = PROTO_ROOT.lookupType('Node');
export const NODE_TYPE_ENUM = PROTO_ROOT.lookupEnum('NodeType');
const unsupportedNodeTypes = new Map<string, number>();

export function serializeInProtobuf(
  ast: TSESTree.Program,
  filePath: NormalizedAbsolutePath,
): string {
  unsupportedNodeTypes.clear();
  const protobufAST = parseInProtobuf(ast);
  if (unsupportedNodeTypes.size > 0) {
    debug(
      `Not supported syntax nodes in file "${filePath}": ` +
        Array.from(unsupportedNodeTypes)
          .map(([key, value]) => `${key}(${value})`)
          .join(', '),
    );
  }
  const binaryArray = NODE_TYPE.encode(NODE_TYPE.create(protobufAST)).finish();
  return base64.encode(binaryArray, 0, binaryArray.length);
}

/**
 * Only used for tests
 */
export function parseInProtobuf(ast: TSESTree.Program) {
  const protobufShapedAST = visitNode(ast);
  const protobufType = PROTO_ROOT.lookupType('Node');
  return protobufType.create(protobufShapedAST);
}

/**
 * Only used for tests
 */
export function deserializeProtobuf(serialized: string): any {
  const computedLength = base64.length(serialized);
  const buffer = new Uint8Array(computedLength);
  base64.decode(serialized, buffer, 0);
  return NODE_TYPE.decode(buffer);
}

// Exported for testing purpose
export type VisitNodeReturnType = {
  type: number;
  loc: TSESTree.SourceLocation;
  [key: string]: any;
};

export function visitNode(node: TSESTree.Node | undefined | null): VisitNodeReturnType | undefined {
  if (!node) {
    // Null and undefined will be both serialized as "not set" in protobuf when the field is optional.
    return undefined;
  }

  return getProtobufShapeForNode(node);
}

function getProtobufShapeForNode(node: TSESTree.Node) {
  let shape: any;
  switch (node.type) {
    case 'Program':
      shape = visitProgram(node);
      break;
    case 'ExportAllDeclaration':
      shape = visitExportAllDeclaration(node);
      break;
    case 'Literal':
      // Special case: can be 'SimpleLiteral', 'RegExpLiteral', or 'BigIntLiteral'.
      shape = visitLiteral(node);
      break;
    case 'Identifier':
      shape = visitIdentifier(node);
      break;
    case 'ExportDefaultDeclaration':
      shape = visitExportDefaultDeclaration(node);
      break;
    case 'YieldExpression':
      shape = visitYieldExpression(node);
      break;
    case 'UpdateExpression':
      shape = visitUpdateExpression(node);
      break;
    case 'UnaryExpression':
      shape = visitUnaryExpression(node);
      break;
    case 'ThisExpression':
      shape = visitThisExpression(node);
      break;
    case 'TemplateLiteral':
      shape = visitTemplateLiteral(node);
      break;
    case 'TaggedTemplateExpression':
      shape = visitTaggedTemplateExpression(node);
      break;
    case 'SequenceExpression':
      shape = visitSequenceExpression(node);
      break;
    case 'ObjectExpression':
      shape = visitObjectExpression(node);
      break;
    case 'SpreadElement':
      shape = visitSpreadElement(node);
      break;
    case 'Property':
      shape = visitProperty(node);
      break;
    case 'AssignmentPattern':
      shape = visitAssignmentPattern(node);
      break;
    case 'RestElement':
      shape = visitRestElement(node);
      break;
    case 'ArrayPattern':
      shape = visitArrayPattern(node);
      break;
    case 'ObjectPattern':
      shape = visitObjectPattern(node);
      break;
    case 'PrivateIdentifier':
      shape = visitPrivateIdentifier(node);
      break;
    case 'NewExpression':
      shape = visitNewExpression(node);
      break;
    case 'Super':
      shape = visitSuper(node);
      break;
    case 'MetaProperty':
      shape = visitMetaProperty(node);
      break;
    case 'MemberExpression':
      shape = visitMemberExpression(node);
      break;
    case 'LogicalExpression':
      shape = visitLogicalExpression(node);
      break;
    case 'ImportExpression':
      shape = visitImportExpression(node);
      break;
    case 'BlockStatement':
      shape = visitBlockStatement(node);
      break;
    case 'ConditionalExpression':
      shape = visitConditionalExpression(node);
      break;
    case 'ClassExpression':
      shape = visitClassExpression(node);
      break;
    case 'ClassBody':
      shape = visitClassBody(node);
      break;
    case 'StaticBlock':
      shape = visitStaticBlock(node);
      break;
    case 'PropertyDefinition':
      shape = visitPropertyDefinition(node);
      break;
    case 'MethodDefinition':
      shape = visitMethodDefinition(node);
      break;
    case 'ChainExpression':
      shape = visitChainExpression(node);
      break;
    case 'CallExpression':
      shape = visitCallExpression(node);
      break;
    case 'BinaryExpression':
      shape = visitBinaryExpression(node);
      break;
    case 'AwaitExpression':
      shape = visitAwaitExpression(node);
      break;
    case 'AssignmentExpression':
      shape = visitAssignmentExpression(node);
      break;
    case 'ArrowFunctionExpression':
      shape = visitArrowFunctionExpression(node);
      break;
    case 'ArrayExpression':
      shape = visitArrayExpression(node);
      break;
    case 'ClassDeclaration':
      // Special case: the name is not the same as the type.
      shape = visitClassDeclaration(node);
      break;
    case 'FunctionDeclaration':
      // Special case: the name is not the same as the type.
      shape = visitFunctionDeclaration(node);
      break;
    case 'ExportNamedDeclaration':
      shape = visitExportNamedDeclaration(node);
      break;
    case 'ExportSpecifier':
      shape = visitExportSpecifier(node);
      break;
    case 'VariableDeclaration':
      shape = visitVariableDeclaration(node);
      break;
    case 'VariableDeclarator':
      shape = visitVariableDeclarator(node);
      break;
    case 'ImportDeclaration':
      shape = visitImportDeclaration(node);
      break;
    case 'ImportNamespaceSpecifier':
      shape = visitImportNamespaceSpecifier(node);
      break;
    case 'ImportDefaultSpecifier':
      shape = visitImportDefaultSpecifier(node);
      break;
    case 'ImportSpecifier':
      shape = visitImportSpecifier(node);
      break;
    case 'ForOfStatement':
      shape = visitForOfStatement(node);
      break;
    case 'ForInStatement':
      shape = visitForInStatement(node);
      break;
    case 'ForStatement':
      shape = visitForStatement(node);
      break;
    case 'DoWhileStatement':
      shape = visitDoWhileStatement(node);
      break;
    case 'WhileStatement':
      shape = visitWhileStatement(node);
      break;
    case 'TryStatement':
      shape = visitTryStatement(node);
      break;
    case 'CatchClause':
      shape = visitCatchClause(node);
      break;
    case 'ThrowStatement':
      shape = visitThrowStatement(node);
      break;
    case 'SwitchStatement':
      shape = visitSwitchStatement(node);
      break;
    case 'SwitchCase':
      shape = visitSwitchCase(node);
      break;
    case 'IfStatement':
      shape = visitIfStatement(node);
      break;
    case 'ContinueStatement':
      shape = visitContinueStatement(node);
      break;
    case 'BreakStatement':
      shape = visitBreakStatement(node);
      break;
    case 'LabeledStatement':
      shape = visitLabeledStatement(node);
      break;
    case 'ReturnStatement':
      shape = visitReturnStatement(node);
      break;
    case 'WithStatement':
      shape = visitWithStatement(node);
      break;
    case 'DebuggerStatement':
      shape = visitDebuggerStatement(node);
      break;
    case 'EmptyStatement':
      shape = visitEmptyStatement(node);
      break;
    case 'TSExportAssignment':
      shape = visitExportAssignment(node);
      break;
    case 'ExpressionStatement':
      // Special case: can be 'Directive' or 'ExpressionStatement'.
      shape = visitExpressionStatement(node);
      break;
    case 'TemplateElement':
      shape = visitTemplateElement(node);
      break;
    case 'FunctionExpression':
      shape = visitFunctionExpression(node);
      break;
    case 'TSAsExpression':
      // skipping node
      return visitNode(node.expression);
    case 'TSSatisfiesExpression':
      // skipping node
      return visitNode(node.expression);
    case 'TSNonNullExpression':
      // skipping node
      return visitNode(node.expression);
    case 'TSTypeAssertion':
      // skipping node
      return visitNode(node.expression);
    case 'TSParameterProperty':
      shape = visitTSParameterProperty(node);
      break;
    case 'TSImportEqualsDeclaration':
      shape = visitTSImportEqualsDeclaration(node);
      break;
    case 'TSQualifiedName':
      shape = visitTSQualifiedName(node);
      break;
    case 'TSExternalModuleReference':
      shape = visitTSExternalModuleReference(node);
      break;
    case 'TSModuleBlock':
      shape = visitTSModuleBlock(node);
      break;
    case 'TSModuleDeclaration':
      shape = visitTSModuleDeclaration(node);
      break;
    // JSX node types
    case 'JSXElement':
      shape = visitJSXElement(node);
      break;
    case 'JSXFragment':
      shape = visitJSXFragment(node);
      break;
    case 'JSXOpeningElement':
      shape = visitJSXOpeningElement(node);
      break;
    case 'JSXClosingElement':
      shape = visitJSXClosingElement(node);
      break;
    case 'JSXOpeningFragment':
      shape = visitJSXOpeningFragment(node);
      break;
    case 'JSXClosingFragment':
      shape = visitJSXClosingFragment(node);
      break;
    case 'JSXAttribute':
      shape = visitJSXAttribute(node);
      break;
    case 'JSXIdentifier':
      shape = visitJSXIdentifier(node);
      break;
    case 'JSXMemberExpression':
      shape = visitJSXMemberExpression(node);
      break;
    case 'JSXNamespacedName':
      shape = visitJSXNamespacedName(node);
      break;
    case 'JSXSpreadAttribute':
      shape = visitJSXSpreadAttribute(node);
      break;
    case 'JSXExpressionContainer':
      shape = visitJSXExpressionContainer(node);
      break;
    case 'JSXSpreadChild':
      shape = visitJSXSpreadChild(node);
      break;
    case 'JSXText':
      shape = visitJSXText(node);
      break;
    case 'JSXEmptyExpression':
      shape = visitJSXEmptyExpression(node);
      break;
    case 'TSTypeAliasDeclaration':
    case 'TSInterfaceDeclaration':
    case 'TSEmptyBodyFunctionExpression':
    case 'TSEnumDeclaration':
    case 'TSDeclareFunction':
    case 'TSAbstractMethodDefinition':
    case 'TSTypeParameterInstantiation':
      shape = {};
      break;
    default:
      unsupportedNodeTypes.set(node.type, (unsupportedNodeTypes.get(node.type) ?? 0) + 1);
      shape = {};
  }
  // Visiting UnknownNodeTypes can cause the failure of the ESTreeFactory. For this reason where possible (for example in the arrays) we try to remove them.
  for (const key in shape) {
    if (Array.isArray(shape[key])) {
      shape[key] = shape[key].filter(
        node => node?.type !== NODE_TYPE_ENUM.values['UnknownNodeType'],
      );
    }
  }
  return {
    type: NODE_TYPE_ENUM.values[node.type + 'Type'] ?? NODE_TYPE_ENUM.values['UnknownNodeType'],
    loc: node.loc,
    [lowerCaseFirstLetter(node.type)]: shape,
  };
}

function visitProgram(node: TSESTree.Program) {
  return {
    sourceType: node.sourceType,
    body: node.body.map(visitNode),
  };
}

function visitExportAllDeclaration(node: TSESTree.ExportAllDeclaration) {
  return {
    exported: visitNode(node.exported),
    source: visitNode(node.source),
  };
}

function visitLiteral(node: TSESTree.Literal) {
  if ('bigint' in node) {
    return {
      value: node.value,
      bigInt: node.bigint,
      raw: node.raw,
    };
  } else if ('regex' in node) {
    return {
      flags: node.regex.flags,
      pattern: node.regex.pattern,
      raw: node.raw,
    };
  } else {
    // simple literal
    return { raw: node.raw, ...translateValue(node.value) };
  }
}

function translateValue(value: string | number | boolean | null) {
  if (typeof value === 'string') {
    return { valueString: value };
  }
  if (typeof value === 'number') {
    return { valueNumber: value };
  }
  if (typeof value === 'boolean') {
    return { valueBoolean: value };
  }
  // The null value is represented by the TS language value 'null'.
  if (value === null) {
    return {};
  }
}

function visitIdentifier(node: TSESTree.Identifier) {
  return {
    name: node.name,
  };
}

function visitExportDefaultDeclaration(node: TSESTree.ExportDefaultDeclaration) {
  return {
    declaration: visitNode(node.declaration),
  };
}

function visitYieldExpression(node: TSESTree.YieldExpression) {
  return {
    argument: visitNode(node.argument),
    delegate: node.delegate,
  };
}

function visitUpdateExpression(node: TSESTree.UpdateExpression) {
  return {
    operator: node.operator,
    argument: visitNode(node.argument),
    prefix: node.prefix,
  };
}

function visitUnaryExpression(node: TSESTree.UnaryExpression) {
  return {
    operator: node.operator,
    argument: visitNode(node.argument),
    prefix: node.prefix,
  };
}

function visitThisExpression(_node: TSESTree.ThisExpression) {
  return {};
}

function visitTemplateLiteral(node: TSESTree.TemplateLiteral) {
  return {
    quasis: node.quasis.map(visitNode),
    expressions: node.expressions.map(visitNode),
  };
}

function visitTaggedTemplateExpression(node: TSESTree.TaggedTemplateExpression) {
  return {
    tag: visitNode(node.tag),
    quasi: visitNode(node.quasi),
  };
}

function visitSequenceExpression(node: TSESTree.SequenceExpression) {
  return {
    expressions: node.expressions.map(visitNode),
  };
}

function visitObjectExpression(node: TSESTree.ObjectExpression) {
  return {
    properties: node.properties.map(visitNode),
  };
}

function visitSpreadElement(node: TSESTree.SpreadElement) {
  return {
    argument: visitNode(node.argument),
  };
}

function visitProperty(node: TSESTree.Property) {
  return {
    key: visitNode(node.key),
    value: visitNode(node.value),
    kind: node.kind,
    method: node.method,
    shorthand: node.shorthand,
    computed: node.computed,
  };
}

function visitAssignmentPattern(node: TSESTree.AssignmentPattern) {
  return {
    left: visitNode(node.left),
    right: visitNode(node.right),
  };
}

function visitRestElement(node: TSESTree.RestElement) {
  return {
    argument: visitNode(node.argument),
  };
}

function visitArrayPattern(node: TSESTree.ArrayPattern) {
  // When an entry is empty, it is represented as null in the array.
  return {
    elements: node.elements.map(visitArrayElement),
  };
}

function visitObjectPattern(node: TSESTree.ObjectPattern) {
  return {
    properties: node.properties.map(visitNode),
  };
}

function visitPrivateIdentifier(node: TSESTree.PrivateIdentifier) {
  return {
    name: node.name,
  };
}

function visitExportAssignment(node: TSESTree.TSExportAssignment) {
  return {
    expression: visitNode(node.expression),
  };
}

function visitNewExpression(node: TSESTree.NewExpression) {
  return {
    callee: visitNode(node.callee),
    arguments: node.arguments.map(visitNode),
  };
}

function visitSuper(_node: TSESTree.Super) {
  return {};
}

function visitMetaProperty(node: TSESTree.MetaProperty) {
  return {
    meta: visitNode(node.meta),
    property: visitNode(node.property),
  };
}

function visitMemberExpression(node: TSESTree.MemberExpression) {
  return {
    object: visitNode(node.object),
    property: visitNode(node.property),
    computed: node.computed,
    optional: node.optional,
  };
}

function visitLogicalExpression(node: TSESTree.LogicalExpression) {
  return {
    operator: node.operator,
    left: visitNode(node.left),
    right: visitNode(node.right),
  };
}

function visitImportExpression(node: TSESTree.ImportExpression) {
  return {
    source: visitNode(node.source),
  };
}

function visitBlockStatement(node: TSESTree.BlockStatement) {
  return {
    body: node.body.map(visitNode),
  };
}

function visitConditionalExpression(node: TSESTree.ConditionalExpression) {
  return {
    test: visitNode(node.test),
    consequent: visitNode(node.consequent),
    alternate: visitNode(node.alternate),
  };
}

function visitClassExpression(node: TSESTree.ClassExpression) {
  return {
    id: visitNode(node.id),
    superClass: visitNode(node.superClass),
    body: visitNode(node.body),
  };
}

function visitClassBody(node: TSESTree.ClassBody) {
  return {
    body: node.body.map(visitNode),
  };
}

function visitStaticBlock(node: TSESTree.StaticBlock) {
  return {
    body: node.body.map(visitNode),
  };
}

function visitPropertyDefinition(node: TSESTree.PropertyDefinition) {
  return {
    key: visitNode(node.key),
    value: visitNode(node.value),
    computed: node.computed,
    static: node.static,
  };
}

function visitMethodDefinition(node: TSESTree.MethodDefinition) {
  return {
    key: visitNode(node.key),
    value: visitNode(node.value),
    kind: node.kind,
    computed: node.computed,
    static: node.static,
  };
}

function visitChainExpression(node: TSESTree.ChainExpression) {
  return {
    expression: visitNode(node.expression),
  };
}

function visitCallExpression(node: TSESTree.CallExpression) {
  return {
    optional: node.optional,
    callee: visitNode(node.callee),
    arguments: node.arguments.map(visitNode),
  };
}

function visitBinaryExpression(node: TSESTree.BinaryExpression) {
  return {
    operator: node.operator,
    left: visitNode(node.left),
    right: visitNode(node.right),
  };
}

function visitAwaitExpression(node: TSESTree.AwaitExpression) {
  return {
    argument: visitNode(node.argument),
  };
}

function visitAssignmentExpression(node: TSESTree.AssignmentExpression) {
  return {
    operator: node.operator,
    left: visitNode(node.left),
    right: visitNode(node.right),
  };
}

function visitArrowFunctionExpression(node: TSESTree.ArrowFunctionExpression) {
  return {
    expression: node.expression,
    body: visitNode(node.body),
    params: node.params.map(visitNode),
    generator: node.generator,
    async: node.async,
  };
}

function visitArrayExpression(node: TSESTree.ArrayExpression) {
  // When an entry is empty, it is represented as null in the array.
  return {
    elements: node.elements.map(visitArrayElement),
  };
}

function visitArrayElement(
  element: TSESTree.DestructuringPattern | TSESTree.Expression | TSESTree.SpreadElement | null,
) {
  return {
    element: visitNode(element),
  };
}

function visitClassDeclaration(node: TSESTree.ClassDeclaration) {
  return {
    id: visitNode(node.id),
    superClass: visitNode(node.superClass),
    body: visitNode(node.body),
  };
}

function visitFunctionDeclaration(node: TSESTree.FunctionDeclaration) {
  return {
    id: visitNode(node.id),
    body: visitNode(node.body),
    params: node.params.map(visitNode),
    generator: node.generator,
    async: node.async,
  };
}

function visitExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {
  return {
    declaration: visitNode(node.declaration),
    specifiers: node.specifiers.map(visitNode),
    source: visitNode(node.source),
  };
}

function visitExportSpecifier(node: TSESTree.ExportSpecifier) {
  return {
    exported: visitNode(node.exported),
    local: visitNode(node.local),
  };
}

function visitVariableDeclaration(node: TSESTree.VariableDeclaration) {
  return {
    declarations: node.declarations.map(visitNode),
    kind: node.kind,
  };
}

function visitVariableDeclarator(node: TSESTree.VariableDeclarator) {
  return {
    id: visitNode(node.id),
    init: visitNode(node.init),
  };
}

function visitImportDeclaration(node: TSESTree.ImportDeclaration) {
  return {
    specifiers: node.specifiers.map(visitNode),
    source: visitNode(node.source),
  };
}

function visitImportNamespaceSpecifier(node: TSESTree.ImportNamespaceSpecifier) {
  return {
    local: visitNode(node.local),
  };
}

function visitImportDefaultSpecifier(node: TSESTree.ImportDefaultSpecifier) {
  return {
    local: visitNode(node.local),
  };
}

function visitImportSpecifier(node: TSESTree.ImportSpecifier) {
  return {
    imported: visitNode(node.imported),
    local: visitNode(node.local),
  };
}

function visitForOfStatement(node: TSESTree.ForOfStatement) {
  return {
    await: node.await,
    left: visitNode(node.left),
    right: visitNode(node.right),
    body: visitNode(node.body),
  };
}

function visitForInStatement(node: TSESTree.ForInStatement) {
  return {
    left: visitNode(node.left),
    right: visitNode(node.right),
    body: visitNode(node.body),
  };
}

function visitForStatement(node: TSESTree.ForStatement) {
  return {
    init: visitNode(node.init),
    test: visitNode(node.test),
    update: visitNode(node.update),
    body: visitNode(node.body),
  };
}

function visitDoWhileStatement(node: TSESTree.DoWhileStatement) {
  return {
    body: visitNode(node.body),
    test: visitNode(node.test),
  };
}

function visitWhileStatement(node: TSESTree.WhileStatement) {
  return {
    test: visitNode(node.test),
    body: visitNode(node.body),
  };
}

function visitTryStatement(node: TSESTree.TryStatement) {
  return {
    block: visitNode(node.block),
    handler: visitNode(node.handler),
    finalizer: visitNode(node.finalizer),
  };
}

function visitCatchClause(node: TSESTree.CatchClause) {
  return {
    param: visitNode(node.param),
    body: visitNode(node.body),
  };
}

function visitThrowStatement(node: TSESTree.ThrowStatement) {
  return {
    argument: visitNode(node.argument),
  };
}

function visitSwitchStatement(node: TSESTree.SwitchStatement) {
  return {
    discriminant: visitNode(node.discriminant),
    cases: node.cases.map(visitNode),
  };
}

function visitSwitchCase(node: TSESTree.SwitchCase) {
  return {
    test: visitNode(node.test),
    consequent: node.consequent.map(visitNode),
  };
}

function visitIfStatement(node: TSESTree.IfStatement) {
  return {
    test: visitNode(node.test),
    consequent: visitNode(node.consequent),
    alternate: visitNode(node.alternate),
  };
}

function visitContinueStatement(node: TSESTree.ContinueStatement) {
  return {
    label: visitNode(node.label),
  };
}

function visitBreakStatement(node: TSESTree.BreakStatement) {
  return {
    label: visitNode(node.label),
  };
}

function visitLabeledStatement(node: TSESTree.LabeledStatement) {
  return {
    label: visitNode(node.label),
    body: visitNode(node.body),
  };
}

function visitReturnStatement(node: TSESTree.ReturnStatement) {
  return {
    argument: visitNode(node.argument),
  };
}

function visitWithStatement(node: TSESTree.WithStatement) {
  return {
    object: visitNode(node.object),
    body: visitNode(node.body),
  };
}

function visitDebuggerStatement(_node: TSESTree.DebuggerStatement) {
  return {};
}

function visitEmptyStatement(_node: TSESTree.EmptyStatement) {
  return {};
}

function visitExpressionStatement(node: TSESTree.ExpressionStatement) {
  if (node.directive === undefined) {
    return {
      expression: visitNode(node.expression),
    };
  } else {
    return {
      expression: visitNode(node.expression),
      directive: node.directive,
    };
  }
}

function visitTemplateElement(node: TSESTree.TemplateElement) {
  return {
    tail: node.tail,
    cooked: node.value.cooked,
    raw: node.value.raw,
  };
}

function visitFunctionExpression(node: TSESTree.FunctionExpression) {
  return {
    id: visitNode(node.id),
    body: visitNode(node.body),
    params: node.params.map(visitNode),
    generator: node.generator,
    async: node.async,
  };
}

function visitTSImportEqualsDeclaration(node: TSESTree.TSImportEqualsDeclaration) {
  return {
    id: visitNode(node.id),
    moduleReference: visitNode(node.moduleReference),
    importKind: node.importKind,
  };
}

function visitTSQualifiedName(node: TSESTree.TSQualifiedName) {
  return {
    left: visitNode(node.left),
    right: visitNode(node.right),
  };
}

function visitTSExternalModuleReference(node: TSESTree.TSExternalModuleReference) {
  return {
    expression: visitNode(node.expression),
  };
}

function visitTSModuleBlock(node: TSESTree.TSModuleBlock) {
  return {
    body: node.body.map(visitNode),
  };
}

function visitTSModuleDeclaration(node: TSESTree.TSModuleDeclaration) {
  return {
    id: visitNode(node.id),
    body: visitNode(node.body),
    kind: node.kind,
  };
}

function visitTSParameterProperty(node: TSESTree.TSParameterProperty) {
  return {
    accessibility: node.accessibility,
    readonly: node.readonly,
    parameter: visitNode(node.parameter),
  };
}

// Exported for testing purpose
export function lowerCaseFirstLetter(str: string) {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

function visitJSXElement(node: TSESTree.JSXElement) {
  /*
   * export interface JSXElement extends BaseNode {
   *   type: AST_NODE_TYPES.JSXElement;
   *   children: JSXChild[];
   *   closingElement: JSXClosingElement | null;
   *   openingElement: JSXOpeningElement;
   * }
   */
  return {
    openingElement: visitNode(node.openingElement),
    closingElement: visitNode(node.closingElement),
    children: node.children.map(visitNode),
  };
}
function visitJSXFragment(node: TSESTree.JSXFragment) {
  /*
   * export interface JSXFragment extends BaseNode {
   *   type: AST_NODE_TYPES.JSXFragment;
   *   children: JSXChild[];
   *   closingFragment: JSXClosingFragment;
   *   openingFragment: JSXOpeningFragment;
   * }
   */
  return {
    openingFragment: visitNode(node.openingFragment),
    closingFragment: visitNode(node.closingFragment),
    children: node.children.map(visitNode),
  };
}
function visitJSXOpeningElement(node: TSESTree.JSXOpeningElement) {
  /*
   * export interface JSXOpeningElement extends BaseNode {
   *   type: AST_NODE_TYPES.JSXOpeningElement;
   *   attributes: (JSXAttribute | JSXSpreadAttribute)[];
   *   name: JSXTagNameExpression;
   *   selfClosing: boolean;
   *   typeArguments: TSTypeParameterInstantiation | undefined;
   * }
   */
  return {
    name: visitNode(node.name),
    attributes: node.attributes.map(visitNode),
    selfClosing: node.selfClosing,
    typeArguments: visitNode(node.typeArguments),
  };
}
function visitJSXClosingElement(node: TSESTree.JSXClosingElement) {
  /*
   * export interface JSXClosingElement extends BaseNode {
   *   type: AST_NODE_TYPES.JSXClosingElement;
   *   name: JSXIdentifier | JSXMemberExpression | JSXNamespacedName;
   * }
   */
  return {
    name: visitNode(node.name),
  };
}
function visitJSXOpeningFragment(_node: TSESTree.JSXOpeningFragment) {
  /*
   * export interface JSXOpeningFragment extends BaseNode {
   *   type: AST_NODE_TYPES.JSXOpeningFragment;
   * }
   */
  return {};
}
function visitJSXClosingFragment(_node: TSESTree.JSXClosingFragment) {
  /*
   * export interface JSXClosingFragment extends BaseNode {
   *   type: AST_NODE_TYPES.JSXClosingFragment;
   * }
   */
  return {};
}
function visitJSXAttribute(node: TSESTree.JSXAttribute) {
  /*
   * export interface JSXAttribute extends BaseNode {
   *   type: AST_NODE_TYPES.JSXAttribute;
   *   name: JSXIdentifier | JSXNamespacedName;
   *   value: JSXElement | JSXExpression | Literal | null;
   * }
   */
  return {
    name: visitNode(node.name),
    value: visitNode(node.value),
  };
}
function visitJSXIdentifier(node: TSESTree.JSXIdentifier) {
  /*
   * export interface JSXIdentifier extends BaseNode {
   *   type: AST_NODE_TYPES.JSXIdentifier;
   *   name: string;
   * }
   */
  return {
    name: node.name,
  };
}
function visitJSXMemberExpression(node: TSESTree.JSXMemberExpression) {
  /*
   * export interface JSXMemberExpression extends BaseNode {
   *   type: AST_NODE_TYPES.JSXMemberExpression;
   *   object: JSXTagNameExpression;
   *   property: JSXIdentifier;
   * }
   */
  return {
    object: visitNode(node.object),
    property: visitNode(node.property),
  };
}
function visitJSXNamespacedName(node: TSESTree.JSXNamespacedName) {
  /*
   * export interface JSXNamespacedName extends BaseNode {
   *   type: AST_NODE_TYPES.JSXNamespacedName;
   *   name: JSXIdentifier;
   *   namespace: JSXIdentifier;
   * }
   */
  return {
    name: visitNode(node.name),
    namespace: visitNode(node.namespace),
  };
}
function visitJSXSpreadAttribute(node: TSESTree.JSXSpreadAttribute) {
  /*
   * export interface JSXSpreadAttribute extends BaseNode {
   *   type: AST_NODE_TYPES.JSXSpreadAttribute;
   *   argument: Expression;
   * }
   */
  return {
    argument: visitNode(node.argument),
  };
}
function visitJSXExpressionContainer(node: TSESTree.JSXExpressionContainer) {
  /*
   * export interface JSXExpressionContainer extends BaseNode {
   *   type: AST_NODE_TYPES.JSXExpressionContainer;
   *   expression: Expression | JSXEmptyExpression;
   * }
   */
  return {
    expression: visitNode(node.expression),
  };
}
function visitJSXSpreadChild(node: TSESTree.JSXSpreadChild) {
  /*
   * export interface JSXSpreadChild extends BaseNode {
   *   type: AST_NODE_TYPES.JSXSpreadChild;
   *   expression: Expression | JSXEmptyExpression;
   * }
   */
  return {
    expression: visitNode(node.expression),
  };
}
function visitJSXText(node: TSESTree.JSXText) {
  /*
   * export interface JSXText extends BaseNode {
   *   type: AST_NODE_TYPES.JSXText;
   *   raw: string;
   *   value: string;
   * }
   */
  return {
    raw: node.raw,
    value: node.value,
  };
}
function visitJSXEmptyExpression(_node: TSESTree.JSXEmptyExpression) {
  /*
   * export interface JSXEmptyExpression extends BaseNode {
   *   type: AST_NODE_TYPES.JSXEmptyExpression;
   * }
   */
  return {};
}
