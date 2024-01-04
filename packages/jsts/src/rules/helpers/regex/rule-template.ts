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
import { Rule } from 'eslint';
import * as estree from 'estree';
import * as regexpp from '@eslint-community/regexpp';
import type { RegExpVisitor } from '@eslint-community/regexpp/visitor';
import { isStringRegexMethodCall } from './ast';
import { getParsedRegex } from './extract';
import { getRegexpLocation } from './location';
import { isRequiredParserServices } from '..';

/**
 * Rule context for regex rules that also includes the original ESLint node
 * denoting the regular expression (string) literal.
 */
export type RegexRuleContext = Rule.RuleContext & {
  node: estree.Node;
  reportRegExpNode: (descriptor: RegexReportDescriptor) => void;
};

type RegexReportMessage = Rule.ReportDescriptorMessage;
type RegexReportData = {
  regexpNode: regexpp.AST.Node;
  node: estree.Node;
  offset?: [number, number];
};
type RegexReportOptions = Rule.ReportDescriptorOptions;
type RegexReportDescriptor = RegexReportData & RegexReportMessage & RegexReportOptions;

/**
 * Rule template to create regex rules.
 * @param handlers - the regexpp node handlers
 * @param meta - the (optional) rule metadata
 * @returns the resulting rule module
 */
export function createRegExpRule(
  handlers: (context: RegexRuleContext) => RegExpVisitor.Handlers,
  metadata: { meta: Rule.RuleMetaData } = { meta: {} },
): Rule.RuleModule {
  return {
    ...metadata,
    create(context: Rule.RuleContext) {
      const services = isRequiredParserServices(context.sourceCode.parserServices)
        ? context.sourceCode.parserServices
        : null;

      function checkRegex(node: estree.Node, regExpAST: regexpp.AST.Node | null) {
        if (!regExpAST) {
          return;
        }
        const ctx = Object.create(context) as RegexRuleContext;
        ctx.node = node;
        ctx.reportRegExpNode = reportRegExpNode;
        regexpp.visitRegExpAST(regExpAST, handlers(ctx));
      }

      function reportRegExpNode(descriptor: RegexReportDescriptor) {
        const { node, regexpNode, offset = [0, 0], ...rest } = descriptor;
        const loc = getRegexpLocation(node, regexpNode, context, offset);
        if (loc) {
          context.report({ ...rest, loc });
        }
      }

      function checkLiteral(literal: estree.Literal) {
        checkRegex(literal, getParsedRegex(literal, context));
      }

      function checkCallExpression(callExpr: estree.CallExpression) {
        let parsedRegex = getParsedRegex(callExpr, context);
        if (!parsedRegex && services && isStringRegexMethodCall(callExpr, services)) {
          const [implicitRegex] = callExpr.arguments;
          parsedRegex = getParsedRegex(implicitRegex, context);
        }
        checkRegex(callExpr.arguments[0], parsedRegex);
      }

      return {
        'Literal[regex]': checkLiteral,
        NewExpression: checkCallExpression,
        CallExpression: checkCallExpression,
      };
    },
  };
}
