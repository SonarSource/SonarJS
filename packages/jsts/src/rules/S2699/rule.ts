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
// https://sonarsource.github.io/rspec/#/rspec/S2699/javascript
import { Rule, SourceCode } from 'eslint';
import type estree from 'estree';
import {
  Chai,
  childrenOf,
  generateMeta,
  getFullyQualifiedName,
  getFullyQualifiedNameTS,
  getProperty,
  isFunctionCall,
  isIdentifier,
  isMethodCall,
  isRequiredParserServices,
  Mocha,
  resolveFunction,
  Sinon,
  Vitest,
} from '../helpers/index.js';
import { Supertest } from '../helpers/supertest.js';
import * as meta from './generated-meta.js';
import { ParserServicesWithTypeInformation, TSESTree } from '@typescript-eslint/utils';
import ts from 'typescript';

/**
 * We assume that the user is using a single assertion library per file,
 * this is why we are not saving if an assertion has been performed for
 * libX and the imported library was libY.
 */
export const rule: Rule.RuleModule = {
  meta: generateMeta(meta),
  create(context: Rule.RuleContext) {
    if (
      !(
        Chai.isImported(context) ||
        Sinon.isImported(context) ||
        Vitest.isImported(context) ||
        Supertest.isImported(context)
      )
    ) {
      return {};
    }
    const visitedNodes: Map<estree.Node, boolean> = new Map();
    const visitedTSNodes: Map<ts.Node, boolean> = new Map();
    return {
      'CallExpression:exit': (node: estree.Node) => {
        const testCase = Mocha.extractTestCase(node);
        if (testCase !== null) {
          checkAssertions(testCase, context, visitedNodes, visitedTSNodes);
        }
      },
    };
  },
};

/**
 * Checks if a test uses the Mocha done callback as an assertion mechanism.
 * Only valid when done is called with an error argument OR passed to an error-handling position.
 *
 * Valid patterns (considered assertions):
 * - done(arg) - direct call with any argument (e.g., done(new Error(...)))
 * - .catch(done) - done receives rejection error
 * - .then(_, done) - done as second argument receives rejection
 * - .subscribe(_, done) - done as second argument (error position in RxJS)
 * - .subscribe({ error: done }) - done in error property
 *
 * Invalid patterns (NOT assertions):
 * - done() - no argument
 * - .finally(done) - finally handler called without args
 * - finalize(done) - RxJS finalize called without args
 * - .then(done) - done as first/only argument (success handler)
 * - .subscribe(done) - done as first/only argument (next handler)
 */
function hasDoneCallbackAssertion(callback: estree.Function, context: Rule.RuleContext): boolean {
  if (callback.params.length === 0) {
    return false;
  }

  const firstParam = callback.params[0];
  if (!isIdentifier(firstParam)) {
    return false;
  }

  const doneParamName = firstParam.name;
  const visitorKeys = context.sourceCode.visitorKeys;

  return containsValidDoneAssertion(callback.body, doneParamName, visitorKeys, context);
}

/**
 * Recursively searches for valid done assertion patterns.
 */
function containsValidDoneAssertion(
  node: estree.Node,
  doneParamName: string,
  visitorKeys: SourceCode.VisitorKeys,
  context: Rule.RuleContext,
): boolean {
  if (node.type === 'CallExpression') {
    // Pattern 1: done(arg) - direct call with at least one argument
    if (isIdentifier(node.callee, doneParamName) && node.arguments.length > 0) {
      return true;
    }

    // Check method call patterns
    if (isMethodCall(node)) {
      const methodName = node.callee.property.name;

      // Pattern 2: .catch(done) - done receives rejection error
      if (methodName === 'catch' && node.arguments.length === 1) {
        if (isIdentifier(node.arguments[0], doneParamName)) {
          return true;
        }
      }

      // Pattern 3: .then(_, done) - done as second argument
      if (methodName === 'then' && node.arguments.length >= 2) {
        if (isIdentifier(node.arguments[1], doneParamName)) {
          return true;
        }
      }

      // Pattern 4 & 5: .subscribe patterns
      if (methodName === 'subscribe') {
        // Pattern 4: .subscribe(_, done) - done as second argument (error position)
        if (node.arguments.length >= 2 && isIdentifier(node.arguments[1], doneParamName)) {
          return true;
        }

        // Pattern 5: .subscribe({ error: done }) - done in error property
        if (node.arguments.length === 1 && node.arguments[0].type === 'ObjectExpression') {
          const errorProp = getProperty(node.arguments[0], 'error', context);
          if (errorProp && isIdentifier(errorProp.value, doneParamName)) {
            return true;
          }
        }
      }
    }
  }

  // Recurse through children
  for (const child of childrenOf(node, visitorKeys)) {
    if (containsValidDoneAssertion(child, doneParamName, visitorKeys, context)) {
      return true;
    }
  }

  return false;
}

