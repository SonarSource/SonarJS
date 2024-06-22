/*
 * eslint-plugin-sonarjs
 * Copyright (C) 2018-2021 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S2589

import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import { report } from '../utils/locations';
import { isIdentifier, isIfStatement } from '../utils/nodes';
import docsUrl from '../utils/docs-url';

const message = 'This always evaluates to {{value}}. Consider refactoring this code.';

const rule: TSESLint.RuleModule<string, string[]> = {
  defaultOptions: [],
  meta: {
    messages: {
      refactorBooleanExpression: message,
      sonarRuntime: '{{sonarRuntimeData}}',
    },
    type: 'suggestion',
    docs: {
      description: 'Boolean expressions should not be gratuitous',
      recommended: 'recommended',
      url: docsUrl(__filename),
    },
    schema: [
      {
        // internal parameter for rules having secondary locations
        type: 'string',
        enum: ['sonar-runtime'],
      },
    ],
  },
  create(context) {
    const truthyMap: Map<TSESTree.Statement, TSESLint.Scope.Reference[]> = new Map();
    const falsyMap: Map<TSESTree.Statement, TSESLint.Scope.Reference[]> = new Map();

    function isInsideJSX(node: TSESTree.Node): boolean {
      const ancestors = context.sourceCode.getAncestors(node);
      return !!ancestors.find(ancestor => ancestor.type === 'JSXExpressionContainer');
    }

    return {
      IfStatement: (node: TSESTree.Node) => {
        const { test } = node as TSESTree.IfStatement;
        if (test.type === 'Literal' && typeof test.value === 'boolean') {
          reportIssue(test, undefined, context, test.value);
        }
      },

      ':statement': (node: TSESTree.Node) => {
        const { parent } = node;
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

      ':statement:exit': (node: TSESTree.Node) => {
        const stmt = node as TSESTree.Statement;
        truthyMap.delete(stmt);
        falsyMap.delete(stmt);
      },

      Identifier: (node: TSESTree.Node) => {
        const id = node as TSESTree.Identifier;
        const symbol = getSymbol(id, context.sourceCode.getScope(node));
        const { parent } = node;
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
          map: Map<TSESTree.Statement, TSESLint.Scope.Reference[]>,
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

function getSymbol(id: TSESTree.Identifier, scope: TSESLint.Scope.Scope) {
  const ref = scope.references.find(r => r.identifier === id);
  if (ref) {
    return ref.resolved;
  }
  return null;
}

function getFunctionScope(scope: TSESLint.Scope.Scope): TSESLint.Scope.Scope | null {
  if (scope.type === 'function') {
    return scope;
  } else if (!scope.upper) {
    return null;
  }
  return getFunctionScope(scope.upper);
}

function mightBeWritten(symbol: TSESLint.Scope.Variable, currentScope: TSESLint.Scope.Scope) {
  return symbol.references
    .filter(ref => ref.isWrite())
    .find(ref => {
      const refScope = ref.from;

      let cur: TSESLint.Scope.Scope | null = refScope;
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

function transformAndFilter(ids: TSESTree.Identifier[], currentScope: TSESLint.Scope.Scope) {
  return ids
    .map(id => currentScope.upper?.references.find(r => r.identifier === id))
    .filter(isDefined)
    .filter(ref => isDefined(ref.resolved))
    .filter(ref => !mightBeWritten(ref.resolved!, currentScope));
}

function reportIssue(
  id: TSESTree.Node,
  ref: TSESLint.Scope.Reference | undefined,
  context: TSESLint.RuleContext<string, string[]>,
  truthy: boolean,
) {
  const value = truthy ? 'truthy' : 'falsy';
  report(
    context,
    {
      messageId: 'refactorBooleanExpression',
      data: {
        value,
      },
      node: id,
    },
    getSecondaryLocations(ref, value),
    message,
  );
}

function getSecondaryLocations(ref: TSESLint.Scope.Reference | undefined, truthy: string) {
  if (ref) {
    const secLoc = ref.identifier.loc!;
    return [
      {
        message: `Evaluated here to be ${truthy}`,
        line: secLoc.start.line,
        column: secLoc.start.column,
        endLine: secLoc.end.line,
        endColumn: secLoc.end.column,
      },
    ];
  } else {
    return [];
  }
}

export = rule;
