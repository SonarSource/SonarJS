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
import { AST, Rule } from 'eslint';
import * as estree from 'estree';
import { generateMeta, interceptReport } from '../helpers';
import { meta } from './meta';

type NullableToken = AST.Token | null | undefined;
type NodeCondition = (context: Rule.RuleContext, node: estree.Node) => boolean;

// core implementation of this rule raises issues when using semicolon-free style and
// using semicolon to protect code on purpose.
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta as Rule.RuleMetaData, rule.meta),
    },
    reportExempting(isProtectionSemicolon),
  );
}

function reportExempting(exemptionCondition: NodeCondition) {
  return (context: Rule.RuleContext, reportDescriptor: Rule.ReportDescriptor): void => {
    if ('node' in reportDescriptor && !exemptionCondition(context, reportDescriptor.node)) {
      context.report(reportDescriptor);
    }
  };
}

// Checks that a node is a semicolon inserted to prevent the compiler from merging the
// following statement with the previous.
export function isProtectionSemicolon(context: Rule.RuleContext, node: estree.Node): boolean {
  if (node.type !== 'EmptyStatement') {
    return false;
  }

  // This checks the semicolon is on a new line compared to the previous token if it exists.
  const previousToken = context.sourceCode.getTokenBefore(node);
  if (!isNodeOnNewLineAfterToken(node, previousToken)) {
    return false;
  }

  const nextToken = context.sourceCode.getTokenAfter(node);
  return isParenOrBracket(nextToken);
}

function isNodeOnNewLineAfterToken(node: estree.Node, token: NullableToken): boolean {
  if (node.loc == null) {
    return false;
  } else if (token == null) {
    return true;
  } else {
    return token.loc.end.line < node.loc.start.line;
  }
}

function isParenOrBracket(token: NullableToken): boolean {
  return token?.type === 'Punctuator' && (token.value === '[' || token.value === '(');
}