function checkAssertions(
  testCase: Mocha.TestCase,
  context: Rule.RuleContext,
  visitedNodes: Map<estree.Node, boolean>,
  visitedTSNodes: Map<ts.Node, boolean>,
) {
  const { node, callback } = testCase;

  // Check for Mocha done(error) callback pattern used as assertion mechanism
  if (hasDoneCallbackAssertion(callback, context)) {
    return;
  }

  const visitor = new TestCaseAssertionVisitor(context);
  const parserServices = context.sourceCode.parserServices;
  let hasAssertions = false;
  if (isRequiredParserServices(parserServices)) {
    const tsNode = parserServices.esTreeNodeToTSNodeMap.get(callback as TSESTree.Node);
    hasAssertions = visitor.visitTSNode(parserServices, tsNode, visitedTSNodes);
  } else {
    hasAssertions = visitor.visit(context, callback.body, visitedNodes);
  }
  if (!hasAssertions) {
    context.report({ node, message: 'Add at least one assertion to this test case.' });
  }
}

class TestCaseAssertionVisitor {
  private readonly visitorKeys: SourceCode.VisitorKeys;

  constructor(private readonly context: Rule.RuleContext) {
    this.visitorKeys = context.sourceCode.visitorKeys;
  }

  visitTSNode(
    services: ParserServicesWithTypeInformation,
    node: ts.Node,
    visitedTSNodes: Map<ts.Node, boolean>,
  ): boolean {
    if (visitedTSNodes.has(node)) {
      return visitedTSNodes.get(node)!;
    }
    visitedTSNodes.set(node, false);
    if (
      isGlobalTSAssertion(services, node) ||
      Chai.isTSAssertion(services, node) ||
      Sinon.isTSAssertion(services, node) ||
      Supertest.isTSAssertion(services, node) ||
      Vitest.isTSAssertion(services, node)
    ) {
      visitedTSNodes.set(node, true);
      return true;
    }

    let nodeHasAssertions = false;
    if (node.kind === ts.SyntaxKind.CallExpression) {
      const callNode = services.program
        .getTypeChecker()
        .getResolvedSignature(node as ts.CallLikeExpression);
      if (callNode?.declaration) {
        nodeHasAssertions ||= this.visitTSNode(services, callNode.declaration, visitedTSNodes);
      }
    }
    node.forEachChild(child => {
      nodeHasAssertions ||= this.visitTSNode(services, child, visitedTSNodes);
    });
    visitedTSNodes.set(node, nodeHasAssertions);
    return nodeHasAssertions;
  }

  visit(
    context: Rule.RuleContext,
    node: estree.Node,
    visitedNodes: Map<estree.Node, boolean>,
  ): boolean {
    if (visitedNodes.has(node)) {
      return visitedNodes.get(node)!;
    }
    visitedNodes.set(node, false);
    if (
      Chai.isAssertion(context, node) ||
      Sinon.isAssertion(context, node) ||
      Vitest.isAssertion(context, node) ||
      Supertest.isAssertion(context, node) ||
      isGlobalAssertion(context, node)
    ) {
      visitedNodes.set(node, true);
      return true;
    }

    let nodeHasAssertions = false;
    if (isFunctionCall(node)) {
      const { callee } = node;
      const functionDef = resolveFunction(this.context, callee);
      if (functionDef) {
        nodeHasAssertions ||= this.visit(context, functionDef.body, visitedNodes);
      }
    }
    for (const child of childrenOf(node, this.visitorKeys)) {
      nodeHasAssertions ||= this.visit(context, child, visitedNodes);
    }
    visitedNodes.set(node, nodeHasAssertions);
    return nodeHasAssertions;
  }
}

