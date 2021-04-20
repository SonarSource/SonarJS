/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
// https://jira.sonarsource.com/browse/RSPEC-2819

import { Rule } from 'eslint';
import * as estree from 'estree';
import {
  isRequiredParserServices,
  getValueOfExpression,
  getTypeAsString,
  childrenOf,
} from '../utils';

const MESSAGE = 'Make sure this cross-domain message is being sent to the intended domain.';
const POST_MESSAGE = 'postMessage';
export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    const services = context.parserServices;
    if (!isRequiredParserServices(services)) {
      return {};
    }

    function checkPostMessageCall(callExpr: estree.CallExpression) {
      const { callee } = callExpr;
      // Window.postMessage() can take 2 or 3 arguments
      if (
        ![2, 3].includes(callExpr.arguments.length) ||
        getValueOfExpression(context, callExpr.arguments[1], 'Literal')?.value !== '*'
      ) {
        return;
      }
      if (callee.type === 'Identifier') {
        context.report({
          node: callee,
          message: MESSAGE,
        });
      }
      if (callee.type !== 'MemberExpression') {
        return;
      }
      const { object } = callee;
      const type = getTypeAsString(object, services);
      const hasWindowName = WindowNameVisitor.containsWindowName(object, context);
      if (type.match(/window/i) || type.match(/globalThis/i) || hasWindowName) {
        context.report({
          node: callee,
          message: MESSAGE,
        });
      }
    }

    return {
      [`CallExpression:matches([callee.name="${POST_MESSAGE}"], [callee.property.name="${POST_MESSAGE}"])`]: (
        node: estree.Node,
      ) => {
        checkPostMessageCall(node as estree.CallExpression);
      },
    };
  },
};

class WindowNameVisitor {
  private hasWindowName = false;

  static containsWindowName(node: estree.Node, context: Rule.RuleContext) {
    const visitor = new WindowNameVisitor();
    visitor.visit(node, context);
    return visitor.hasWindowName;
  }

  private visit(root: estree.Node, context: Rule.RuleContext) {
    const visitNode = (node: estree.Node) => {
      if (node.type === 'Identifier' && node.name.match(/window/i)) {
        this.hasWindowName = true;
      }
      childrenOf(node, context.getSourceCode().visitorKeys).forEach(visitNode);
    };
    visitNode(root);
  }
}
