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

import { Rule } from 'eslint';
import * as estree from 'estree';
import * as regexpp from 'regexpp';
import type { RegExpVisitor } from 'regexpp/visitor';
import { getParsedRegex, isRegexLiteral } from '../utils';

/**
 * Rule context for regex rules that also includes the original ESLint node
 * denoting the regular expression (string) literal.
 */
export type RegexRuleContext = Rule.RuleContext & { node: estree.Node };

/**
 * Rule template to create regex rules.
 * @param handlers - the regexpp node handlers
 * @param meta - the (optional) rule metadata
 * @returns the resulting rule module
 */
export function createRegExpRule(
  handlers: (context: RegexRuleContext) => RegExpVisitor.Handlers,
  meta: Rule.RuleMetaData = {},
): Rule.RuleModule {
  return {
    meta,
    create(context: Rule.RuleContext) {
      function checkRegex(node: estree.Node, regExpAST: regexpp.AST.Node | null) {
        if (!regExpAST) {
          return;
        }
        regexpp.visitRegExpAST(regExpAST, handlers({ ...context, node }));
      }

      function checkLiteral(literal: estree.Literal) {
        // we can't call `getParsedRegex` withouth following check
        // as it will return regex for string literal which might be not a regex
        if (!isRegexLiteral(literal)) {
          return;
        }
        checkRegex(literal, getParsedRegex(literal, context));
      }

      function checkCallExpression(callExpr: estree.CallExpression) {
        checkRegex(callExpr.arguments[0], getParsedRegex(callExpr, context));
      }

      return {
        Literal: checkLiteral,
        NewExpression: checkCallExpression,
        CallExpression: checkCallExpression,
      };
    },
  };
}
