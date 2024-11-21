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
// https://sonarsource.github.io/rspec/#/rspec/S2589

import type { TSESTree } from '@typescript-eslint/utils';
import { Rule, Scope } from 'eslint';
import {
  generateMeta,
  isIdentifier,
  isIfStatement,
  report,
  RuleContext,
  toSecondaryLocation,
} from '../helpers/index.js';
import estree from 'estree';
import { meta } from './meta.js';

const message = 'This always evaluates to {{value}}. Consider refactoring this code.';

export const rule: Rule.RuleModule = {
  meta: generateMeta(
    meta as Rule.RuleMetaData,
    {
      messages: {
        refactorBooleanExpression: message,
      },
    },
    true,
  ),
  create(context) {
    const truthyMap: Map<TSESTree.Statement, Scope.Reference[]> = new Map();
    const falsyMap: Map<TSESTree.Statement, Scope.Reference[]> = new Map();

    function isInsideJSX(node: estree.Node): boolean {
      const ancestors = (context as unknown as RuleContext).sourceCode.getAncestors(
        node as TSESTree.Node,
      );
      return !!ancestors.find(ancestor => ancestor.type === 'JSXExpressionContainer');
    }

    return {
      IfStatement: (node: estree.Node) => {
        const { test } = node as TSESTree.IfStatement;
        if (test.type === 'Literal' && typeof test.value === 'boolean') {
          reportIssue(test, undefined, context, test.value);
        }
      },

      ':statement': (node: estree.Node) => {
        const { parent } = node as TSESTree.Node;
        if (isIfStatement(parent)) {
          // we visit 'consequent' and 'alternate' and not if-statement directly in order to get scope for 'consequent'
          const currentScope = context.sourceCode.getScope(node);

          if (parent.consequent === node) {
            const { truthy, falsy } = collectKnownIdentifiers(parent.test);
            truthyMap.set(parent.consequent, transformAndFilter(truthy, currentScope));
            falsyMap.set(parent.consequent, transformAndFilter(falsy, currentScope));
          } else if (parent.alternate === node && isIdentifier(parent.test)) {
            falsyMap.set(parent.alternate, transformAndFilter([parent.test], currentScope));
          }
        }
      },

      ':statement:exit': (node: estree.Node) => {
        const stmt = node as TSESTree.Statement;
        truthyMap.delete(stmt);
        falsyMap.delete(stmt);
      },

      Identifier: (node: estree.Node) => {
        const id = node as TSESTree.Identifier;
        const symbol = getSymbol(id, context.sourceCode.getScope(node));
        const { parent } = node as TSESTree.Node;
        if (!symbol || !parent || (isInsideJSX(node) && isLogicalAndRhs(id, parent))) {
          return;
        }
        if (
          !isLogicalAnd(parent) &&
          !isLogicalOrLhs(id, parent) &&
          !isIfStatement(parent) &&
          !isLogicalNegation(parent)
        ) {
          return;
        }

        const checkIfKnownAndReport = (
          map: Map<TSESTree.Statement, Scope.Reference[]>,
          truthy: boolean,
        ) => {
          map.forEach(references => {
            const ref = references.find(ref => ref.resolved === symbol);
            if (ref) {
              reportIssue(id, ref, context, truthy);
            }
          });
        };

        checkIfKnownAndReport(truthyMap, true);
        checkIfKnownAndReport(falsyMap, false);
      },

      Program: () => {
        truthyMap.clear();
        falsyMap.clear();
      },
    };
  },
};

function collectKnownIdentifiers(expression: TSESTree.Expression) {
  const truthy: TSESTree.Identifier[] = [];
  const falsy: TSESTree.Identifier[] = [];

  const checkExpr = (expr: TSESTree.Expression) => {
    if (isIdentifier(expr)) {
      truthy.push(expr);
    } else if (isLogicalNegation(expr)) {
      if (isIdentifier(expr.argument)) {
        falsy.push(expr.argument);
      } else if (isLogicalNegation(expr.argument) && isIdentifier(expr.argument.argument)) {
        truthy.push(expr.argument.argument);
      }
    }
  };

  let current = expression;
  checkExpr(current);
  while (isLogicalAnd(current)) {
    checkExpr(current.right);
    current = current.left;
  }
  checkExpr(current);

  return { truthy, falsy };
}

function isLogicalAnd(expression: TSESTree.Node): expression is TSESTree.LogicalExpression {
  return expression.type === 'LogicalExpression' && expression.operator === '&&';
}

function isLogicalOrLhs(
  id: TSESTree.Identifier,
  expression: TSESTree.Node,
): expression is TSESTree.LogicalExpression {
  return (
    expression.type === 'LogicalExpression' &&
    expression.operator === '||' &&
    expression.left === id
  );
}

function isLogicalAndRhs(
  id: TSESTree.Identifier,
  expression: TSESTree.Node,
): expression is TSESTree.LogicalExpression {
  return (
    expression.parent?.type !== 'LogicalExpression' &&
    expression.type === 'LogicalExpression' &&
    expression.operator === '&&' &&
    expression.right === id
  );
}

function isLogicalNegation(expression: TSESTree.Node): expression is TSESTree.UnaryExpression {
  return expression.type === 'UnaryExpression' && expression.operator === '!';
}

function isDefined<T>(x: T | undefined | null): x is T {
  return x != null;
}

function getSymbol(id: estree.Identifier, scope: Scope.Scope) {
  const ref = scope.references.find(r => r.identifier === id);
  if (ref) {
    return ref.resolved;
  }
  return null;
}

function getFunctionScope(scope: Scope.Scope): Scope.Scope | null {
  if (scope.type === 'function') {
    return scope;
  } else if (!scope.upper) {
    return null;
  }
  return getFunctionScope(scope.upper);
}

function mightBeWritten(symbol: Scope.Variable, currentScope: Scope.Scope) {
  return symbol.references
    .filter(ref => ref.isWrite())
    .find(ref => {
      const refScope = ref.from;

      let cur: Scope.Scope | null = refScope;
      while (cur) {
        if (cur === currentScope) {
          return true;
        }
        cur = cur.upper;
      }

      const currentFunc = getFunctionScope(currentScope);
      const refFunc = getFunctionScope(refScope);
      return refFunc !== currentFunc;
    });
}

function transformAndFilter(ids: TSESTree.Identifier[], currentScope: Scope.Scope) {
  return ids
    .map(id => currentScope.upper?.references.find(r => r.identifier === id))
    .filter(isDefined)
    .filter(ref => isDefined(ref.resolved))
    .filter(ref => !mightBeWritten(ref.resolved!, currentScope));
}

function reportIssue(
  id: estree.Node,
  ref: Scope.Reference | undefined,
  context: Rule.RuleContext,
  truthy: boolean,
) {
  const value = truthy ? 'truthy' : 'falsy';
  report(
    context,
    {
      message,
      data: {
        value,
      },
      node: id,
    },
    ref?.identifier ? [toSecondaryLocation(ref.identifier, `Evaluated here to be ${value}`)] : [],
  );
}
