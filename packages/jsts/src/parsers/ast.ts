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
import * as protobuf from 'protobufjs';
import * as path from 'node:path';
import { TSESTree } from '@typescript-eslint/utils';
import { debug } from '@sonar/shared';

const PATH_TO_PROTOFILE = path.join(__dirname, 'estree.proto');
const PROTO_ROOT = protobuf.loadSync(PATH_TO_PROTOFILE);
const NODE_TYPE = PROTO_ROOT.lookupType('Node');
const NODE_TYPE_ENUM = PROTO_ROOT.lookupEnum('NodeType');

export function serializeInProtobuf(ast: TSESTree.Program): Uint8Array {
  const protobufAST = parseInProtobuf(ast);
  return NODE_TYPE.encode(NODE_TYPE.create(protobufAST)).finish();
}

/**
 * Only used for tests
 */
export function parseInProtobuf(ast: TSESTree.Program) {
  const protobugShapedAST = visitNode(ast);
  const protobufType = PROTO_ROOT.lookupType('Node');
  return protobufType.create(protobugShapedAST);
}

/**
 * Only used for tests
 */
export function deserializeProtobuf(serialized: Uint8Array): any {
  const decoded = NODE_TYPE.decode(serialized);
  return decoded;
}

export function visitNode(node: TSESTree.Node | undefined | null): any {
  if (!node) {
    // Null and undefined will be both serialized as "not set" in protobuf when the field is optional.
    return undefined;
  }

  return {
    type: NODE_TYPE_ENUM.values[node.type + 'Type'],
    loc: node.loc,
    [lowerCaseFirstLetter(node.type)]: getProtobufShapeForNode(node),
  };

  function lowerCaseFirstLetter(str: string) {
    return str.charAt(0).toLowerCase() + str.slice(1);
  }

  function getProtobufShapeForNode(node: TSESTree.Node) {
    switch (node.type) {
      case 'Program':
        return visitProgram(node);
      case 'ExportAllDeclaration':
        return visitExportAllDeclaration(node);
      case 'Literal':
        // Special case: can be 'SimpleLiteral', 'RegExpLiteral', or 'BigIntLiteral'.
        return visitLiteral(node);
      case 'Identifier':
        return visitIdentifier(node);
      case 'ExportDefaultDeclaration':
        return visitExportDefaultDeclaration(node);
      case 'YieldExpression':
        return visitYieldExpression(node);
      case 'UpdateExpression':
        return visitUpdateExpression(node);
      case 'UnaryExpression':
        return visitUnaryExpression(node);
      case 'ThisExpression':
        return visitThisExpression(node);
      case 'TemplateLiteral':
        return visitTemplateLiteral(node);
      case 'TaggedTemplateExpression':
        return visitTaggedTemplateExpression(node);
      case 'SequenceExpression':
        return visitSequenceExpression(node);
      case 'ObjectExpression':
        return visitObjectExpression(node);
      case 'SpreadElement':
        return visitSpreadElement(node);
      case 'Property':
        return visitProperty(node);
      case 'AssignmentPattern':
        return visitAssignmentPattern(node);
      case 'RestElement':
        return visitRestElement(node);
      case 'ArrayPattern':
        return visitArrayPattern(node);
      case 'ObjectPattern':
        return visitObjectPattern(node);
      case 'PrivateIdentifier':
        return visitPrivateIdentifier(node);
      case 'NewExpression':
        return visitNewExpression(node);
      case 'Super':
        return visitSuper(node);
      case 'MetaProperty':
        return visitMetaProperty(node);
      case 'MemberExpression':
        return visitMemberExpression(node);
      case 'LogicalExpression':
        return visitLogicalExpression(node);
      case 'ImportExpression':
        return visitImportExpression(node);
      case 'BlockStatement':
        return visitBlockStatement(node);
      case 'ConditionalExpression':
        return visitConditionalExpression(node);
      case 'ClassExpression':
        return visitClassExpression(node);
      case 'ClassBody':
        return visitClassBody(node);
      case 'StaticBlock':
        return visitStaticBlock(node);
      case 'PropertyDefinition':
        return visitPropertyDefinition(node);
      case 'MethodDefinition':
        return visitMethodDefinition(node);
      case 'ChainExpression':
        return visitChainExpression(node);
      case 'CallExpression':
        return visitCallExpression(node);
      case 'BinaryExpression':
        return visitBinaryExpression(node);
      case 'AwaitExpression':
        return visitAwaitExpression(node);
      case 'AssignmentExpression':
        return visitAssignmentExpression(node);
      case 'ArrowFunctionExpression':
        return visitArrowFunctionExpression(node);
      case 'ArrayExpression':
        return visitArrayExpression(node);
      case 'ClassDeclaration':
        // Special case: the name is not the same as the type.
        return visitClassDeclaration(node);
      case 'FunctionDeclaration':
        // Special case: the name is not the same as the type.
        return visitFunctionDeclaration(node);
      case 'ExportNamedDeclaration':
        return visitExportNamedDeclaration(node);
      case 'ExportSpecifier':
        return visitExportSpecifier(node);
      case 'VariableDeclaration':
        return visitVariableDeclaration(node);
      case 'VariableDeclarator':
        return visitVariableDeclarator(node);
      case 'ImportDeclaration':
        return visitImportDeclaration(node);
      case 'ImportNamespaceSpecifier':
        return visitImportNamespaceSpecifier(node);
      case 'ImportDefaultSpecifier':
        return visitImportDefaultSpecifier(node);
      case 'ImportSpecifier':
        return visitImportSpecifier(node);
      case 'ForOfStatement':
        return visitForOfStatement(node);
      case 'ForInStatement':
        return visitForInStatement(node);
      case 'ForStatement':
        return visitForStatement(node);
      case 'DoWhileStatement':
        return visitDoWhileStatement(node);
      case 'WhileStatement':
        return visitWhileStatement(node);
      case 'TryStatement':
        return visitTryStatement(node);
      case 'CatchClause':
        return visitCatchClause(node);
      case 'ThrowStatement':
        return visitThrowStatement(node);
      case 'SwitchStatement':
        return visitSwitchStatement(node);
      case 'SwitchCase':
        return visitSwitchCase(node);
      case 'IfStatement':
        return visitIfStatement(node);
      case 'ContinueStatement':
        return visitContinueStatement(node);
      case 'BreakStatement':
        return visitBreakStatement(node);
      case 'LabeledStatement':
        return visitLabeledStatement(node);
      case 'ReturnStatement':
        return visitReturnStatement(node);
      case 'WithStatement':
        return visitWithStatement(node);
      case 'DebuggerStatement':
        return visitDebuggerStatement(node);
      case 'EmptyStatement':
        return visitEmptyStatement(node);
      case 'ExpressionStatement':
        // Special case: can be 'Directive' or 'ExpressionStatement'.
        return visitExpressionStatement(node);
      case 'TemplateElement':
        return visitTemplateElement(node);
      case 'FunctionExpression':
        return visitFunctionExpression(node);
      case 'AccessorProperty':
      case 'Decorator':
      case 'ImportAttribute':
      case 'JSXAttribute':
      case 'JSXClosingElement':
      case 'JSXClosingFragment':
      case 'JSXElement':
      case 'JSXEmptyExpression':
      case 'JSXExpressionContainer':
      case 'JSXFragment':
      case 'JSXIdentifier':
      case 'JSXMemberExpression':
      case 'JSXNamespacedName':
      case 'JSXOpeningElement':
      case 'JSXOpeningFragment':
      case 'JSXSpreadAttribute':
      case 'JSXSpreadChild':
      case 'JSXText':
      case 'TSAbstractAccessorProperty':
      case 'TSAbstractKeyword':
      case 'TSAbstractMethodDefinition':
      case 'TSAbstractPropertyDefinition':
      case 'TSAnyKeyword':
      case 'TSArrayType':
      case 'TSAsExpression':
      case 'TSAsyncKeyword':
      case 'TSBigIntKeyword':
      case 'TSBooleanKeyword':
      case 'TSCallSignatureDeclaration':
      case 'TSClassImplements':
      case 'TSConditionalType':
      case 'TSConstructorType':
      case 'TSConstructSignatureDeclaration':
      case 'TSDeclareFunction':
      case 'TSDeclareKeyword':
      case 'TSEmptyBodyFunctionExpression':
      case 'TSEnumDeclaration':
      case 'TSEnumMember':
      case 'TSExportAssignment':
      case 'TSExportKeyword':
      case 'TSExternalModuleReference':
      case 'TSFunctionType':
      case 'TSInstantiationExpression':
      case 'TSImportEqualsDeclaration':
      case 'TSImportType':
      case 'TSIndexedAccessType':
      case 'TSIndexSignature':
      case 'TSInferType':
      case 'TSInterfaceBody':
      case 'TSInterfaceDeclaration':
      case 'TSInterfaceHeritage':
      case 'TSIntersectionType':
      case 'TSIntrinsicKeyword':
      case 'TSLiteralType':
      case 'TSMappedType':
      case 'TSMethodSignature':
      case 'TSModuleBlock':
      case 'TSModuleDeclaration':
      case 'TSNamedTupleMember':
      case 'TSNamespaceExportDeclaration':
      case 'TSNeverKeyword':
      case 'TSNonNullExpression':
      case 'TSNullKeyword':
      case 'TSNumberKeyword':
      case 'TSObjectKeyword':
      case 'TSOptionalType':
      case 'TSParameterProperty':
      case 'TSPrivateKeyword':
      case 'TSPropertySignature':
      case 'TSProtectedKeyword':
      case 'TSPublicKeyword':
      case 'TSQualifiedName':
      case 'TSReadonlyKeyword':
      case 'TSRestType':
      case 'TSSatisfiesExpression':
      case 'TSStaticKeyword':
      case 'TSStringKeyword':
      case 'TSSymbolKeyword':
      case 'TSTemplateLiteralType':
      case 'TSThisType':
      case 'TSTupleType':
      case 'TSTypeAliasDeclaration':
      case 'TSTypeAnnotation':
      case 'TSTypeAssertion':
      case 'TSTypeLiteral':
      case 'TSTypeOperator':
      case 'TSTypeParameter':
      case 'TSTypeParameterDeclaration':
      case 'TSTypeParameterInstantiation':
      case 'TSTypePredicate':
      case 'TSTypeQuery':
      case 'TSTypeReference':
      case 'TSUndefinedKeyword':
      case 'TSUnionType':
      case 'TSUnknownKeyword':
      case 'TSVoidKeyword': {
        // visitUnknownNode()
        debug(`Unknown node type: ${node.type}`);
        break;
      }
      default: {
        // visitUnknownNode()
        debug(`Unknown node type: ${node.type}`);
      }
    }
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
    return {
      expression: visitNode(node.expression),
      directive: node.directive,
    };
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
}
