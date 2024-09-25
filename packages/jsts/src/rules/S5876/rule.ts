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
// https://sonarsource.github.io/rspec/#/rspec/S5876/javascript

import { Rule } from 'eslint';
import estree from 'estree';
import {
  childrenOf,
  generateMeta,
  getFullyQualifiedName,
  getPropertyWithValue,
  getValueOfExpression,
  isIdentifier,
  last,
} from '../helpers/index.js';
import { meta } from './meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      createSession:
        'Create a new session during user authentication to prevent session fixation attacks.',
    },
  }),
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
      childrenOf(node, context.sourceCode.visitorKeys).forEach(visitCallback);
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
        if (getFullyQualifiedName(context, callExpression) === 'passport.authenticate') {
          if (hasSessionFalseOption(callExpression)) {
            return;
          }
          const parent = last(context.sourceCode.getAncestors(node));
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
                context.report({ node: callback, messageId: 'createSession' });
              }
            }
          }
        }
      },
    };
  },
};
