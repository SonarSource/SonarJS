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
// https://sonarsource.github.io/rspec/#/rspec/S4138/javascript

import { AST, Rule, Scope } from 'eslint';
import { generateMeta, interceptReport } from '../helpers/index.js';
import estree from 'estree';
import type { TSESTree } from '@typescript-eslint/utils';
import { meta } from './meta.js';

const element = 'element';

// core implementation of this rule does not provide quick fixes
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta as Rule.RuleMetaData, {
        ...rule.meta!,
        hasSuggestions: true,
      }),
    },
    (context, reportDescriptor) => {
      const forStmt = (reportDescriptor as any).node as estree.ForStatement;
      const suggest: Rule.SuggestionReportDescriptor[] = [];
      if (isFixable(context.sourceCode.getScope(forStmt))) {
        suggest.push({
          desc: 'Replace with "for of" loop',
          fix: fixer => rewriteForStatement(forStmt, context, fixer),
        });
      }
      context.report({
        ...reportDescriptor,
        suggest,
      });
    },
  );
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
  const openingParenthesis = context.sourceCode.getFirstToken(
    forStmt,
    token => token.value === '(',
  )!;
  const closingParenthesis = context.sourceCode.getTokenBefore(
    forStmt.body,
    token => token.value === ')',
  )!;

  const arrayExpr = extractArrayExpression(forStmt);
  const arrayText = context.sourceCode.getText(arrayExpr);

  const headerRange: AST.Range = [openingParenthesis.range[1], closingParenthesis.range[0]];
  const headerText = `const ${element} of ${arrayText}`;
  fixes.push(fixer.replaceTextRange(headerRange, headerText));

  /* rewrite `for` body: `<array>[<index>]` -> `element` */
  const [indexVar] = context.sourceCode.getDeclaredVariables(forStmt.init!);
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
