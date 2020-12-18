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
// https://jira.sonarsource.com/browse/RSPEC-2612

import { Rule } from 'eslint';
import * as estree from 'estree';
import { getValueOfExpression, isIdentifier, isCallToFQN } from './utils';

const chmodLikeFunction = ['chmod', 'chmodSync', 'fchmod', 'fchmodSync', 'lchmod', 'lchmodSync'];

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    function isChmodLikeFunction(node: estree.CallExpression) {
      const { callee } = node;
      if (callee.type !== 'MemberExpression') {
        return false;
      }
      // to support fs promises we are only checking the name of the function
      return isIdentifier(callee.property, ...chmodLikeFunction);
    }

    function checkModeArgument(node: estree.Node, moduloTest: number) {
      const modeExpr = getValueOfExpression(context, node, 'Literal');
      const modeValue = modeExpr?.value;
      let mode = null;
      if (typeof modeValue === 'string') {
        mode = Number.parseInt(modeValue, 8);
      } else if (typeof modeValue === 'number') {
        const raw = modeExpr?.raw;
        // ts parser interprets number starting with 0 as decimal, we need to parse it as octal value
        if (raw && raw.startsWith('0') && !raw.startsWith('0o')) {
          mode = Number.parseInt(raw, 8);
        } else {
          mode = modeValue;
        }
      }
      if (mode !== null && !isNaN(mode) && mode % 8 !== moduloTest) {
        context.report({
          node,
          message: `Make sure this permission to '${modeExpr?.raw}' is safe.`,
        });
      }
    }

    return {
      CallExpression: (node: estree.Node) => {
        const callExpression = node as estree.CallExpression;
        if (isChmodLikeFunction(callExpression)) {
          checkModeArgument(callExpression.arguments[0], 0);
          checkModeArgument(callExpression.arguments[1], 0);
        } else if (isCallToFQN(context, callExpression, 'process', 'umask')) {
          checkModeArgument(callExpression.arguments[0], 7);
        }
      },
    };
  },
};
