/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
// https://jira.sonarsource.com/browse/RSPEC-5667

import { Rule } from 'eslint';
import * as estree from 'estree';
import { childrenOf } from '../utils/visitor';
import {
  getObjectExpressionProperty,
  getPropertyWithValue,
  getValueOfExpression,
  isCallToFQN,
  toEncodedMessage,
} from './utils';

export const rule: Rule.RuleModule = {
  meta: {
    schema: [
      {
        // internal parameter for rules having secondary locations
        enum: ['sonar-runtime'],
      },
    ],
  },
  create(context: Rule.RuleContext) {
    const MESSAGE = 'Enable server hostname verification on this SSL/TLS connection.';
    function checkSensitiveArgument(
      callExpression: estree.CallExpression,
      sensitiveArgumentIndex: number,
    ) {
      if (callExpression.arguments.length < sensitiveArgumentIndex + 1) {
        return;
      }
      const sensitiveArgument = callExpression.arguments[sensitiveArgumentIndex];
      const secondaryLocations: estree.Node[] = [];
      let shouldReport = false;
      const argumentValue = getValueOfExpression(context, sensitiveArgument, 'ObjectExpression');
      if (!argumentValue) {
        return;
      }
      if (sensitiveArgument !== argumentValue) {
        secondaryLocations.push(argumentValue);
      }
      const unsafeRejectUnauthorizedConfiguration = getPropertyWithValue(
        context,
        argumentValue,
        'rejectUnauthorized',
        false,
      );
      if (unsafeRejectUnauthorizedConfiguration) {
        secondaryLocations.push(unsafeRejectUnauthorizedConfiguration);
        shouldReport = true;
      }
      const checkServerIdentityProperty = getObjectExpressionProperty(
        argumentValue,
        'checkServerIdentity',
      );
      if (
        checkServerIdentityProperty &&
        shouldReportOnCheckServerIdentityCallBack(checkServerIdentityProperty)
      ) {
        secondaryLocations.push(checkServerIdentityProperty);
        shouldReport = true;
      }
      if (shouldReport) {
        context.report({
          node: callExpression.callee,
          message: toEncodedMessage(MESSAGE, secondaryLocations),
        });
      }
    }

    function shouldReportOnCheckServerIdentityCallBack(
      checkServerIdentityProperty: estree.Property,
    ) {
      let baseFunction: estree.BaseFunction | undefined;
      baseFunction = getValueOfExpression(
        context,
        checkServerIdentityProperty.value,
        'FunctionExpression',
      );
      if (!baseFunction) {
        baseFunction = getValueOfExpression(
          context,
          checkServerIdentityProperty.value,
          'ArrowFunctionExpression',
        );
      }
      if (baseFunction?.body.type === 'BlockStatement') {
        const returnStatements = ReturnStatementsVisitor.getReturnStatements(
          baseFunction.body,
          context,
        );
        if (
          returnStatements.length === 0 ||
          returnStatements.every(r => {
            return (
              !r.argument || getValueOfExpression(context, r.argument, 'Literal')?.value === true
            );
          })
        ) {
          return true;
        }
      }
      return false;
    }

    return {
      CallExpression: (node: estree.Node) => {
        const callExpression = node as estree.CallExpression;
        if (isCallToFQN(context, callExpression, 'https', 'request')) {
          checkSensitiveArgument(callExpression, 0);
        }
        if (isCallToFQN(context, callExpression, 'request', 'get')) {
          checkSensitiveArgument(callExpression, 0);
        }
        if (isCallToFQN(context, callExpression, 'tls', 'connect')) {
          checkSensitiveArgument(callExpression, 2);
        }
      },
    };
  },
};

class ReturnStatementsVisitor {
  private readonly returnStatements: estree.ReturnStatement[] = [];

  static getReturnStatements(node: estree.Node, context: Rule.RuleContext) {
    const visitor = new ReturnStatementsVisitor();
    visitor.visit(node, context);
    return visitor.returnStatements;
  }

  private visit(root: estree.Node, context: Rule.RuleContext) {
    const visitNode = (node: estree.Node) => {
      switch (node.type) {
        case 'ReturnStatement':
          this.returnStatements.push(node);
          break;
        case 'FunctionDeclaration':
        case 'FunctionExpression':
        case 'ArrowFunctionExpression':
          return;
      }
      childrenOf(node, context.getSourceCode().visitorKeys).forEach(visitNode);
    };
    visitNode(root);
  }
}
