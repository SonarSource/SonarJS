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
// https://sonarsource.github.io/rspec/#/rspec/S6268/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import { isMemberWithProperty, isLiteral } from '../helpers';
import { generateMeta } from '../helpers/generate-meta';
import rspecMeta from './meta.json';

const bypassMethods = [
  'bypassSecurityTrustHtml',
  'bypassSecurityTrustStyle',
  'bypassSecurityTrustScript',
  'bypassSecurityTrustUrl',
  'bypassSecurityTrustResourceUrl',
];

export const rule: Rule.RuleModule = {
  meta: generateMeta(rspecMeta as Rule.RuleMetaData, {
    messages: {
      checkAngularBypass: 'Make sure disabling Angular built-in sanitization is safe here.',
    },
  }),
  create(context: Rule.RuleContext) {
    return {
      CallExpression: (node: estree.Node) => {
        const { callee, arguments: args } = node as estree.CallExpression;

        if (
          isMemberWithProperty(callee, ...bypassMethods) &&
          args.length === 1 &&
          !isHardcodedLiteral(args[0])
        ) {
          context.report({
            messageId: 'checkAngularBypass',
            node: (callee as estree.MemberExpression).property,
          });
        }
      },
    };
  },
};

function isHardcodedLiteral(node: estree.Node) {
  if (node.type === 'TemplateLiteral') {
    return node.expressions.length === 0;
  } else {
    return isLiteral(node);
  }
}
