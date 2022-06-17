/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S5148/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import { getValueOfExpression, isIdentifier, isMethodCall, isStringLiteral } from '../utils';

const REQUIRED_OPTION = 'noopener';
const REQUIRED_OPTION_INDEX = 2;
const URL_INDEX = 0;

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      missingNoopener: 'Make sure not using "noopener" is safe here.',
    },
  },
  create(context: Rule.RuleContext) {
    return {
      CallExpression: (node: estree.CallExpression) => {
        if (!isMethodCall(node)) {
          return;
        }
        const { object, property } = node.callee;

        if (
          !isIdentifier(property, 'open') ||
          (!isIdentifier(object, 'window') && !isThisWindow(object))
        ) {
          return;
        }

        const args = node.arguments;
        if (args.length >= URL_INDEX && !isHttpUrl(context, args[URL_INDEX])) {
          return;
        }
        if (
          args.length <= REQUIRED_OPTION_INDEX ||
          !hasRequiredOption(context, args[REQUIRED_OPTION_INDEX])
        ) {
          context.report({
            messageId: 'missingNoopener',
            node: property,
          });
        }
      },
    };
  },
};

function isThisWindow(node: estree.Node) {
  return (
    node.type === 'MemberExpression' &&
    node.object.type === 'ThisExpression' &&
    isIdentifier(node.property, 'window')
  );
}

function hasRequiredOption(context: Rule.RuleContext, argument: estree.Node) {
  const literalNode = getValueOfExpression(context, argument, 'Literal');
  if (literalNode === undefined || !isStringLiteral(literalNode)) {
    return false;
  }
  return literalNode.value.includes(REQUIRED_OPTION);
}

function isHttpUrl(context: Rule.RuleContext, argument: estree.Node): boolean {
  const literalNode = getValueOfExpression(context, argument, 'Literal');
  if (literalNode === undefined || !isStringLiteral(literalNode)) {
    return false;
  }
  const url = literalNode.value;
  return url.startsWith('http') || url.startsWith('https');
}
