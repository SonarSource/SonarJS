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
  getSymbolAtLocation,
  isFunctionCall,
  isMethodCall,
  isRequiredParserServices,
  Mocha,
  resolveFunction,
  Sinon,
  Vitest,
} from '../helpers/index.js';
import { Supertest } from '../helpers/supertest.js';
import * as meta from './generated-meta.js';
import { type ImportClause, SyntaxKind } from 'typescript';

/**
 * We assume that the user is using a single assertion library per file,
 * this is why we are not saving if an assertion has been performed for
 * libX and the imported library was libY.
 */
export const rule: Rule.RuleModule = {
  meta: generateMeta(meta),
  create(context: Rule.RuleContext) {
    const visitedNodes: Set<estree.Node> = new Set();
    const potentialIssues: Rule.ReportDescriptor[] = [];
    return {
      'CallExpression:exit': (node: estree.Node) => {
        const testCase = Mocha.extractTestCase(node);
        if (testCase !== null) {
          checkAssertions(testCase, context, potentialIssues, visitedNodes);
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
  visitedNodes: Set<estree.Node>,
) {
  const { node, callback } = testCase;
  const visitor = new TestCaseAssertionVisitor(context);
  visitor.visit(context, callback.body, visitedNodes);
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

  visit(context: Rule.RuleContext, node: estree.Node, visitedNodes: Set<estree.Node>) {
    if (visitedNodes.has(node)) {
      return;
    }
    visitedNodes.add(node);
    if (this.hasAssertions) {
      return;
    }
    if (
      Chai.isAssertion(context, node) ||
      Sinon.isAssertion(context, node) ||
      Vitest.isAssertion(context, node) ||
      Supertest.isAssertion(context, node)
    ) {
      this.hasAssertions = true;
      return;
    }

    if (isGlobalAssertion(context, node)) {
      this.hasAssertions = true;
      return;
    }

    if (isFunctionCall(node)) {
      const { callee } = node;
      const functionDef = resolveFunction(this.context, callee);
      if (functionDef) {
        this.visit(context, functionDef.body, visitedNodes);
      }
    }
    for (const child of childrenOf(node, this.visitorKeys)) {
      this.visit(context, child, visitedNodes);
    }
  }

  missingAssertions() {
    return !this.hasAssertions;
  }
}

function isGlobalAssertion(context: Rule.RuleContext, node: estree.Node): boolean {
  if (isFunctionCall(node)) {
    const { callee } = node;
    if (callee.name === 'expect' || callee.name === 'assert') {
      return true;
    }
    // check if parserServices are present and see if the callee is from the node:assert module
    const parserServices = context.sourceCode.parserServices;
    if (!isRequiredParserServices(parserServices)) {
      return false;
    }
    const symbol = getSymbolAtLocation(node.callee, parserServices);
    const declarations = symbol?.getDeclarations();
    if (
      declarations &&
      declarations.length > 0 &&
      declarations[0].kind === SyntaxKind.ImportSpecifier &&
      declarations[0].parent?.kind === SyntaxKind.NamedImports &&
      declarations[0].parent.parent?.kind === SyntaxKind.ImportClause
    ) {
      const moduleName = (declarations[0].parent.parent as ImportClause).name;
      if (moduleName && ['assert', 'node:assert'].includes(moduleName.escapedText as string)) {
        return true;
      }
    }
  } else if (node.type === 'CallExpression' && isMethodCall(node)) {
    const { callee } = node;
    return callee.object.type === 'Identifier' && callee.object.name === 'assert';
  }
  return false;
}
