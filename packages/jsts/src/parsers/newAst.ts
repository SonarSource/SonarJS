import * as estree from 'estree';
import * as path from 'node:path';
import * as protobuf from 'protobufjs';

const PATH_TO_PROTOFILE = path.join(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'tools',
  'protobuf',
  'output',
  'estree.proto',
);

const PROTO_ROOT = protobuf.loadSync(PATH_TO_PROTOFILE);
const NODE_ROOT = PROTO_ROOT.lookupType('Node');

function visitNode(node: estree.BaseNodeWithoutComments | undefined | null): protobuf.Message | {} {
  if (!node) {
    return {};
  }
  const message = NODE_ROOT.create({
    type: node.type,
    loc: node.loc,
    node: getMessageForNode(node),
  });
  return message;

  function getMessageForNode(node: estree.BaseNodeWithoutComments) {
    switch (node.type) {
      case 'Program':
        return visitProgram(node as estree.Program);
      case 'ExportAllDeclaration':
        return visitExportAllDeclaration(node as estree.ExportAllDeclaration);
      case 'BigIntLiteral':
        return visitBigIntLiteral(node as estree.BigIntLiteral);
      case 'SimpleLiteral':
        return visitSimpleLiteral(node as estree.SimpleLiteral);
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
      case 'SimpleCallExpression':
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
      case 'MaybeNamedClassDeclaration':
        return visitMaybeNamedClassDeclaration(node as estree.MaybeNamedClassDeclaration);
      case 'MaybeNamedFunctionDeclaration':
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
        return visitExpressionStatement(node as estree.ExpressionStatement);
      case 'Directive':
        return visitDirective(node as estree.Directive);
      case 'TemplateElement':
        return visitTemplateElement(node as estree.TemplateElement);

      default:
        throw new Error(`Unknown node type: ${node.type}`);
    }
  }

  function visitProgram(node: estree.Program) {
    return NODE_ROOT.create({
      sourceType: node.sourceType,
      body: node.body.map(visitNode),
    });
  }

  function visitExportAllDeclaration(node: estree.ExportAllDeclaration) {
    return NODE_ROOT.create({
      exported: visitNode(node.exported),
      source: visitNode(node.source),
    });
  }

  function visitBigIntLiteral(node: estree.BigIntLiteral) {
    return NODE_ROOT.create({
      value: node.value,
      bigInt: node.bigint,
      raw: node.raw,
    });
  }

  function visitSimpleLiteral(node: estree.SimpleLiteral) {
    return NODE_ROOT.create({
      value: node.value,
      raw: node.raw,
    });
  }

  function visitIdentifier(node: estree.Identifier) {
    return NODE_ROOT.create({
      name: node.name,
    });
  }

  function visitExportDefaultDeclaration(node: estree.ExportDefaultDeclaration) {
    return NODE_ROOT.create({
      declaration: visitNode(node.declaration),
    });
  }

  function visitYieldExpression(node: estree.YieldExpression) {
    return NODE_ROOT.create({
      argument: visitNode(node.argument),
      delegate: node.delegate,
    });
  }

  function visitUpdateExpression(node: estree.UpdateExpression) {
    return NODE_ROOT.create({
      operator: node.operator,
      argument: visitNode(node.argument),
      prefix: node.prefix,
    });
  }

  function visitUnaryExpression(node: estree.UnaryExpression) {
    return NODE_ROOT.create({
      operator: node.operator,
      argument: visitNode(node.argument),
      prefix: node.prefix,
    });
  }

  function visitThisExpression(node: estree.ThisExpression) {
    return NODE_ROOT.create({});
  }

  function visitTemplateLiteral(node: estree.TemplateLiteral) {
    return NODE_ROOT.create({
      quasis: node.quasis.map(visitNode),
      expressions: node.expressions.map(visitNode),
    });
  }

  function visitTaggedTemplateExpression(node: estree.TaggedTemplateExpression) {
    return NODE_ROOT.create({
      tag: visitNode(node.tag),
      quasi: visitNode(node.quasi),
    });
  }

  function visitSequenceExpression(node: estree.SequenceExpression) {
    return NODE_ROOT.create({
      expressions: node.expressions.map(visitNode),
    });
  }

  function visitObjectExpression(node: estree.ObjectExpression) {
    return NODE_ROOT.create({
      properties: node.properties.map(visitNode),
    });
  }

  function visitSpreadElement(node: estree.SpreadElement) {
    return NODE_ROOT.create({
      argument: visitNode(node.argument),
    });
  }

  function visitProperty(node: estree.Property) {
    return NODE_ROOT.create({
      key: visitNode(node.key),
      value: visitNode(node.value),
      kind: node.kind,
      method: node.method,
      shorthand: node.shorthand,
      computed: node.computed,
    });
  }

  function visitAssignmentPattern(node: estree.AssignmentPattern) {
    return NODE_ROOT.create({
      left: visitNode(node.left),
      right: visitNode(node.right),
    });
  }

  function visitRestElement(node: estree.RestElement) {
    return NODE_ROOT.create({
      argument: visitNode(node.argument),
    });
  }

  function visitArrayPattern(node: estree.ArrayPattern) {
    return NODE_ROOT.create({
      elements: node.elements.map(visitNode),
    });
  }

  function visitObjectPattern(node: estree.ObjectPattern) {
    return NODE_ROOT.create({
      properties: node.properties.map(visitNode),
    });
  }

  function visitPrivateIdentifier(node: estree.PrivateIdentifier) {
    return NODE_ROOT.create({
      name: node.name,
    });
  }

  function visitNewExpression(node: estree.NewExpression) {
    return NODE_ROOT.create({
      callee: visitNode(node.callee),
      arguments: node.arguments.map(visitNode),
    });
  }

  function visitSuper(node: estree.Super) {
    return NODE_ROOT.create({});
  }

  function visitMetaProperty(node: estree.MetaProperty) {
    return NODE_ROOT.create({
      meta: visitNode(node.meta),
      property: visitNode(node.property),
    });
  }

  function visitMemberExpression(node: estree.MemberExpression) {
    return NODE_ROOT.create({
      object: visitNode(node.object),
      property: visitNode(node.property),
      computed: node.computed,
      optional: node.optional,
    });
  }

  function visitLogicalExpression(node: estree.LogicalExpression) {
    return NODE_ROOT.create({
      operator: node.operator,
      left: visitNode(node.left),
      right: visitNode(node.right),
    });
  }

  function visitImportExpression(node: estree.ImportExpression) {
    return NODE_ROOT.create({
      source: visitNode(node.source),
    });
  }

  function visitBlockStatement(node: estree.BlockStatement) {
    return NODE_ROOT.create({
      body: node.body.map(visitNode),
    });
  }

  function visitConditionalExpression(node: estree.ConditionalExpression) {
    return NODE_ROOT.create({
      test: visitNode(node.test),
      consequent: visitNode(node.consequent),
      alternate: visitNode(node.alternate),
    });
  }

  function visitClassExpression(node: estree.ClassExpression) {
    return NODE_ROOT.create({
      id: visitNode(node.id),
      superClass: visitNode(node.superClass),
      body: visitNode(node.body),
    });
  }

  function visitClassBody(node: estree.ClassBody) {
    return NODE_ROOT.create({
      body: node.body.map(visitNode),
    });
  }

  function visitStaticBlock(node: estree.StaticBlock) {
    return NODE_ROOT.create({});
  }

  function visitPropertyDefinition(node: estree.PropertyDefinition) {
    return NODE_ROOT.create({
      key: visitNode(node.key),
      value: visitNode(node.value),
      computed: node.computed,
      static: node.static,
    });
  }

  function visitMethodDefinition(node: estree.MethodDefinition) {
    return NODE_ROOT.create({
      key: visitNode(node.key),
      value: visitNode(node.value),
      kind: node.kind,
      computed: node.computed,
      static: node.static,
    });
  }

  function visitChainExpression(node: estree.ChainExpression) {
    return NODE_ROOT.create({
      expression: visitNode(node.expression),
    });
  }

  function visitSimpleCallExpression(node: estree.SimpleCallExpression) {
    return NODE_ROOT.create({
      optional: node.optional,
      callee: visitNode(node.callee),
      arguments: node.arguments.map(visitNode),
    });
  }

  function visitBinaryExpression(node: estree.BinaryExpression) {
    return NODE_ROOT.create({
      operator: node.operator,
      left: visitNode(node.left),
      right: visitNode(node.right),
    });
  }

  function visitAwaitExpression(node: estree.AwaitExpression) {
    return NODE_ROOT.create({
      argument: visitNode(node.argument),
    });
  }

  function visitAssignmentExpression(node: estree.AssignmentExpression) {
    return NODE_ROOT.create({
      operator: node.operator,
      left: visitNode(node.left),
      right: visitNode(node.right),
    });
  }

  function visitArrowFunctionExpression(node: estree.ArrowFunctionExpression) {
    return NODE_ROOT.create({
      expression: node.expression,
      body: visitNode(node.body),
      params: node.params.map(visitNode),
      generator: node.generator,
      async: node.async,
    });
  }

  function visitArrayExpression(node: estree.ArrayExpression) {
    return NODE_ROOT.create({
      elements: node.elements.map(visitNode),
    });
  }

  function visitMaybeNamedClassDeclaration(node: estree.MaybeNamedClassDeclaration) {
    return NODE_ROOT.create({
      id: visitNode(node.id),
      superClass: visitNode(node.superClass),
      body: visitNode(node.body),
    });
  }

  function visitMaybeNamedFunctionDeclaration(node: estree.MaybeNamedFunctionDeclaration) {
    return NODE_ROOT.create({
      id: visitNode(node.id),
      body: visitNode(node.body),
      params: node.params.map(visitNode),
      generator: node.generator,
      async: node.async,
    });
  }

  function visitExportNamedDeclaration(node: estree.ExportNamedDeclaration) {
    return NODE_ROOT.create({
      declaration: visitNode(node.declaration),
      specifiers: node.specifiers.map(visitNode),
      source: visitNode(node.source),
    });
  }

  function visitExportSpecifier(node: estree.ExportSpecifier) {
    return NODE_ROOT.create({
      exported: visitNode(node.exported),
      local: visitNode(node.local),
    });
  }

  function visitVariableDeclaration(node: estree.VariableDeclaration) {
    return NODE_ROOT.create({
      declarations: node.declarations.map(visitNode),
      kind: node.kind,
    });
  }

  function visitVariableDeclarator(node: estree.VariableDeclarator) {
    return NODE_ROOT.create({
      id: visitNode(node.id),
      init: visitNode(node.init),
    });
  }

  function visitImportDeclaration(node: estree.ImportDeclaration) {
    return NODE_ROOT.create({
      specifiers: node.specifiers.map(visitNode),
      source: visitNode(node.source),
    });
  }

  function visitImportNamespaceSpecifier(node: estree.ImportNamespaceSpecifier) {
    return NODE_ROOT.create({
      local: visitNode(node.local),
    });
  }

  function visitImportDefaultSpecifier(node: estree.ImportDefaultSpecifier) {
    return NODE_ROOT.create({
      local: visitNode(node.local),
    });
  }

  function visitImportSpecifier(node: estree.ImportSpecifier) {
    return NODE_ROOT.create({
      imported: visitNode(node.imported),
      local: visitNode(node.local),
    });
  }

  function visitForOfStatement(node: estree.ForOfStatement) {
    return NODE_ROOT.create({
      await: node.await,
      left: visitNode(node.left),
      right: visitNode(node.right),
      body: visitNode(node.body),
    });
  }

  function visitForInStatement(node: estree.ForInStatement) {
    return NODE_ROOT.create({
      left: visitNode(node.left),
      right: visitNode(node.right),
      body: visitNode(node.body),
    });
  }

  function visitForStatement(node: estree.ForStatement) {
    return NODE_ROOT.create({
      init: visitNode(node.init),
      test: visitNode(node.test),
      update: visitNode(node.update),
      body: visitNode(node.body),
    });
  }

  function visitDoWhileStatement(node: estree.DoWhileStatement) {
    return NODE_ROOT.create({
      body: visitNode(node.body),
      test: visitNode(node.test),
    });
  }

  function visitWhileStatement(node: estree.WhileStatement) {
    return NODE_ROOT.create({
      test: visitNode(node.test),
      body: visitNode(node.body),
    });
  }

  function visitTryStatement(node: estree.TryStatement) {
    return NODE_ROOT.create({
      block: visitNode(node.block),
      handler: visitNode(node.handler),
      finalizer: visitNode(node.finalizer),
    });
  }

  function visitCatchClause(node: estree.CatchClause) {
    return NODE_ROOT.create({
      param: visitNode(node.param),
      body: visitNode(node.body),
    });
  }

  function visitThrowStatement(node: estree.ThrowStatement) {
    return NODE_ROOT.create({
      argument: visitNode(node.argument),
    });
  }

  function visitSwitchStatement(node: estree.SwitchStatement) {
    return NODE_ROOT.create({
      discriminant: visitNode(node.discriminant),
      cases: node.cases.map(visitNode),
    });
  }

  function visitSwitchCase(node: estree.SwitchCase) {
    return NODE_ROOT.create({
      test: visitNode(node.test),
      consequent: node.consequent.map(visitNode),
    });
  }

  function visitIfStatement(node: estree.IfStatement) {
    return NODE_ROOT.create({
      test: visitNode(node.test),
      consequent: visitNode(node.consequent),
      alternate: visitNode(node.alternate),
    });
  }

  function visitContinueStatement(node: estree.ContinueStatement) {
    return NODE_ROOT.create({
      label: visitNode(node.label),
    });
  }

  function visitBreakStatement(node: estree.BreakStatement) {
    return NODE_ROOT.create({
      label: visitNode(node.label),
    });
  }

  function visitLabeledStatement(node: estree.LabeledStatement) {
    return NODE_ROOT.create({
      label: visitNode(node.label),
      body: visitNode(node.body),
    });
  }

  function visitReturnStatement(node: estree.ReturnStatement) {
    return NODE_ROOT.create({
      argument: visitNode(node.argument),
    });
  }

  function visitWithStatement(node: estree.WithStatement) {
    return NODE_ROOT.create({
      object: visitNode(node.object),
      body: visitNode(node.body),
    });
  }

  function visitDebuggerStatement(node: estree.DebuggerStatement) {
    return NODE_ROOT.create({});
  }

  function visitEmptyStatement(node: estree.EmptyStatement) {
    return NODE_ROOT.create({});
  }

  function visitExpressionStatement(node: estree.ExpressionStatement) {
    return NODE_ROOT.create({
      expression: visitNode(node.expression),
    });
  }

  function visitDirective(node: estree.Directive) {
    return NODE_ROOT.create({
      expression: visitNode(node.expression),
      directive: node.directive,
    });
  }

  function visitTemplateElement(node: estree.TemplateElement) {
    return NODE_ROOT.create({
      tail: node.tail,
      cooked: node.value.cooked,
      raw: node.value.raw,
    });
  }
}
