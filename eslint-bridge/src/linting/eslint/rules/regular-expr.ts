/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S4784/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import { isIdentifier, isMemberWithProperty } from './helpers';

const stringMethods = ['match', 'search', 'split'];
const minPatternLength = 3;
const specialChars = ['+', '*', '{'];

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      safeRegex: 'Make sure that using a regular expression is safe here.',
    },
  },
  create(context: Rule.RuleContext) {
    return {
      Literal(node: estree.Node) {
        const { regex } = node as estree.RegExpLiteral;
        if (regex) {
          const { pattern } = regex;
          if (isUnsafeRegexLiteral(pattern)) {
            context.report({
              messageId: 'safeRegex',
              node,
            });
          }
        }
      },

      CallExpression(node: estree.Node) {
        const { callee, arguments: args } = node as estree.CallExpression;
        if (isMemberWithProperty(callee, ...stringMethods)) {
          checkFirstArgument(args, context);
        }
      },

      NewExpression(node: estree.Node) {
        const { callee, arguments: args } = node as estree.NewExpression;
        if (isIdentifier(callee, 'RegExp')) {
          checkFirstArgument(args, context);
        }
      },
    };
  },
};

function checkFirstArgument(args: estree.Node[], context: Rule.RuleContext) {
  const firstArg = args[0];
  if (
    firstArg &&
    firstArg.type === 'Literal' &&
    typeof firstArg.value === 'string' &&
    isUnsafeRegexLiteral(firstArg.value)
  ) {
    context.report({
      messageId: 'safeRegex',
      node: firstArg,
    });
  }
}

function isUnsafeRegexLiteral(value: string) {
  return value.length >= minPatternLength && hasEnoughNumberOfSpecialChars(value);
}

function hasEnoughNumberOfSpecialChars(value: string) {
  let numberOfSpecialChars = 0;
  for (const c of value) {
    if (specialChars.includes(c)) {
      numberOfSpecialChars++;
    }
    if (numberOfSpecialChars === 2) {
      return true;
    }
  }
  return false;
}
