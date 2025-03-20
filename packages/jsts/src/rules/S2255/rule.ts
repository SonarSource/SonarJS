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
// https://sonarsource.github.io/rspec/#/rspec/S2255/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import { generateMeta, isIdentifier } from '../helpers/index.js';
import * as meta from './generated-meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      safeCookie: 'Make sure that cookie is written safely here.',
    },
  }),
  create(context: Rule.RuleContext) {
    let usingExpressFramework = false;

    return {
      Program() {
        // init flag for each file
        usingExpressFramework = false;
      },

      Literal(node: estree.Node) {
        if ((node as estree.Literal).value === 'express') {
          usingExpressFramework = true;
        }
      },

      AssignmentExpression(node: estree.Node) {
        const { left } = node as estree.AssignmentExpression;
        if (left.type === 'MemberExpression') {
          const { object, property } = left;
          if (isIdentifier(object, 'document') && isIdentifier(property, 'cookie')) {
            context.report({
              messageId: 'safeCookie',
              node: left,
            });
          }
        }
      },

      CallExpression(node: estree.Node) {
        const { callee, arguments: args } = node as estree.CallExpression;
        if (
          callee.type === 'MemberExpression' &&
          usingExpressFramework &&
          isIdentifier(callee.property, 'cookie', 'cookies')
        ) {
          context.report({
            messageId: 'safeCookie',
            node,
          });
        }

        if (
          callee.type === 'MemberExpression' &&
          isIdentifier(callee.property, 'setHeader') &&
          isLiteral(args[0], 'Set-Cookie')
        ) {
          context.report({
            messageId: 'safeCookie',
            node: callee,
          });
        }
      },
    };
  },
};

function isLiteral(node: estree.Node | undefined, value: string) {
  return node && node.type === 'Literal' && node.value === value;
}
