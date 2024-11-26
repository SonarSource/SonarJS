/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import type { Rule } from 'eslint';
import estree from 'estree';
import * as regexpp from '@eslint-community/regexpp';
import type { RegExpVisitor } from '@eslint-community/regexpp/visitor';
import { isStringRegexMethodCall } from './ast.js';
import { getParsedRegex } from './extract.js';
import { getRegexpLocation } from './location.js';
import { isRequiredParserServices, IssueLocation, report } from '../index.js';

/**
 * Rule context for regex rules that also includes the original ESLint node
 * denoting the regular expression (string) literal.
 */
export type RegexRuleContext = Rule.RuleContext & {
  node: estree.Node;
  reportRegExpNode: (
    descriptor: RegexReportDescriptor,
    secondaryLocations?: IssueLocation[],
  ) => void;
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
  meta: Rule.RuleMetaData = {},
): Rule.RuleModule {
  return {
    meta,
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

      function reportRegExpNode(
        descriptor: RegexReportDescriptor,
        secondaryLocations?: IssueLocation[],
      ) {
        const { node, regexpNode, offset = [0, 0], ...rest } = descriptor;
        const loc = getRegexpLocation(node, regexpNode, context, offset);
        if (loc) {
          report(context, { ...rest, loc }, secondaryLocations);
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
