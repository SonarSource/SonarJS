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
// https://sonarsource.github.io/rspec/#/rspec/S2699/javascript
import { Rule, SourceCode } from 'eslint';
import estree from 'estree';
import {
  Chai,
  childrenOf,
  generateMeta,
  isFunctionCall,
  Mocha,
  resolveFunction,
  Sinon,
  Vitest,
} from '../helpers/index.js';
import { Supertest } from '../helpers/supertest.js';
import { meta } from './meta.js';

/**
 * We assume that the user is using a single assertion library per file,
 * this is why we are not saving if an assertion has been performed for
 * libX and the imported library was libY.
 */
export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData),
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
    if (isFunctionCall(node)) {
      const { callee } = node;

      if (callee.name === 'expect') {
        this.hasAssertions = true;
        return;
      }

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
