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
// https://sonarsource.github.io/rspec/#/rspec/S2259/javascript

import { Rule, Scope } from 'eslint';
import type estree from 'estree';
import type { TSESTree } from '@typescript-eslint/utils';
import {
  areEquivalent,
  findFirstMatchingAncestor,
  functionLike,
  generateMeta,
  isNullLiteral,
  isRequiredParserServices,
  isUndefined,
  isUndefinedOrNull,
} from '../helpers/index.js';
import * as meta from './generated-meta.js';

enum Null {
  confirmed,
  discarded,
  unknown,
}

function isNull(n: estree.Node): boolean {
  return isNullLiteral(n) || isUndefined(n);
}

const equalOperators = new Set(['==', '===']);
const notEqualOperators = new Set(['!=', '!==']);

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      nullDereference: 'TypeError can be thrown as "{{symbol}}" might be null or undefined here.',
      shortCircuitError: 'TypeError can be thrown as expression might be null or undefined here.',
    },
  }),
  create(context: Rule.RuleContext) {
    if (!isRequiredParserServices(context.sourceCode.parserServices)) {
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
          const ancestors = context.sourceCode.getAncestors(node);
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

function getNullState(
  expr: estree.BinaryExpression,
  node: estree.Node,
  context: Rule.RuleContext,
): Null {
  const { left, right } = expr;
  if (
    (isNull(right) &&
      areEquivalent(left as TSESTree.Node, node as TSESTree.Node, context.sourceCode)) ||
    (isNull(left) &&
      areEquivalent(right as TSESTree.Node, node as TSESTree.Node, context.sourceCode))
  ) {
    if (notEqualOperators.has(expr.operator)) {
      return Null.discarded;
    }
    if (equalOperators.has(expr.operator)) {
      return Null.confirmed;
    }
  }
  return Null.unknown;
}

function checkLogicalNullDereference(
  expr: estree.LogicalExpression,
  node: estree.Node,
  context: Rule.RuleContext,
) {
  if (expr.left.type === 'BinaryExpression') {
    const nullState = getNullState(expr.left, node, context);
    if (
      (nullState === Null.confirmed && expr.operator === '&&') ||
      (nullState === Null.discarded && expr.operator === '||')
    ) {
      context.report({
        messageId: 'shortCircuitError',
        node,
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

function checkNullDereference(
  node: estree.Node,
  context: Rule.RuleContext,
  alreadyRaisedSymbols: Set<Scope.Variable>,
) {
  if (node.type !== 'Identifier') {
    return;
  }
  const scope = context.sourceCode.getScope(node);
  const symbol = scope.references.find(v => v.identifier === node)?.resolved;
  if (!symbol) {
    return;
  }

  const enclosingFunction = context.sourceCode
    .getAncestors(node)
    .find(n => functionLike.has(n.type));

  if (
    !alreadyRaisedSymbols.has(symbol) &&
    !isWrittenInInnerFunction(symbol, enclosingFunction) &&
    isUndefinedOrNull(node, context.sourceCode.parserServices)
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
