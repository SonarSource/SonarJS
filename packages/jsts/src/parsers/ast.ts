import * as protobuf from 'protobufjs';
import * as path from 'node:path';
import * as _ from 'lodash';
import * as estree from 'estree';
import { SourceCode } from 'eslint';

const PATH_TO_PROTOFILE = path.join(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'tools',
  'estree',
  'output',
  'estree.proto',
);
const PROTO_ROOT = protobuf.loadSync(PATH_TO_PROTOFILE);
const NODE_TYPE = PROTO_ROOT.lookupType('Node');

export function deserialize(proto: protobuf.Message | {}): any {
  if (!proto) return {};
  const serialized = NODE_TYPE.encode(proto).finish();
  const decoded = NODE_TYPE.decode(serialized);
  return decoded;
}

export function serializeInProtobuf(sourceCode: SourceCode) {
  const protobugShapedAST = visitNode(sourceCode.ast);
  const protobufType = PROTO_ROOT.lookupType('Node');
  return protobufType.create(protobugShapedAST);
}

export function visitNode(node: estree.BaseNodeWithoutComments | undefined | null): any {
  if (!node) {
    return {};
  }

  const nodeOrTypeAndNode = getProtobufShapeForNode(node);
  // The same type can be used for different nodes, we need an extra logic to create the correct message.
  let messageType;
  let protobufMessageNode;
  if ('node' in nodeOrTypeAndNode && 'protobufMessageType' in nodeOrTypeAndNode.node) {
    messageType = nodeOrTypeAndNode.protobufMessageType;
    protobufMessageNode = nodeOrTypeAndNode.node;
  } else {
    messageType = node.type;
    protobufMessageNode = nodeOrTypeAndNode;
  }

  return {
    type: messageType + 'Type',
    loc: node.loc,
    [lowerCaseFirstLetter(messageType)]: protobufMessageNode,
  };

  function lowerCaseFirstLetter(str: string) {
    return str.charAt(0).toLowerCase() + str.slice(1);
  }

  function getProtobufShapeForNode(node: estree.BaseNodeWithoutComments): any {
    switch (node.type) {
      case 'Program':
        return visitProgram(node as estree.Program);
      case 'ExportAllDeclaration':
        return visitExportAllDeclaration(node as estree.ExportAllDeclaration);
      case 'Literal':
        // Special case: can be 'SimpleLiteral', 'RegExpLiteral', or 'BigIntLiteral'.
        return visitLiteral(node as estree.Literal);
      case 'Identifier':
        return visitIdentifier(node as estree.Identifier);
      case 'ExportDefaultDeclaration':
        return visitExportDefaultDeclaration(node as estree.ExportDefaultDeclaration);
      case 'YieldExpression':
        return visitYieldExpression(node as estree.YieldExpression);
      case 'UpdateExpression':
        return visitUpdateExpression(node as estree.UpdateExpression);
      case 'UnaryExpression':
        return visitUnaryExpression(node as estree.UnaryExpression);
      case 'ThisExpression':
        return visitThisExpression(node as estree.ThisExpression);
      case 'TemplateLiteral':
        return visitTemplateLiteral(node as estree.TemplateLiteral);
      case 'TaggedTemplateExpression':
        return visitTaggedTemplateExpression(node as estree.TaggedTemplateExpression);
      case 'SequenceExpression':
        return visitSequenceExpression(node as estree.SequenceExpression);
      case 'ObjectExpression':
        return visitObjectExpression(node as estree.ObjectExpression);
      case 'SpreadElement':
        return visitSpreadElement(node as estree.SpreadElement);
      case 'Property':
        return visitProperty(node as estree.Property);
      case 'AssignmentPattern':
        return visitAssignmentPattern(node as estree.AssignmentPattern);
      case 'RestElement':
        return visitRestElement(node as estree.RestElement);
      case 'ArrayPattern':
        return visitArrayPattern(node as estree.ArrayPattern);
      case 'ObjectPattern':
        return visitObjectPattern(node as estree.ObjectPattern);
      case 'PrivateIdentifier':
        return visitPrivateIdentifier(node as estree.PrivateIdentifier);
      case 'NewExpression':
        return visitNewExpression(node as estree.NewExpression);
      case 'Super':
        return visitSuper(node as estree.Super);
      case 'MetaProperty':
        return visitMetaProperty(node as estree.MetaProperty);
      case 'MemberExpression':
        return visitMemberExpression(node as estree.MemberExpression);
      case 'LogicalExpression':
        return visitLogicalExpression(node as estree.LogicalExpression);
      case 'ImportExpression':
        return visitImportExpression(node as estree.ImportExpression);
      case 'BlockStatement':
        return visitBlockStatement(node as estree.BlockStatement);
      case 'ConditionalExpression':
        return visitConditionalExpression(node as estree.ConditionalExpression);
      case 'ClassExpression':
        return visitClassExpression(node as estree.ClassExpression);
      case 'ClassBody':
        return visitClassBody(node as estree.ClassBody);
      case 'StaticBlock':
        return visitStaticBlock(node as estree.StaticBlock);
      case 'PropertyDefinition':
        return visitPropertyDefinition(node as estree.PropertyDefinition);
      case 'MethodDefinition':
        return visitMethodDefinition(node as estree.MethodDefinition);
      case 'ChainExpression':
        return visitChainExpression(node as estree.ChainExpression);
      case 'CallExpression':
        // Special case: the name of the type is not the same as the interface.
        return visitSimpleCallExpression(node as estree.SimpleCallExpression);
      case 'BinaryExpression':
        return visitBinaryExpression(node as estree.BinaryExpression);
      case 'AwaitExpression':
        return visitAwaitExpression(node as estree.AwaitExpression);
      case 'AssignmentExpression':
        return visitAssignmentExpression(node as estree.AssignmentExpression);
      case 'ArrowFunctionExpression':
        return visitArrowFunctionExpression(node as estree.ArrowFunctionExpression);
      case 'ArrayExpression':
        return visitArrayExpression(node as estree.ArrayExpression);
      case 'ClassDeclaration':
        // Special case: the name is not the same as the type.
        return visitMaybeNamedClassDeclaration(node as estree.MaybeNamedClassDeclaration);
      case 'FunctionDeclaration':
        // Special case: the name is not the same as the type.
        return visitMaybeNamedFunctionDeclaration(node as estree.MaybeNamedFunctionDeclaration);
      case 'ExportNamedDeclaration':
        return visitExportNamedDeclaration(node as estree.ExportNamedDeclaration);
      case 'ExportSpecifier':
        return visitExportSpecifier(node as estree.ExportSpecifier);
      case 'VariableDeclaration':
        return visitVariableDeclaration(node as estree.VariableDeclaration);
      case 'VariableDeclarator':
        return visitVariableDeclarator(node as estree.VariableDeclarator);
      case 'ImportDeclaration':
        return visitImportDeclaration(node as estree.ImportDeclaration);
      case 'ImportNamespaceSpecifier':
        return visitImportNamespaceSpecifier(node as estree.ImportNamespaceSpecifier);
      case 'ImportDefaultSpecifier':
        return visitImportDefaultSpecifier(node as estree.ImportDefaultSpecifier);
      case 'ImportSpecifier':
        return visitImportSpecifier(node as estree.ImportSpecifier);
      case 'ForOfStatement':
        return visitForOfStatement(node as estree.ForOfStatement);
      case 'ForInStatement':
        return visitForInStatement(node as estree.ForInStatement);
      case 'ForStatement':
        return visitForStatement(node as estree.ForStatement);
      case 'DoWhileStatement':
        return visitDoWhileStatement(node as estree.DoWhileStatement);
      case 'WhileStatement':
        return visitWhileStatement(node as estree.WhileStatement);
      case 'TryStatement':
        return visitTryStatement(node as estree.TryStatement);
      case 'CatchClause':
        return visitCatchClause(node as estree.CatchClause);
      case 'ThrowStatement':
        return visitThrowStatement(node as estree.ThrowStatement);
      case 'SwitchStatement':
        return visitSwitchStatement(node as estree.SwitchStatement);
      case 'SwitchCase':
        return visitSwitchCase(node as estree.SwitchCase);
      case 'IfStatement':
        return visitIfStatement(node as estree.IfStatement);
      case 'ContinueStatement':
        return visitContinueStatement(node as estree.ContinueStatement);
      case 'BreakStatement':
        return visitBreakStatement(node as estree.BreakStatement);
      case 'LabeledStatement':
        return visitLabeledStatement(node as estree.LabeledStatement);
      case 'ReturnStatement':
        return visitReturnStatement(node as estree.ReturnStatement);
      case 'WithStatement':
        return visitWithStatement(node as estree.WithStatement);
      case 'DebuggerStatement':
        return visitDebuggerStatement(node as estree.DebuggerStatement);
      case 'EmptyStatement':
        return visitEmptyStatement(node as estree.EmptyStatement);
      case 'ExpressionStatement':
        // Special case: can be 'Directive' or 'ExpressionStatement'.
        return visitExpressionStatement(node as estree.ExpressionStatement);
      case 'TemplateElement':
        return visitTemplateElement(node as estree.TemplateElement);
      case 'FunctionExpression':
        return visitFunctionExpression(node as estree.FunctionExpression);
      default:
        throw new Error(`Unknown node type: ${node.type}`);
    }
  }

  function visitProgram(node: estree.Program) {
    return {
      sourceType: node.sourceType,
      body: node.body.map(visitNode),
    };
  }

  function visitExportAllDeclaration(node: estree.ExportAllDeclaration) {
    return {
      exported: visitNode(node.exported),
      source: visitNode(node.source),
    };
  }

  function visitLiteral(node: estree.Literal) {
    if ('bigint' in node) {
      return {
        node: {
          value: node.value,
          bigInt: node.bigint,
          raw: node.raw,
        },
        protobufMessageType: 'BigIntLiteral',
      };
    } else if ('regex' in node) {
      return {
        node: {
          flags: node.regex.flags,
          pattern: node.regex.pattern,
          raw: node.raw,
        },
        protobufMessageType: 'RegExpLiteral',
      };
    } else {
      return {
        node: {
          value: node.value,
          raw: node.raw,
        },
        protobufMessageType: 'SimpleLiteral',
      };
    }
  }

  function visitIdentifier(node: estree.Identifier) {
    return {
      name: node.name,
    };
  }

  function visitExportDefaultDeclaration(node: estree.ExportDefaultDeclaration) {
    return {
      declaration: visitNode(node.declaration),
    };
  }

  function visitYieldExpression(node: estree.YieldExpression) {
    return {
      argument: visitNode(node.argument),
      delegate: node.delegate,
    };
  }

  function visitUpdateExpression(node: estree.UpdateExpression) {
    return {
      operator: node.operator,
      argument: visitNode(node.argument),
      prefix: node.prefix,
    };
  }

  function visitUnaryExpression(node: estree.UnaryExpression) {
    return {
      operator: node.operator,
      argument: visitNode(node.argument),
      prefix: node.prefix,
    };
  }

  function visitThisExpression(_node: estree.ThisExpression) {
    return {};
  }

  function visitTemplateLiteral(node: estree.TemplateLiteral) {
    return {
      quasis: node.quasis.map(visitNode),
      expressions: node.expressions.map(visitNode),
    };
  }

  function visitTaggedTemplateExpression(node: estree.TaggedTemplateExpression) {
    return {
      tag: visitNode(node.tag),
      quasi: visitNode(node.quasi),
    };
  }

  function visitSequenceExpression(node: estree.SequenceExpression) {
    return {
      expressions: node.expressions.map(visitNode),
    };
  }

  function visitObjectExpression(node: estree.ObjectExpression) {
    return {
      properties: node.properties.map(visitNode),
    };
  }

  function visitSpreadElement(node: estree.SpreadElement) {
    return {
      argument: visitNode(node.argument),
    };
  }

  function visitProperty(node: estree.Property) {
    return {
      key: visitNode(node.key),
      value: visitNode(node.value),
      kind: node.kind,
      method: node.method,
      shorthand: node.shorthand,
      computed: node.computed,
    };
  }

  function visitAssignmentPattern(node: estree.AssignmentPattern) {
    return {
      left: visitNode(node.left),
      right: visitNode(node.right),
    };
  }

  function visitRestElement(node: estree.RestElement) {
    return {
      argument: visitNode(node.argument),
    };
  }

  function visitArrayPattern(node: estree.ArrayPattern) {
    return {
      elements: node.elements.map(visitNode),
    };
  }

  function visitObjectPattern(node: estree.ObjectPattern) {
    return {
      properties: node.properties.map(visitNode),
    };
  }

  function visitPrivateIdentifier(node: estree.PrivateIdentifier) {
    return {
      name: node.name,
    };
  }

  function visitNewExpression(node: estree.NewExpression) {
    return {
      callee: visitNode(node.callee),
      arguments: node.arguments.map(visitNode),
    };
  }

  function visitSuper(_node: estree.Super) {
    return {};
  }

  function visitMetaProperty(node: estree.MetaProperty) {
    return {
      meta: visitNode(node.meta),
      property: visitNode(node.property),
    };
  }

  function visitMemberExpression(node: estree.MemberExpression) {
    return {
      object: visitNode(node.object),
      property: visitNode(node.property),
      computed: node.computed,
      optional: node.optional,
    };
  }

  function visitLogicalExpression(node: estree.LogicalExpression) {
    return {
      operator: node.operator,
      left: visitNode(node.left),
      right: visitNode(node.right),
    };
  }

  function visitImportExpression(node: estree.ImportExpression) {
    return {
      source: visitNode(node.source),
    };
  }

  function visitBlockStatement(node: estree.BlockStatement) {
    return {
      body: node.body.map(visitNode),
    };
  }

  function visitConditionalExpression(node: estree.ConditionalExpression) {
    return {
      test: visitNode(node.test),
      consequent: visitNode(node.consequent),
      alternate: visitNode(node.alternate),
    };
  }

  function visitClassExpression(node: estree.ClassExpression) {
    return {
      id: visitNode(node.id),
      superClass: visitNode(node.superClass),
      body: visitNode(node.body),
    };
  }

  function visitClassBody(node: estree.ClassBody) {
    return {
      body: node.body.map(visitNode),
    };
  }

  function visitStaticBlock(_node: estree.StaticBlock) {
    return {};
  }

  function visitPropertyDefinition(node: estree.PropertyDefinition) {
    return {
      key: visitNode(node.key),
      value: visitNode(node.value),
      computed: node.computed,
      static: node.static,
    };
  }

  function visitMethodDefinition(node: estree.MethodDefinition) {
    return {
      key: visitNode(node.key),
      value: visitNode(node.value),
      kind: node.kind,
      computed: node.computed,
      static: node.static,
    };
  }

  function visitChainExpression(node: estree.ChainExpression) {
    return {
      expression: visitNode(node.expression),
    };
  }

  function visitSimpleCallExpression(node: estree.SimpleCallExpression) {
    return {
      node: {
        optional: node.optional,
        callee: visitNode(node.callee),
        arguments: node.arguments.map(visitNode),
      },
      protobufMessageType: 'SimpleCallExpression',
    };
  }

  function visitBinaryExpression(node: estree.BinaryExpression) {
    return {
      operator: node.operator,
      left: visitNode(node.left),
      right: visitNode(node.right),
    };
  }

  function visitAwaitExpression(node: estree.AwaitExpression) {
    return {
      argument: visitNode(node.argument),
    };
  }

  function visitAssignmentExpression(node: estree.AssignmentExpression) {
    return {
      operator: node.operator,
      left: visitNode(node.left),
      right: visitNode(node.right),
    };
  }

  function visitArrowFunctionExpression(node: estree.ArrowFunctionExpression) {
    return {
      expression: node.expression,
      body: visitNode(node.body),
      params: node.params.map(visitNode),
      generator: node.generator,
      async: node.async,
    };
  }

  function visitArrayExpression(node: estree.ArrayExpression) {
    return {
      elements: node.elements.map(visitNode),
    };
  }

  function visitMaybeNamedClassDeclaration(node: estree.MaybeNamedClassDeclaration) {
    return {
      node: {
        id: visitNode(node.id),
        superClass: visitNode(node.superClass),
        body: visitNode(node.body),
      },
      protobufMessageType: 'MaybeNamedFunctionDeclaration',
    };
  }

  function visitMaybeNamedFunctionDeclaration(node: estree.MaybeNamedFunctionDeclaration) {
    return {
      node: {
        id: visitNode(node.id),
        body: visitNode(node.body),
        params: node.params.map(visitNode),
        generator: node.generator,
        async: node.async,
      },
      protobufMessageType: 'MaybeNamedFunctionDeclaration',
    };
  }

  function visitExportNamedDeclaration(node: estree.ExportNamedDeclaration) {
    return {
      declaration: visitNode(node.declaration),
      specifiers: node.specifiers.map(visitNode),
      source: visitNode(node.source),
    };
  }

  function visitExportSpecifier(node: estree.ExportSpecifier) {
    return {
      exported: visitNode(node.exported),
      local: visitNode(node.local),
    };
  }

  function visitVariableDeclaration(node: estree.VariableDeclaration) {
    return {
      declarations: node.declarations.map(visitNode),
      kind: node.kind,
    };
  }

  function visitVariableDeclarator(node: estree.VariableDeclarator) {
    return {
      id: visitNode(node.id),
      init: visitNode(node.init),
    };
  }

  function visitImportDeclaration(node: estree.ImportDeclaration) {
    return {
      specifiers: node.specifiers.map(visitNode),
      source: visitNode(node.source),
    };
  }

  function visitImportNamespaceSpecifier(node: estree.ImportNamespaceSpecifier) {
    return {
      local: visitNode(node.local),
    };
  }

  function visitImportDefaultSpecifier(node: estree.ImportDefaultSpecifier) {
    return {
      local: visitNode(node.local),
    };
  }

  function visitImportSpecifier(node: estree.ImportSpecifier) {
    return {
      imported: visitNode(node.imported),
      local: visitNode(node.local),
    };
  }

  function visitForOfStatement(node: estree.ForOfStatement) {
    return {
      await: node.await,
      left: visitNode(node.left),
      right: visitNode(node.right),
      body: visitNode(node.body),
    };
  }

  function visitForInStatement(node: estree.ForInStatement) {
    return {
      left: visitNode(node.left),
      right: visitNode(node.right),
      body: visitNode(node.body),
    };
  }

  function visitForStatement(node: estree.ForStatement) {
    return {
      init: visitNode(node.init),
      test: visitNode(node.test),
      update: visitNode(node.update),
      body: visitNode(node.body),
    };
  }

  function visitDoWhileStatement(node: estree.DoWhileStatement) {
    return {
      body: visitNode(node.body),
      test: visitNode(node.test),
    };
  }

  function visitWhileStatement(node: estree.WhileStatement) {
    return {
      test: visitNode(node.test),
      body: visitNode(node.body),
    };
  }

  function visitTryStatement(node: estree.TryStatement) {
    return {
      block: visitNode(node.block),
      handler: visitNode(node.handler),
      finalizer: visitNode(node.finalizer),
    };
  }

  function visitCatchClause(node: estree.CatchClause) {
    return {
      param: visitNode(node.param),
      body: visitNode(node.body),
    };
  }

  function visitThrowStatement(node: estree.ThrowStatement) {
    return {
      argument: visitNode(node.argument),
    };
  }

  function visitSwitchStatement(node: estree.SwitchStatement) {
    return {
      discriminant: visitNode(node.discriminant),
      cases: node.cases.map(visitNode),
    };
  }

  function visitSwitchCase(node: estree.SwitchCase) {
    return {
      test: visitNode(node.test),
      consequent: node.consequent.map(visitNode),
    };
  }

  function visitIfStatement(node: estree.IfStatement) {
    return {
      test: visitNode(node.test),
      consequent: visitNode(node.consequent),
      alternate: visitNode(node.alternate),
    };
  }

  function visitContinueStatement(node: estree.ContinueStatement) {
    return {
      label: visitNode(node.label),
    };
  }

  function visitBreakStatement(node: estree.BreakStatement) {
    return {
      label: visitNode(node.label),
    };
  }

  function visitLabeledStatement(node: estree.LabeledStatement) {
    return {
      label: visitNode(node.label),
      body: visitNode(node.body),
    };
  }

  function visitReturnStatement(node: estree.ReturnStatement) {
    return {
      argument: visitNode(node.argument),
    };
  }

  function visitWithStatement(node: estree.WithStatement) {
    return {
      object: visitNode(node.object),
      body: visitNode(node.body),
    };
  }

  function visitDebuggerStatement(_node: estree.DebuggerStatement) {
    return {};
  }

  function visitEmptyStatement(_node: estree.EmptyStatement) {
    return {};
  }

  function visitExpressionStatement(node: estree.ExpressionStatement) {
    if ('directive' in node) {
      return {
        node: {
          expression: visitNode(node.expression),
          directive: node.directive,
        },
        protobufMessageType: 'Directive',
      };
    } else {
      // The type is 'ExpressionStatement' otherwise.
      return {
        expression: visitNode(node.expression),
      };
    }
  }

  function visitTemplateElement(node: estree.TemplateElement) {
    return {
      tail: node.tail,
      cooked: node.value.cooked,
      raw: node.value.raw,
    };
  }

  function visitFunctionExpression(node: estree.FunctionExpression) {
    return {
      id: visitNode(node.id),
      body: visitNode(node.body),
      params: node.params.map(visitNode),
      generator: node.generator,
      async: node.async,
    };
  }
}
