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
// https://jira.sonarsource.com/browse/RSPEC-5743

import { Rule } from 'eslint';
import * as estree from 'estree';
import {
  getModuleNameOfNode,
  getPropertyWithValue,
  getValueOfExpression,
  isCallToFQN,
  toEncodedMessage,
} from './utils';

const MESSAGE = 'Make sure allowing browsers to perform DNS prefetching is safe here.';

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
    function checkSensitiveCall(
      callExpression: estree.CallExpression,
      sensitiveArgumentIndex: number,
      sensitiveProperty: string,
      sensitivePropertyValue: boolean,
    ) {
      if (callExpression.arguments.length < sensitiveArgumentIndex + 1) {
        return;
      }
      const sensitiveArgument = callExpression.arguments[sensitiveArgumentIndex];
      const options = getValueOfExpression(context, sensitiveArgument, 'ObjectExpression');
      if (!options) {
        return;
      }
      const unsafeProperty = getPropertyWithValue(
        context,
        options,
        sensitiveProperty,
        sensitivePropertyValue,
      );
      if (unsafeProperty) {
        context.report({
          node: callExpression.callee,
          message: toEncodedMessage(MESSAGE, [unsafeProperty]),
        });
      }
    }
    return {
      CallExpression: (node: estree.Node) => {
        const callExpression = node as estree.CallExpression;
        const { callee } = callExpression;
        if (isCallToFQN(context, callExpression, 'helmet', 'dnsPrefetchControl')) {
          checkSensitiveCall(callExpression, 0, 'allow', true);
        }
        const calledModule = getModuleNameOfNode(context, callee);
        if (calledModule?.value === 'helmet') {
          checkSensitiveCall(callExpression, 0, 'dnsPrefetchControl', false);
        }
        if (calledModule?.value === 'dns-prefetch-control') {
          checkSensitiveCall(callExpression, 0, 'allow', true);
        }
      },
    };
  },
};
