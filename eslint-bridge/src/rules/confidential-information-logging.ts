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
// https://jira.sonarsource.com/browse/RSPEC-5757

import { Rule } from 'eslint';
import * as estree from 'estree';
import { toEncodedMessage } from 'eslint-plugin-sonarjs/lib/utils/locations';
import {
  isIdentifier,
  getModuleNameOfNode,
  getValueOfExpression,
  getObjectExpressionProperty,
} from '../utils';
import { TSESTree } from '@typescript-eslint/experimental-utils';

const MESSAGE = 'Make sure confidential information is not logged here.';
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
    return {
      NewExpression: (node: estree.Node) => {
        const newExpression = node as estree.NewExpression;
        const { callee } = newExpression;
        let isSignaleCall = false;
        if (callee.type !== 'MemberExpression') {
          isSignaleCall =
            getModuleNameOfNode(context, callee)?.value === 'signale' &&
            isIdentifier(callee, 'Signale');
        } else {
          isSignaleCall =
            getModuleNameOfNode(context, callee.object)?.value === 'signale' &&
            isIdentifier(callee.property, 'Signale');
        }
        if (!isSignaleCall) {
          return;
        }
        if (newExpression.arguments.length === 0) {
          context.report({ node: callee, message: toEncodedMessage(MESSAGE, []) });
          return;
        }
        const firstArgument = getValueOfExpression(
          context,
          newExpression.arguments[0],
          'ObjectExpression',
        );
        if (!firstArgument) {
          // Argument exists but its value is unknown
          return;
        }
        const secrets = getObjectExpressionProperty(firstArgument, 'secrets');
        if (
          secrets &&
          secrets.value.type === 'ArrayExpression' &&
          secrets.value.elements.length === 0
        ) {
          context.report({
            node: callee,
            message: toEncodedMessage(MESSAGE, [secrets as TSESTree.Node]),
          });
        } else if (!secrets) {
          context.report({
            node: callee,
            message: toEncodedMessage(MESSAGE, [firstArgument as TSESTree.Node]),
          });
        }
      },
    };
  },
};
