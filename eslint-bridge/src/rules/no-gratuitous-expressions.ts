/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2019 SonarSource SA
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
// https://jira.sonarsource.com/browse/RSPEC-2589

import { Rule, Scope } from "eslint";
import * as estree from "estree";
import { isIdentifier, getParent, isIfStatement } from "eslint-plugin-sonarjs/lib/utils/nodes";
import { EncodedMessage } from "eslint-plugin-sonarjs/lib/utils/locations";

export const rule: Rule.RuleModule = {
  meta: {
    schema: [
      {
        // internal parameter for rules having secondary locations
        enum: ["sonar-runtime"],
      },
    ],
  },

  create(context: Rule.RuleContext) {
    const truthyMap: Map<estree.Statement, Scope.Reference[]> = new Map();
    const falsyMap: Map<estree.Statement, Scope.Reference[]> = new Map();

    return {
      IfStatement: (node: estree.Node) => {
        const test = (node as estree.IfStatement).test;
        if (test.type === "Literal" && typeof test.value === "boolean") {
          report(test, undefined, context, test.value);
        }
      },

      ":statement": (node: estree.Node) => {
        const parent = getParent(context);
        if (parent && isIfStatement(parent)) {
          // we visit 'consequent' and 'alternate' and not if-statement directly in order to get scope for 'consequent'
          const currentScope = context.getScope();

          if (parent.consequent === node) {
            const { truthy, falsy } = collectKnownIdentifiers(parent.test);
            truthyMap.set(parent.consequent, transformAndFilter(truthy, currentScope));
            falsyMap.set(parent.consequent, transformAndFilter(falsy, currentScope));
          } else if (parent.alternate === node && isIdentifier(parent.test)) {
            falsyMap.set(parent.alternate, transformAndFilter([parent.test], currentScope));
          }
        }
      },

      ":statement:exit": (node: estree.Node) => {
        const stmt = node as estree.Statement;
        truthyMap.delete(stmt);
        falsyMap.delete(stmt);
      },

      Identifier: (node: estree.Node) => {
        const id = node as estree.Identifier;
        const symbol = getSymbol(id, context.getScope());
        const parent = getParent(context);
        if (!symbol || !parent) {
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
          map: Map<estree.Statement, Scope.Reference[]>,
          truthy: boolean,
        ) => {
          map.forEach(references => {
            const ref = references.find(ref => ref.resolved === symbol);
            if (ref) {
              report(id, ref, context, truthy);
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

function collectKnownIdentifiers(expression: estree.Expression) {
  const truthy: estree.Identifier[] = [];
  const falsy: estree.Identifier[] = [];

  const checkExpr = (expr: estree.Expression) => {
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

function isLogicalAnd(expression: estree.Node): expression is estree.LogicalExpression {
  return expression.type === "LogicalExpression" && expression.operator === "&&";
}

function isLogicalOrLhs(
  id: estree.Identifier,
  expression: estree.Node,
): expression is estree.LogicalExpression {
  return (
    expression.type === "LogicalExpression" &&
    expression.operator === "||" &&
    expression.left === id
  );
}

function isLogicalNegation(expression: estree.Node): expression is estree.UnaryExpression {
  return expression.type === "UnaryExpression" && expression.operator === "!";
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
  if (scope.type === "function") {
    return scope;
  } else if (!scope.upper) {
    return null;
  }
  return getFunctionScope(scope.upper);
}

function mightBeWritten(symbol: Scope.Variable, currentScope: Scope.Scope) {
  return symbol.references.filter(ref => ref.isWrite()).find(ref => {
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

function transformAndFilter(ids: estree.Identifier[], currentScope: Scope.Scope) {
  return ids
    .map(id => currentScope.upper!.references.find(r => r.identifier === id))
    .filter(isDefined)
    .filter(ref => isDefined(ref.resolved))
    .filter(ref => !mightBeWritten(ref.resolved!, currentScope));
}

function report(
  id: estree.Node,
  ref: Scope.Reference | undefined,
  context: Rule.RuleContext,
  truthy: boolean,
) {
  const value = truthy ? "truthy" : "falsy";

  const encodedMessage: EncodedMessage = {
    message: `This always evaluates to ${value}. Consider refactoring this code.`,
    secondaryLocations: getSecondaryLocations(ref, value),
  };

  context.report({
    message: JSON.stringify(encodedMessage),
    node: id,
  });
}

function getSecondaryLocations(ref: Scope.Reference | undefined, truthy: string) {
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
