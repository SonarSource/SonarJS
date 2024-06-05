import * as protobuf from 'protobufjs';
import * as path from 'node:path';
import * as _ from 'lodash';
import * as estree from 'estree';

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

export function visitNode(
  node: estree.BaseNodeWithoutComments | undefined | null,
): protobuf.Message | {} {
  if (!node) {
    return {};
  }
  const protobufType = PROTO_ROOT.lookupType('Node');
  const nodeOrTypeAndNode = getMessageForNode(node);
  if ('node' in nodeOrTypeAndNode) {
    return protobufType.create({
      type: node.type === 'FunctionExpression' ? 'FunctionExpressionType' : node.type,
      loc: node.loc,
      [lowerCaseFirstLetter(nodeOrTypeAndNode.type)]: nodeOrTypeAndNode.node,
    });
  } else {
    return protobufType.create({
      type: node.type === 'FunctionExpression' ? 'FunctionExpressionType' : node.type,
      loc: node.loc,
      [lowerCaseFirstLetter(node.type)]: nodeOrTypeAndNode,
    });
  }

  function lowerCaseFirstLetter(str: string) {
    return str.charAt(0).toLowerCase() + str.slice(1);
  }

  function getMessageForNode(node: estree.BaseNodeWithoutComments): protobuf.Message | any {
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
    const protobufType = PROTO_ROOT.lookupType('Program');
    return protobufType.create({
      sourceType: node.sourceType,
      body: node.body.map(visitNode),
    });
  }

  function visitExportAllDeclaration(node: estree.ExportAllDeclaration) {
    const protobufType = PROTO_ROOT.lookupType('ExportAllDeclaration');
    return protobufType.create({
      exported: visitNode(node.exported),
      source: visitNode(node.source),
    });
  }

  function visitLiteral(node: estree.Literal) {
    if ('bigint' in node) {
      const protobufType = PROTO_ROOT.lookupType('BigIntLiteral');
      return {
        node: protobufType.create({
          value: node.value,
          bigInt: node.bigint,
          raw: node.raw,
        }),
        type: 'BigIntLiteral',
      };
    } else if ('regex' in node) {
      const protobufType = PROTO_ROOT.lookupType('RegExpLiteral');
      return protobufType.create({
        flags: node.regex.flags,
        pattern: node.regex.pattern,
        raw: node.raw,
      });
    } else {
      const protobufType = PROTO_ROOT.lookupType('SimpleLiteral');
      return protobufType.create({
        value: node.value,
        raw: node.raw,
      });
    }
  }

  function visitIdentifier(node: estree.Identifier) {
    const protobufType = PROTO_ROOT.lookupType('Identifier');
    return protobufType.create({
      name: node.name,
    });
  }

  function visitExportDefaultDeclaration(node: estree.ExportDefaultDeclaration) {
    const protobufType = PROTO_ROOT.lookupType('ExportDefaultDeclaration');
    return protobufType.create({
      declaration: visitNode(node.declaration),
    });
  }

  function visitYieldExpression(node: estree.YieldExpression) {
    const protobufType = PROTO_ROOT.lookupType('YieldExpression');
    return protobufType.create({
      argument: visitNode(node.argument),
      delegate: node.delegate,
    });
  }

  function visitUpdateExpression(node: estree.UpdateExpression) {
    const protobufType = PROTO_ROOT.lookupType('UpdateExpression');
    return protobufType.create({
      operator: node.operator,
      argument: visitNode(node.argument),
      prefix: node.prefix,
    });
  }

  function visitUnaryExpression(node: estree.UnaryExpression) {
    const protobufType = PROTO_ROOT.lookupType('UnaryExpression');
    return protobufType.create({
      operator: node.operator,
      argument: visitNode(node.argument),
      prefix: node.prefix,
    });
  }

  function visitThisExpression(_node: estree.ThisExpression) {
    const protobufType = PROTO_ROOT.lookupType('ThisExpression');
    return protobufType.create({});
  }

  function visitTemplateLiteral(node: estree.TemplateLiteral) {
    const protobufType = PROTO_ROOT.lookupType('TemplateLiteral');
    return protobufType.create({
      quasis: node.quasis.map(visitNode),
      expressions: node.expressions.map(visitNode),
    });
  }

  function visitTaggedTemplateExpression(node: estree.TaggedTemplateExpression) {
    const protobufType = PROTO_ROOT.lookupType('TaggedTemplateExpression');
    return protobufType.create({
      tag: visitNode(node.tag),
      quasi: visitNode(node.quasi),
    });
  }

  function visitSequenceExpression(node: estree.SequenceExpression) {
    const protobufType = PROTO_ROOT.lookupType('SequenceExpression');
    return protobufType.create({
      expressions: node.expressions.map(visitNode),
    });
  }

  function visitObjectExpression(node: estree.ObjectExpression) {
    const protobufType = PROTO_ROOT.lookupType('ObjectExpression');
    return protobufType.create({
      properties: node.properties.map(visitNode),
    });
  }

  function visitSpreadElement(node: estree.SpreadElement) {
    const protobufType = PROTO_ROOT.lookupType('SpreadElement');
    return protobufType.create({
      argument: visitNode(node.argument),
    });
  }

  function visitProperty(node: estree.Property) {
    const protobufType = PROTO_ROOT.lookupType('Property');
    return protobufType.create({
      key: visitNode(node.key),
      value: visitNode(node.value),
      kind: node.kind,
      method: node.method,
      shorthand: node.shorthand,
      computed: node.computed,
    });
  }

  function visitAssignmentPattern(node: estree.AssignmentPattern) {
    const protobufType = PROTO_ROOT.lookupType('AssignmentPattern');
    return protobufType.create({
      left: visitNode(node.left),
      right: visitNode(node.right),
    });
  }

  function visitRestElement(node: estree.RestElement) {
    const protobufType = PROTO_ROOT.lookupType('RestElement');
    return protobufType.create({
      argument: visitNode(node.argument),
    });
  }

  function visitArrayPattern(node: estree.ArrayPattern) {
    const protobufType = PROTO_ROOT.lookupType('ArrayPattern');
    return protobufType.create({
      elements: node.elements.map(visitNode),
    });
  }

  function visitObjectPattern(node: estree.ObjectPattern) {
    const protobufType = PROTO_ROOT.lookupType('ObjectPattern');
    return protobufType.create({
      properties: node.properties.map(visitNode),
    });
  }

  function visitPrivateIdentifier(node: estree.PrivateIdentifier) {
    const protobufType = PROTO_ROOT.lookupType('PrivateIdentifier');
    return protobufType.create({
      name: node.name,
    });
  }

  function visitNewExpression(node: estree.NewExpression) {
    const protobufType = PROTO_ROOT.lookupType('NewExpression');
    return protobufType.create({
      callee: visitNode(node.callee),
      arguments: node.arguments.map(visitNode),
    });
  }

  function visitSuper(_node: estree.Super) {
    const protobufType = PROTO_ROOT.lookupType('Super');
    return protobufType.create({});
  }

  function visitMetaProperty(node: estree.MetaProperty) {
    const protobufType = PROTO_ROOT.lookupType('MetaProperty');
    return protobufType.create({
      meta: visitNode(node.meta),
      property: visitNode(node.property),
    });
  }

  function visitMemberExpression(node: estree.MemberExpression) {
    const protobufType = PROTO_ROOT.lookupType('MemberExpression');
    return protobufType.create({
      object: visitNode(node.object),
      property: visitNode(node.property),
      computed: node.computed,
      optional: node.optional,
    });
  }

  function visitLogicalExpression(node: estree.LogicalExpression) {
    const protobufType = PROTO_ROOT.lookupType('LogicalExpression');
    return protobufType.create({
      operator: node.operator,
      left: visitNode(node.left),
      right: visitNode(node.right),
    });
  }

  function visitImportExpression(node: estree.ImportExpression) {
    const protobufType = PROTO_ROOT.lookupType('ImportExpression');
    return protobufType.create({
      source: visitNode(node.source),
    });
  }

  function visitBlockStatement(node: estree.BlockStatement) {
    const protobufType = PROTO_ROOT.lookupType('BlockStatement');
    return protobufType.create({
      body: node.body.map(visitNode),
    });
  }

  function visitConditionalExpression(node: estree.ConditionalExpression) {
    const protobufType = PROTO_ROOT.lookupType('ConditionalExpression');
    return protobufType.create({
      test: visitNode(node.test),
      consequent: visitNode(node.consequent),
      alternate: visitNode(node.alternate),
    });
  }

  function visitClassExpression(node: estree.ClassExpression) {
    const protobufType = PROTO_ROOT.lookupType('ClassExpression');
    return protobufType.create({
      id: visitNode(node.id),
      superClass: visitNode(node.superClass),
      body: visitNode(node.body),
    });
  }

  function visitClassBody(node: estree.ClassBody) {
    const protobufType = PROTO_ROOT.lookupType('ClassBody');
    return protobufType.create({
      body: node.body.map(visitNode),
    });
  }

  function visitStaticBlock(_node: estree.StaticBlock) {
    const protobufType = PROTO_ROOT.lookupType('StaticBlock');
    return protobufType.create({});
  }

  function visitPropertyDefinition(node: estree.PropertyDefinition) {
    const protobufType = PROTO_ROOT.lookupType('PropertyDefinition');
    return protobufType.create({
      key: visitNode(node.key),
      value: visitNode(node.value),
      computed: node.computed,
      static: node.static,
    });
  }

  function visitMethodDefinition(node: estree.MethodDefinition) {
    const protobufType = PROTO_ROOT.lookupType('MethodDefinition');
    return protobufType.create({
      key: visitNode(node.key),
      value: visitNode(node.value),
      kind: node.kind,
      computed: node.computed,
      static: node.static,
    });
  }

  function visitChainExpression(node: estree.ChainExpression) {
    const protobufType = PROTO_ROOT.lookupType('ChainExpression');
    return protobufType.create({
      expression: visitNode(node.expression),
    });
  }

  function visitSimpleCallExpression(node: estree.SimpleCallExpression) {
    const protobufType = PROTO_ROOT.lookupType('SimpleCallExpression');
    return {
      node: protobufType.create({
        optional: node.optional,
        callee: visitNode(node.callee),
        arguments: node.arguments.map(visitNode),
      }),
      type: 'SimpleCallExpression',
    };
  }

  function visitBinaryExpression(node: estree.BinaryExpression) {
    const protobufType = PROTO_ROOT.lookupType('BinaryExpression');
    return protobufType.create({
      operator: node.operator,
      left: visitNode(node.left),
      right: visitNode(node.right),
    });
  }

  function visitAwaitExpression(node: estree.AwaitExpression) {
    const protobufType = PROTO_ROOT.lookupType('AwaitExpression');
    return protobufType.create({
      argument: visitNode(node.argument),
    });
  }

  function visitAssignmentExpression(node: estree.AssignmentExpression) {
    const protobufType = PROTO_ROOT.lookupType('AssignmentExpression');
    return protobufType.create({
      operator: node.operator,
      left: visitNode(node.left),
      right: visitNode(node.right),
    });
  }

  function visitArrowFunctionExpression(node: estree.ArrowFunctionExpression) {
    const protobufType = PROTO_ROOT.lookupType('ArrowFunctionExpression');
    return protobufType.create({
      expression: node.expression,
      body: visitNode(node.body),
      params: node.params.map(visitNode),
      generator: node.generator,
      async: node.async,
    });
  }

  function visitArrayExpression(node: estree.ArrayExpression) {
    const protobufType = PROTO_ROOT.lookupType('ArrayExpression');
    return protobufType.create({
      elements: node.elements.map(visitNode),
    });
  }

  function visitMaybeNamedClassDeclaration(node: estree.MaybeNamedClassDeclaration) {
    const protobufType = PROTO_ROOT.lookupType('MaybeNamedClassDeclaration');
    return protobufType.create({
      id: visitNode(node.id),
      superClass: visitNode(node.superClass),
      body: visitNode(node.body),
    });
  }

  function visitMaybeNamedFunctionDeclaration(node: estree.MaybeNamedFunctionDeclaration) {
    const protobufType = PROTO_ROOT.lookupType('MaybeNamedFunctionDeclaration');
    return protobufType.create({
      id: visitNode(node.id),
      body: visitNode(node.body),
      params: node.params.map(visitNode),
      generator: node.generator,
      async: node.async,
    });
  }

  function visitExportNamedDeclaration(node: estree.ExportNamedDeclaration) {
    const protobufType = PROTO_ROOT.lookupType('ExportNamedDeclaration');
    return protobufType.create({
      declaration: visitNode(node.declaration),
      specifiers: node.specifiers.map(visitNode),
      source: visitNode(node.source),
    });
  }

  function visitExportSpecifier(node: estree.ExportSpecifier) {
    const protobufType = PROTO_ROOT.lookupType('ExportSpecifier');
    return protobufType.create({
      exported: visitNode(node.exported),
      local: visitNode(node.local),
    });
  }

  function visitVariableDeclaration(node: estree.VariableDeclaration) {
    const protobufType = PROTO_ROOT.lookupType('VariableDeclaration');
    return protobufType.create({
      declarations: node.declarations.map(visitNode),
      kind: node.kind,
    });
  }

  function visitVariableDeclarator(node: estree.VariableDeclarator) {
    const protobufType = PROTO_ROOT.lookupType('VariableDeclarator');
    return protobufType.create({
      id: visitNode(node.id),
      init: visitNode(node.init),
    });
  }

  function visitImportDeclaration(node: estree.ImportDeclaration) {
    const protobufType = PROTO_ROOT.lookupType('ImportDeclaration');
    return protobufType.create({
      specifiers: node.specifiers.map(visitNode),
      source: visitNode(node.source),
    });
  }

  function visitImportNamespaceSpecifier(node: estree.ImportNamespaceSpecifier) {
    const protobufType = PROTO_ROOT.lookupType('ImportNamespaceSpecifier');
    return protobufType.create({
      local: visitNode(node.local),
    });
  }

  function visitImportDefaultSpecifier(node: estree.ImportDefaultSpecifier) {
    const protobufType = PROTO_ROOT.lookupType('ImportDefaultSpecifier');
    return protobufType.create({
      local: visitNode(node.local),
    });
  }

  function visitImportSpecifier(node: estree.ImportSpecifier) {
    const protobufType = PROTO_ROOT.lookupType('ImportSpecifier');
    return protobufType.create({
      imported: visitNode(node.imported),
      local: visitNode(node.local),
    });
  }

  function visitForOfStatement(node: estree.ForOfStatement) {
    const protobufType = PROTO_ROOT.lookupType('ForOfStatement');
    return protobufType.create({
      await: node.await,
      left: visitNode(node.left),
      right: visitNode(node.right),
      body: visitNode(node.body),
    });
  }

  function visitForInStatement(node: estree.ForInStatement) {
    const protobufType = PROTO_ROOT.lookupType('ForInStatement');
    return protobufType.create({
      left: visitNode(node.left),
      right: visitNode(node.right),
      body: visitNode(node.body),
    });
  }

  function visitForStatement(node: estree.ForStatement) {
    const protobufType = PROTO_ROOT.lookupType('ForStatement');
    return protobufType.create({
      init: visitNode(node.init),
      test: visitNode(node.test),
      update: visitNode(node.update),
      body: visitNode(node.body),
    });
  }

  function visitDoWhileStatement(node: estree.DoWhileStatement) {
    const protobufType = PROTO_ROOT.lookupType('DoWhileStatement');
    return protobufType.create({
      body: visitNode(node.body),
      test: visitNode(node.test),
    });
  }

  function visitWhileStatement(node: estree.WhileStatement) {
    const protobufType = PROTO_ROOT.lookupType('WhileStatement');
    return protobufType.create({
      test: visitNode(node.test),
      body: visitNode(node.body),
    });
  }

  function visitTryStatement(node: estree.TryStatement) {
    const protobufType = PROTO_ROOT.lookupType('TryStatement');
    return protobufType.create({
      block: visitNode(node.block),
      handler: visitNode(node.handler),
      finalizer: visitNode(node.finalizer),
    });
  }

  function visitCatchClause(node: estree.CatchClause) {
    const protobufType = PROTO_ROOT.lookupType('CatchClause');
    return protobufType.create({
      param: visitNode(node.param),
      body: visitNode(node.body),
    });
  }

  function visitThrowStatement(node: estree.ThrowStatement) {
    const protobufType = PROTO_ROOT.lookupType('ThrowStatement');
    return protobufType.create({
      argument: visitNode(node.argument),
    });
  }

  function visitSwitchStatement(node: estree.SwitchStatement) {
    const protobufType = PROTO_ROOT.lookupType('SwitchStatement');
    return protobufType.create({
      discriminant: visitNode(node.discriminant),
      cases: node.cases.map(visitNode),
    });
  }

  function visitSwitchCase(node: estree.SwitchCase) {
    const protobufType = PROTO_ROOT.lookupType('SwitchCase');
    return protobufType.create({
      test: visitNode(node.test),
      consequent: node.consequent.map(visitNode),
    });
  }

  function visitIfStatement(node: estree.IfStatement) {
    const protobufType = PROTO_ROOT.lookupType('IfStatement');
    return protobufType.create({
      test: visitNode(node.test),
      consequent: visitNode(node.consequent),
      alternate: visitNode(node.alternate),
    });
  }

  function visitContinueStatement(node: estree.ContinueStatement) {
    const protobufType = PROTO_ROOT.lookupType('ContinueStatement');
    return protobufType.create({
      label: visitNode(node.label),
    });
  }

  function visitBreakStatement(node: estree.BreakStatement) {
    const protobufType = PROTO_ROOT.lookupType('BreakStatement');
    return protobufType.create({
      label: visitNode(node.label),
    });
  }

  function visitLabeledStatement(node: estree.LabeledStatement) {
    const protobufType = PROTO_ROOT.lookupType('LabeledStatement');
    return protobufType.create({
      label: visitNode(node.label),
      body: visitNode(node.body),
    });
  }

  function visitReturnStatement(node: estree.ReturnStatement) {
    const protobufType = PROTO_ROOT.lookupType('ReturnStatement');
    return protobufType.create({
      argument: visitNode(node.argument),
    });
  }

  function visitWithStatement(node: estree.WithStatement) {
    const protobufType = PROTO_ROOT.lookupType('WithStatement');
    return protobufType.create({
      object: visitNode(node.object),
      body: visitNode(node.body),
    });
  }

  function visitDebuggerStatement(_node: estree.DebuggerStatement) {
    const protobufType = PROTO_ROOT.lookupType('DebuggerStatement');
    return protobufType.create({});
  }

  function visitEmptyStatement(_node: estree.EmptyStatement) {
    const protobufType = PROTO_ROOT.lookupType('EmptyStatement');
    return protobufType.create({});
  }

  function visitExpressionStatement(node: estree.ExpressionStatement) {
    if ('directive' in node) {
      const protobufType = PROTO_ROOT.lookupType('Directive');
      return protobufType.create({
        expression: visitNode(node.expression),
        directive: node.directive,
      });
    } else {
      const protobufType = PROTO_ROOT.lookupType('ExpressionStatement');
      return protobufType.create({
        expression: visitNode(node.expression),
      });
    }
  }

  function visitTemplateElement(node: estree.TemplateElement) {
    const protobufType = PROTO_ROOT.lookupType('TemplateElement');
    return protobufType.create({
      tail: node.tail,
      cooked: node.value.cooked,
      raw: node.value.raw,
    });
  }

  function visitFunctionExpression(node: estree.FunctionExpression) {
    const protobufType = PROTO_ROOT.lookupType('FunctionExpression');
    return protobufType.create({
      id: visitNode(node.id),
      body: visitNode(node.body),
      params: node.params.map(visitNode),
      generator: node.generator,
      async: node.async,
    });
  }
}
