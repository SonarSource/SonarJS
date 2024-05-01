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
// https://sonarsource.github.io/rspec/#/rspec/S6594/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import {
  getNodeParent,
  getVariableFromName,
  isMemberWithProperty,
  isRequiredParserServices,
  isString,
} from '../helpers';
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
    const services = context.sourceCode.parserServices;
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
          const regex = getParsedRegex(callExpr.arguments[0], context);
          if (regex?.flags.global) {
            return;
          }

          const variable = getLhsVariable(callExpr);
          for (const ref of variable?.references ?? []) {
            const id = ref.identifier;
            const parent = getNodeParent(id);
            if (isMemberWithProperty(parent, 'length')) {
              return;
            }
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

    /**
     * Extracts the left-hand side variable of expressions
     * like `x` in `const x = <node>` or `x` in `x = <node>`.
     */
    function getLhsVariable(node: estree.Node) {
      const parent = getNodeParent(node);
      let ident: estree.Identifier | undefined;
      if (parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
        ident = parent.id;
      } else if (parent.type === 'AssignmentExpression' && parent.left.type === 'Identifier') {
        ident = parent.left;
      }
      if (ident) {
        return getVariableFromName(context, ident.name, node);
      }
      return null;
    }
  },
};
