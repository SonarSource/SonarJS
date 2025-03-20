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
import { AST, Rule } from 'eslint';
import estree from 'estree';
import { generateMeta, interceptReport } from '../helpers/index.js';
import * as meta from './generated-meta.js';

type NullableToken = AST.Token | null | undefined;
type NodeCondition = (context: Rule.RuleContext, node: estree.Node) => boolean;

// core implementation of this rule raises issues when using semicolon-free style and
// using semicolon to protect code on purpose.
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
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