function isGlobalTSAssertion(services: ParserServicesWithTypeInformation, node: ts.Node) {
  if (node.kind !== ts.SyntaxKind.CallExpression) {
    return false;
  }
  const callExpressionNode = node as ts.CallExpression;
  // check for global expect
  if (isGlobalExpectExpression(callExpressionNode)) {
    return true;
  }
  return isFunctionCallFromNodeAssertTS(services, node);
}

function isGlobalExpectExpression(node: ts.CallExpression) {
  if (node.expression.kind !== ts.SyntaxKind.PropertyAccessExpression) {
    return false;
  }

  // Walk up the chain of property accesses to find the innermost call expression
  // This handles: expect(...).toHaveBeenCalled() as well as expect(...).not.toHaveBeenCalled()
  // Also handles: expectObservable(...).toBe(...), expectSubscriptions(...).toBe(...), etc.
  let current: ts.Expression = (node.expression as ts.PropertyAccessExpression).expression;
  while (current.kind === ts.SyntaxKind.PropertyAccessExpression) {
    current = (current as ts.PropertyAccessExpression).expression;
  }

  if (current.kind !== ts.SyntaxKind.CallExpression) {
    return false;
  }

  const innerCallExpression = current as ts.CallExpression;
  return (
    innerCallExpression.expression.kind === ts.SyntaxKind.Identifier &&
    (innerCallExpression.expression as ts.Identifier).text.startsWith('expect')
  );
}

function isFunctionCallFromNodeAssertTS(
  services: ParserServicesWithTypeInformation,
  node: ts.Node,
): boolean {
  const fqn = getFullyQualifiedNameTS(services, node);
  return fqn ? fqn?.startsWith('assert') : false;
}

function isGlobalAssertion(context: Rule.RuleContext, node: estree.Node): boolean {
  if (node.type !== 'CallExpression') {
    return false;
  }
  // Check for global expect (mirrors isGlobalExpectExpression for TS)
  if (isGlobalExpectExpressionJS(node)) {
    return true;
  }
  return isFunctionCallFromNodeAssert(context, node);
}

/**
 * Checks if the node matches the pattern expectX(...).method() where:
 * - expectX is a function whose name starts with "expect" (e.g., expect, expectObservable, expectSubscriptions, expectTypeOf)
 * - method is a chained property access with a method call (e.g., .toBe(), .toEqual(), .not.toBe())
 *
 * This mirrors the TypeScript isGlobalExpectExpression function logic.
 */
function isGlobalExpectExpressionJS(node: estree.CallExpression): boolean {
  if (node.callee.type !== 'MemberExpression') {
    return false;
  }

  // Walk up the chain of member expressions to find the innermost call expression
  // This handles: expect(...).toBe() as well as expect(...).not.toBe()
  // Also handles: expectObservable(...).toBe(...), expectSubscriptions(...).toBe(...), etc.
  let current: estree.Expression | estree.Super = node.callee.object;
  while (current.type === 'MemberExpression') {
    current = current.object;
  }

  if (current.type !== 'CallExpression') {
    return false;
  }

  const innerCall = current;
  return innerCall.callee.type === 'Identifier' && innerCall.callee.name.startsWith('expect');
}

function isFunctionCallFromNodeAssert(context: Rule.RuleContext, node: estree.Node) {
  const fullyQualifiedName = getFullyQualifiedName(context, node);
  return fullyQualifiedName?.split('.')[0] === 'assert';
}
