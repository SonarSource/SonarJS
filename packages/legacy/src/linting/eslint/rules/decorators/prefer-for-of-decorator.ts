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
// https://sonarsource.github.io/rspec/#/rspec/S4138/javascript

import { Rule, AST, Scope } from 'eslint';
import { interceptReport } from './helpers';
import * as estree from 'estree';
import { TSESTree } from '@typescript-eslint/experimental-utils';

const element = 'element';

// core implementation of this rule does not provide quick fixes
export function decoratePreferForOf(rule: Rule.RuleModule): Rule.RuleModule {
  rule.meta!.hasSuggestions = true;
  return interceptReport(rule, (context, reportDescriptor) => {
    const forStmt = (reportDescriptor as any).node as estree.ForStatement;
    const suggest: Rule.SuggestionReportDescriptor[] = [];
    if (isFixable(context.getScope())) {
      suggest.push({
        desc: 'Replace with "for of" loop',
        fix: fixer => rewriteForStatement(forStmt, context, fixer),
      });
    }
    context.report({
      ...reportDescriptor,
      suggest,
    });
  });
}

function isFixable(scope: Scope.Scope): boolean {
  return (
    scope.references.every(reference => reference.identifier.name !== element) &&
    scope.childScopes.every(isFixable)
  );
}

function rewriteForStatement(
  forStmt: estree.ForStatement,
  context: Rule.RuleContext,
  fixer: Rule.RuleFixer,
) {
  const fixes: Rule.Fix[] = [];

  /* rewrite `for` header: `(init; test; update)` -> `(const element of <array>) ` */
  const openingParenthesis = context
    .getSourceCode()
    .getFirstToken(forStmt, token => token.value === '(')!;
  const closingParenthesis = context
    .getSourceCode()
    .getTokenBefore(forStmt.body, token => token.value === ')')!;

  const arrayExpr = extractArrayExpression(forStmt);
  const arrayText = context.getSourceCode().getText(arrayExpr);

  const headerRange: AST.Range = [openingParenthesis.range[1], closingParenthesis.range[0]];
  const headerText = `const ${element} of ${arrayText}`;
  fixes.push(fixer.replaceTextRange(headerRange, headerText));

  /* rewrite `for` body: `<array>[<index>]` -> `element` */
  const [indexVar] = context.getDeclaredVariables(forStmt.init!);
  for (const reference of indexVar.references) {
    const id = reference.identifier;
    if (contains(forStmt.body, id)) {
      const arrayAccess = (id as TSESTree.Node).parent as estree.Node;
      fixes.push(fixer.replaceText(arrayAccess, element));
    }
  }

  return fixes;
}

function extractArrayExpression(forStmt: estree.ForStatement) {
  return ((forStmt.test as estree.BinaryExpression).right as estree.MemberExpression).object;
}

function contains(outer: estree.Node, inner: estree.Node) {
  return outer.range![0] <= inner.range![0] && outer.range![1] >= inner.range![1];
}
