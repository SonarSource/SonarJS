/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S22259/javascript

import { Rule, Scope } from 'eslint';
import * as estree from 'estree';
import { TSESTree } from '@typescript-eslint/experimental-utils';
import {
  isRequiredParserServices,
  functionLike,
  isUndefinedOrNull,
  findFirstMatchingAncestor,
  RuleContext,
  not_equal,
  equal,
  isNullish,
} from '../utils';
import { areEquivalent } from 'eslint-plugin-sonarjs/lib/utils/equivalence';

export enum Nullish {
  confirmed,
  discarded,
  unknown,
}

//Check nullish value implicitly by Binary Expression
function binaryExpressionImplicitNullish(
  expr: estree.BinaryExpression,
  id: estree.Node,
  context: RuleContext,
): Nullish {
  const { left, right } = expr;
  if (
    (isNullish(right) &&
      areEquivalent(left as TSESTree.Node, id as TSESTree.Node, context.getSourceCode())) ||
    (isNullish(left) &&
      areEquivalent(right as TSESTree.Node, id as TSESTree.Node, context.getSourceCode()))
  ) {
    if (not_equal.has(expr.operator)) return Nullish.discarded;
    if (equal.has(expr.operator)) return Nullish.confirmed;
  }
  return Nullish.unknown;
}

//Check Null Dereference by implicit logical expression
function checkLogicalNullDereference(
  expr: estree.LogicalExpression,
  id: estree.Node,
  context: Rule.RuleContext,
) {
  if (expr.left.type === 'BinaryExpression') {
    const nullish = binaryExpressionImplicitNullish(
      expr.left,
      id,
      context as unknown as RuleContext,
    );
    if (
      (nullish === Nullish.confirmed && expr.operator === '&&') ||
      (nullish === Nullish.discarded && expr.operator === '||')
    ) {
      context.report({
        messageId: 'shortCircuitError',
        node: id,
      });
    }
  }
}

function isWrittenInInnerFunction(symbol: Scope.Variable, fn: estree.Node | undefined) {
  return symbol.references.some(ref => {
    if (ref.isWrite() && ref.identifier.hasOwnProperty('parent')) {
      const enclosingFn = findFirstMatchingAncestor(ref.identifier as TSESTree.Node, node =>
        functionLike.has(node.type),
      );
      return enclosingFn && enclosingFn !== fn;
    }
    return false;
  });
}

//Check NullDereference in scope declaration
function checkNullDereference(
  node: estree.Node,
  context: Rule.RuleContext,
  alreadyRaisedSymbols: Set<Scope.Variable>,
) {
  if (node.type !== 'Identifier') {
    return;
  }
  const scope = context.getScope();
  const symbol = scope.references.find(v => v.identifier === node)?.resolved;
  if (!symbol) {
    return;
  }

  const enclosingFunction = context.getAncestors().find(n => functionLike.has(n.type));

  if (
    !alreadyRaisedSymbols.has(symbol) &&
    !isWrittenInInnerFunction(symbol, enclosingFunction) &&
    isUndefinedOrNull(node, context.parserServices)
  ) {
    alreadyRaisedSymbols.add(symbol);
    context.report({
      messageId: 'nullDereference',
      data: {
        symbol: node.name,
      },
      node,
    });
  }
}

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      nullDereference: 'TypeError can be thrown as "{{symbol}}" might be null or undefined here.',
      shortCircuitError: 'MemberExpression on null or undefined reference',
    },
  },
  create(context: Rule.RuleContext) {
    if (!isRequiredParserServices(context.parserServices)) {
      return {};
    }
    const alreadyRaisedSymbols: Set<Scope.Variable> = new Set();

    return {
      MemberExpression(node: estree.Node) {
        const { object, optional } = node as estree.MemberExpression;
        if (!optional) {
          checkNullDereference(object, context, alreadyRaisedSymbols);
        }
      },
      'LogicalExpression MemberExpression'(node: estree.Node) {
        const { object, optional } = node as estree.MemberExpression;
        if (!optional) {
          const ancestors = context.getAncestors();
          const enclosingLogicalExpression = ancestors.find(
            n => n.type === 'LogicalExpression',
          ) as estree.LogicalExpression;
          checkLogicalNullDereference(enclosingLogicalExpression, object, context);
        }
      },
      ForOfStatement(node: estree.Node) {
        const { right } = node as estree.ForOfStatement;
        checkNullDereference(right, context, alreadyRaisedSymbols);
      },
      'Program:exit'() {
        alreadyRaisedSymbols.clear();
      },
    };
  },
};
