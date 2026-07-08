/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
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
import type { Rule, SourceCode } from 'eslint';
import type estree from 'estree';
import { childrenOf } from '../helpers/ancestor.js';
import { generateMeta } from '../helpers/generate-meta.js';
import {
  getProperty,
  isFunctionCall,
  isIdentifier,
  isMethodCall,
  resolveFunction,
} from '../helpers/ast.js';
import { isRequiredParserServices } from '../helpers/parser-services.js';
import * as Mocha from '../helpers/mocha.js';
import * as Vitest from '../helpers/vitest.js';
import { followCallToImplementation } from '../helpers/call-to-declaration.js';
import {
  hasSupportedAssertionLibrary,
  hasSupportedTestFramework,
  isAssertion,
  isIncompleteShouldAccess,
  isTSAssertion,
} from '../helpers/assertion-detection.js';
import * as meta from './generated-meta.js';
import type { ParserServicesWithTypeInformation, TSESTree } from '@typescript-eslint/utils';
import ts from 'typescript';

/**
 * We assume that the user is using a single assertion library per file,
 * this is why we are not saving if an assertion has been performed for
 * libX and the imported library was libY.
 */
export const rule: Rule.RuleModule = {
  meta: generateMeta(meta),
  create(context: Rule.RuleContext) {
    if (!hasSupportedTestFramework(context) || !hasSupportedAssertionLibrary(context)) {
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
 * Checks if a method call matches valid done assertion patterns.
 * Returns true if the pattern is recognized as a valid assertion mechanism.
 */
function isValidDoneMethodCallPattern(
  node: estree.CallExpression & {
    callee: estree.MemberExpression & { property: estree.Identifier };
  },
  doneParamName: string,
  context: Rule.RuleContext,
): boolean {
  const methodName = node.callee.property.name;

  // Pattern 2: .catch(done) - done receives rejection error
  if (
    methodName === 'catch' &&
    node.arguments.length === 1 &&
    isIdentifier(node.arguments[0], doneParamName)
  ) {
    return true;
  }

  // Pattern 3: .then(_, done) - done as second argument
  if (
    methodName === 'then' &&
    node.arguments.length >= 2 &&
    isIdentifier(node.arguments[1], doneParamName)
  ) {
    return true;
  }

  // Pattern 4: .subscribe(_, done) - done as second argument (error position)
  if (
    methodName === 'subscribe' &&
    node.arguments.length >= 2 &&
    isIdentifier(node.arguments[1], doneParamName)
  ) {
    return true;
  }

  // Pattern 5: .subscribe({ error: done }) - done in error property
  if (
    methodName === 'subscribe' &&
    node.arguments.length === 1 &&
    node.arguments[0].type === 'ObjectExpression'
  ) {
    const errorProp = getProperty(node.arguments[0], 'error', context);
    return errorProp != null && isIdentifier(errorProp.value, doneParamName);
  }

  return false;
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
    if (isMethodCall(node) && isValidDoneMethodCallPattern(node, doneParamName, context)) {
      return true;
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
    if (isTSAssertion(services, node)) {
      visitedTSNodes.set(node, true);
      return true;
    }
    // Stopgap: in this type-aware path, a vitest `expect.extend(...)` (and other
    // expect setup helpers) is a compile-time check on its typed arguments, so a
    // typecheck test that only configures matchers should not be reported as
    // assertion-less. Recognising typecheck-mode test files properly is a separate
    // S2699 discussion; this keeps those type-tests quiet meanwhile.
    if (Vitest.isTSSetupCall(services, node)) {
      visitedTSNodes.set(node, true);
      return true;
    }

    let nodeHasAssertions = false;
    if (node.kind === ts.SyntaxKind.CallExpression) {
      const estreeNode = services.tsNodeToESTreeNodeMap.get(node);
      const declaration =
        estreeNode?.type === 'CallExpression'
          ? followCallToImplementation(estreeNode, services)
          : services.program.getTypeChecker().getResolvedSignature(node as ts.CallLikeExpression)
              ?.declaration;
      if (declaration) {
        nodeHasAssertions ||= this.visitTSNode(services, declaration, visitedTSNodes);
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
    if (isAssertion(context, node) && !isIncompleteShouldAccess(context, node)) {
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
