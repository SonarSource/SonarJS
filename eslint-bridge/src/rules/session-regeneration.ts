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
// https://jira.sonarsource.com/browse/RSPEC-5876

import { Rule } from 'eslint';
import * as estree from 'estree';
import { isIdentifier } from '../utils/ast-shape';
import { last } from '../utils/collections';
import { isCallToFQN } from '../utils/module-resolving';
import { getPropertyWithValue, getValueOfExpression } from '../utils/node-extractors';
import { childrenOf } from '../utils/visitor';

const message =
  'Create a new session during user authentication to prevent session fixation attacks.';
export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    let sessionRegenerate = false;

    function isSessionRegenerate(node: estree.Node) {
      return (
        node.type === 'CallExpression' &&
        node.callee.type === 'MemberExpression' &&
        isIdentifier(node.callee.property, 'regenerate')
      );
    }

    function visitCallback(node: estree.Node) {
      if (sessionRegenerate) {
        // terminate recursion once call is detected
        return;
      }
      if (isSessionRegenerate(node)) {
        sessionRegenerate = true;
        return;
      }
      childrenOf(node, context.getSourceCode().visitorKeys).forEach(visitCallback);
    }

    function hasSessionFalseOption(callExpression: estree.CallExpression) {
      const opt = callExpression.arguments[1];
      if (opt?.type === 'ObjectExpression') {
        const sessionProp = getPropertyWithValue(context, opt, 'session', false);
        return !!sessionProp;
      }
      return false;
    }

    return {
      CallExpression: (node: estree.Node) => {
        const callExpression = node as estree.CallExpression;
        if (isCallToFQN(context, callExpression, 'passport', 'authenticate')) {
          if (hasSessionFalseOption(callExpression)) {
            return;
          }
          const parent = last(context.getAncestors());
          if (parent.type === 'CallExpression') {
            const callback = getValueOfExpression(
              context,
              (parent as estree.CallExpression).arguments[2],
              'FunctionExpression',
            );
            if (callback && callback.type === 'FunctionExpression') {
              sessionRegenerate = false;
              visitCallback(callback);
              if (!sessionRegenerate) {
                context.report({ node: callback, message });
              }
            }
          }
        }
      },
    };
  },
};
