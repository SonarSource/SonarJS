/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
import * as estree from 'estree';
import { childrenOf } from '../../linter';
import { Chai, isFunctionCall, Mocha, resolveFunction } from '../helpers';
import { Sinon } from '../helpers/sinon';

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    return {
      'CallExpression:exit': (node: estree.Node) => {
        const testCase = Mocha.extractTestCase(node);
        if (testCase !== null) {
          checkAssertions(testCase, context);
        }
      },
    };
  },
};

function checkAssertions(testCase: Mocha.TestCase, context: Rule.RuleContext) {
  const { node, callback } = testCase;
  const visitor = new TestCaseAssertionVisitor(context);
  visitor.visit(context, callback.body);
  if (visitor.missingAssertions()) {
    context.report({ node, message: 'Add at least one assertion to this test case.' });
  }
}

class TestCaseAssertionVisitor {
  private readonly visitorKeys: SourceCode.VisitorKeys;
  private hasAssertions: boolean;

  constructor(private readonly context: Rule.RuleContext) {
    this.visitorKeys = context.getSourceCode().visitorKeys;
    this.hasAssertions = false;
  }

  visit(context: Rule.RuleContext, node: estree.Node) {
    if (this.hasAssertions) {
      return;
    }
    if (Chai.isAssertion(context, node) || Sinon.isAssertion(context, node)) {
      this.hasAssertions = true;
      return;
    }
    if (isFunctionCall(node)) {
      const functionDef = resolveFunction(this.context, node.callee);
      if (functionDef) {
        this.visit(context, functionDef.body);
      }
    }
    for (const child of childrenOf(node, this.visitorKeys)) {
      this.visit(context, child);
    }
  }

  missingAssertions() {
    return !this.hasAssertions;
  }
}
