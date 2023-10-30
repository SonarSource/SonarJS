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
// https://sonarsource.github.io/rspec/#/rspec/S6594/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import { isRequiredParserServices, isString } from '../helpers';
import { getParsedRegex } from '../helpers/regex';

export const rule: Rule.RuleModule = {
  meta: {
    hasSuggestions: true,
    messages: {
      useExec: 'Use the "RegExp.exec()" method instead.',
      suggestExec: 'Replace with "RegExp.exec()"',
    },
  },
  create(context: Rule.RuleContext) {
    const services = context.parserServices;
    if (!isRequiredParserServices(services)) {
      return {};
    }
    return {
      "CallExpression[arguments.length=1] > MemberExpression.callee[property.name='match'][computed=false]":
        (memberExpr: estree.MemberExpression) => {
          const { object, property } = memberExpr;
          if (!isString(object, services)) {
            return;
          }
          const callExpr = (memberExpr as any).parent as estree.CallExpression;
          const regex = getParsedRegex(callExpr.arguments[0], context)?.regex;
          if (regex?.flags.global) {
            return;
          }
          context.report({
            node: property,
            messageId: 'useExec',
            suggest: [
              {
                messageId: 'suggestExec',
                fix(fixer) {
                  const strText = context.sourceCode.getText(object);
                  const regText = context.sourceCode.getText(callExpr.arguments[0]);
                  const code = `RegExp(${regText}).exec(${strText})`;
                  return fixer.replaceText(callExpr, code);
                },
              },
            ],
          });
        },
    };
  },
};
