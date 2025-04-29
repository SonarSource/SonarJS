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
// https://sonarsource.github.io/rspec/#/rspec/S2699/javascript
import { Rule, SourceCode } from 'eslint';
import estree from 'estree';
import {
  Chai,
  childrenOf,
  generateMeta,
  getFullyQualifiedName,
  getSignatureFromCallee,
  isFunctionCall,
  isRequiredParserServices,
  Mocha,
  resolveFunction,
  Sinon,
  Vitest,
} from '../helpers/index.js';
import { Supertest } from '../helpers/supertest.js';
import * as meta from './generated-meta.js';
import { ParserServicesWithTypeInformation } from '@typescript-eslint/utils';
import ts from 'typescript';

/**
 * We assume that the user is using a single assertion library per file,
 * this is why we are not saving if an assertion has been performed for
 * libX and the imported library was libY.
 */
export const rule: Rule.RuleModule = {
  meta: generateMeta(meta),
  create(context: Rule.RuleContext) {
    const visitedNodes: Map<estree.Node, boolean> = new Map();
    const visitedTSNodes: Map<ts.Node, boolean> = new Map();
    const potentialIssues: Rule.ReportDescriptor[] = [];
    return {
      'CallExpression:exit': (node: estree.Node) => {
        const testCase = Mocha.extractTestCase(node);
        if (testCase !== null) {
          checkAssertions(testCase, context, potentialIssues, visitedNodes, visitedTSNodes);
        }
      },
      'Program:exit': () => {
        if (
          Chai.isImported(context) ||
          Sinon.isImported(context) ||
          Vitest.isImported(context) ||
          Supertest.isImported(context)
        ) {
          potentialIssues.forEach(issue => {
            context.report(issue);
          });
        }
      },
    };
  },
};

function checkAssertions(
  testCase: Mocha.TestCase,
  context: Rule.RuleContext,
  potentialIssues: Rule.ReportDescriptor[],
  visitedNodes: Map<estree.Node, boolean>,
  visitedTSNodes: Map<ts.Node, boolean>,
) {
  const { node, callback } = testCase;
  const visitor = new TestCaseAssertionVisitor(context);
  visitor.visit(context, callback.body, visitedNodes, visitedTSNodes);
  if (visitor.missingAssertions()) {
    potentialIssues.push({ node, message: 'Add at least one assertion to this test case.' });
  }
}

class TestCaseAssertionVisitor {
  private readonly visitorKeys: SourceCode.VisitorKeys;
  private hasAssertions: boolean;

  constructor(private readonly context: Rule.RuleContext) {
    this.visitorKeys = context.sourceCode.visitorKeys;
    this.hasAssertions = false;
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
    if (isGlobalTSAssertion(node)) {
      this.hasAssertions = true;
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
    this.hasAssertions = this.hasAssertions || nodeHasAssertions;
    return nodeHasAssertions;
  }

  visit(
    context: Rule.RuleContext,
    node: estree.Node,
    visitedNodes: Map<estree.Node, boolean>,
    visitedTSNodes: Map<ts.Node, boolean>,
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
      this.hasAssertions = true;
      return true;
    }

    let nodeHasAssertions = false;
    if (isFunctionCall(node)) {
      const { callee } = node;
      const functionDef = resolveFunction(this.context, callee);
      if (functionDef) {
        nodeHasAssertions ||= this.visit(context, functionDef.body, visitedNodes, visitedTSNodes);
      }
      const parserServices = context.sourceCode.parserServices;
      if (isRequiredParserServices(parserServices)) {
        const signature = getSignatureFromCallee(node, parserServices);
        if (signature?.getDeclaration()) {
          nodeHasAssertions ||= this.visitTSNode(
            parserServices,
            signature.getDeclaration(),
            visitedTSNodes,
          );
        }
      }
    }
    for (const child of childrenOf(node, this.visitorKeys)) {
      nodeHasAssertions ||= this.visit(context, child, visitedNodes, visitedTSNodes);
    }
    visitedNodes.set(node, nodeHasAssertions);
    this.hasAssertions = this.hasAssertions || nodeHasAssertions;
    return nodeHasAssertions;
  }

  missingAssertions() {
    return !this.hasAssertions;
  }
}

function isGlobalTSAssertion(node: ts.Node) {
  if (node.kind !== ts.SyntaxKind.CallExpression) {
    return false;
  }
  const callExpressionNode = node as ts.CallExpression;
  if (callExpressionNode.expression.kind !== ts.SyntaxKind.Identifier) {
    return false;
  }
  const identifierNode = callExpressionNode.expression as ts.Identifier;
  return identifierNode.text === 'expect' || identifierNode.text === 'assert';
}

function isGlobalAssertion(context: Rule.RuleContext, node: estree.Node): boolean {
  if (isFunctionCall(node) && node.callee.name === 'expect') {
    return true;
  }
  return isFunctionCallFromNodeAssert(context, node);
}

function isFunctionCallFromNodeAssert(context: Rule.RuleContext, node: estree.Node) {
  const fullyQualifiedName = getFullyQualifiedName(context, node);
  return fullyQualifiedName?.split('.')[0] === 'assert';
}
