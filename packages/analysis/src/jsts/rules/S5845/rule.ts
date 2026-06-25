/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// https://sonarsource.github.io/rspec/#/rspec/S5845/javascript

import type { Rule, Scope } from 'eslint';
import type estree from 'estree';
import ts from 'typescript';
import { getVariableFromName } from '../helpers/ast.js';
import { type Assertion, extractTestAssertion } from '../helpers/assertions.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { isRequiredParserServices } from '../helpers/parser-services.js';
import { getTypeFromTreeNode } from '../helpers/type.js';
import * as meta from './generated-meta.js';

const messages = {
  incompatibleStaticTypes:
    'Review this equality assertion: the compared expressions have incompatible static types ("{{actual}}" and "{{expected}}").',
};

type PrimitiveCategory =
  | 'string'
  | 'number'
  | 'boolean'
  | 'bigint'
  | 'symbol'
  | 'null'
  | 'undefined'
  | 'object';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages }),
  /*
   * High-level idea:
   * - only run when the parser provides type information;
   * - only analyse strict and deep equality assertions;
   * - reduce both assertion operands to broad primitive families instead of comparing exact
   *   TypeScript types, because the rule is meant to highlight incompatible static typings on
   *   equality checks rather than to model all runtime equality behavior;
   * - stay conservative whenever the type is imprecise (`any`, `unknown`, type parameters, etc.),
   *   or when a mutable identifier may have been reassigned to a different family.
   */
  create(context: Rule.RuleContext) {
    const services = context.sourceCode.parserServices;
    if (!isRequiredParserServices(services)) {
      return {};
    }

    const checker = services.program.getTypeChecker();
    const monkeyPatchedReceivers = new Set<Scope.Variable>();

    // Expressions that are not rooted in a mutable local binding can rely directly on the
    // expression type at the assertion site:
    //   expect(getCount()).toBe('1');
    //   expect(Number(title)).toBe('1');
    //
    // Bare identifiers and member expressions rooted in an identifier need one extra guard.
    // `getTypeAtLocation(value)` can stay narrow even after an imprecise write, so using the
    // current type alone would introduce false positives:
    //   declare function readAny(): any;
    //   let value: number = 1;
    //   value = readAny();
    //   expect(value).toBe('1'); // keep silent: runtime value may be string
    //   let user: { id: number } = { id: 1 };
    //   user = readAny();
    //   expect(user.id).toBe('1'); // keep silent for the same reason
    //
    // We therefore trust the current type only when the root identifier of the expression has only
    // been written with values that are themselves classifiable to primitive families. That still
    // lets TypeScript's flow narrowing do the useful work for precise writes:
    //   let value: number | string;
    //   if (Math.random() > 0.5) value = 'ready'; else value = 1;
    //   if (typeof value === 'string') expect(value).toBe(true); // report
    //
    // This is intentionally coarser than full reaching-definitions. If any write is `any`,
    // `unknown`, a type parameter, indexed access, etc., we bail out conservatively.
    function checkAssertion(node: estree.Node): void {
      const assertion = extractTestAssertion(context, node);
      if (!isRelevantAssertion(assertion)) {
        return;
      }

      const actualType = checker.getBaseTypeOfLiteralType(
        getTypeFromTreeNode(assertion.actual, services),
      );
      const expectedType = checker.getBaseTypeOfLiteralType(
        getTypeFromTreeNode(assertion.expected, services),
      );
      if (
        !hasStablePrimitiveType(assertion.actual, actualType) ||
        !hasStablePrimitiveType(assertion.expected, expectedType)
      ) {
        return;
      }

      const incompatibility = getIncompatibility(actualType, expectedType, checker);
      if (incompatibility) {
        context.report({
          node: assertion.reportNode,
          messageId: 'incompatibleStaticTypes',
          data: incompatibility,
        });
      }
    }

    function hasStablePrimitiveType(node: estree.Node, nodeType: ts.Type): boolean {
      const monkeyPatchedReceiver = getMonkeyPatchedReceiver(node);
      if (monkeyPatchedReceiver) {
        return false;
      }
      const allowedCategories = getPrimitiveCategories(nodeType);
      if (!allowedCategories) {
        return false;
      }
      const rootIdentifier = getRootIdentifier(node);
      if (!rootIdentifier) {
        return true;
      }

      const variable = getVariableFromName(context, rootIdentifier.name, node);
      if (!variable) {
        return true;
      }
      return variable.references
        .filter(ref => ref.isWrite())
        .every(ref => isPreciselyTypedWrite(ref.writeExpr, checker, services));
    }

    function getMonkeyPatchedReceiver(node: estree.Node): Scope.Variable | null {
      if (node.type !== 'CallExpression' || node.callee.type !== 'MemberExpression') {
        return null;
      }

      const rootIdentifier = getRootIdentifier(node.callee.object);
      if (!rootIdentifier) {
        return null;
      }

      const variable = getVariableFromName(context, rootIdentifier.name, node);
      return variable && monkeyPatchedReceivers.has(variable) ? variable : null;
    }

    function collectMonkeyPatchedReceiver(node: estree.Node): void {
      if (
        node.type !== 'AssignmentExpression' ||
        node.operator !== '=' ||
        node.left.type !== 'MemberExpression' ||
        !isFunctionLikeExpression(node.right)
      ) {
        return;
      }

      const rootIdentifier = getRootIdentifier(node.left.object);
      if (!rootIdentifier) {
        return;
      }

      const variable = getVariableFromName(context, rootIdentifier.name, node);
      if (variable) {
        monkeyPatchedReceivers.add(variable);
      }
    }

    return {
      AssignmentExpression(node: estree.Node) {
        collectMonkeyPatchedReceiver(node);
      },
      CallExpression(node: estree.Node) {
        checkAssertion(node);
      },
    };
  },
};

// Strict and deep equality assertions are in scope. Loose equality depends on coercion, while
// deep equality is relevant here because the rule only reasons about primitive type families.
function isRelevantAssertion(assertion: Assertion | null): assertion is Assertion & {
  kind: 'comparison';
  comparison: 'strict' | 'deep';
} {
  return (
    assertion?.kind === 'comparison' &&
    (assertion.comparison === 'strict' || assertion.comparison === 'deep')
  );
}

// The rule reports only when the two operands have no plausible primitive-family overlap.
// If they share a family, or either side falls into a conservative family, we skip reporting.
function getIncompatibility(
  actualType: ts.Type,
  expectedType: ts.Type,
  checker: ts.TypeChecker,
): { actual: string; expected: string } | null {
  const actualCategories = getPrimitiveCategories(actualType);
  const expectedCategories = getPrimitiveCategories(expectedType);

  if (!actualCategories || !expectedCategories) {
    return null;
  }

  for (const actualCategory of actualCategories) {
    for (const expectedCategory of expectedCategories) {
      if (
        actualCategory === expectedCategory ||
        isConservativeCategory(actualCategory) ||
        isConservativeCategory(expectedCategory)
      ) {
        return null;
      }
    }
  }

  return {
    actual: checker.typeToString(actualType),
    expected: checker.typeToString(expectedType),
  };
}

// Objects, null, and undefined are kept conservative because structural typing and JS runtime
// behavior make "always incompatible" claims too risky for this rule.
function isConservativeCategory(category: PrimitiveCategory | null): boolean {
  return category === 'object' || category === 'null' || category === 'undefined';
}

// Normalise scalar and union types to a flat list so the rest of the logic can treat both cases
// uniformly.
function getUnionMembers(type: ts.Type): ts.Type[] {
  return type.isUnion() ? type.types : [type];
}

// Collapse a TypeScript type into primitive families. If any union member is too imprecise to
// classify, return null so callers can stay conservative.
function getPrimitiveCategories(type: ts.Type): PrimitiveCategory[] | null {
  const categories = getUnionMembers(type).map(getPrimitiveCategory);
  return categories.every(isPrimitiveCategory) ? categories : null;
}

// Translate the detailed TypeScript type system into the coarse families this rule reasons about.
// Anything outside those obvious buckets is treated as indeterminate.
function getPrimitiveCategory(type: ts.Type): PrimitiveCategory | null {
  const indeterminateFlags =
    ts.TypeFlags.Any |
    ts.TypeFlags.Unknown |
    ts.TypeFlags.TypeParameter |
    ts.TypeFlags.IndexedAccess;
  if ((type.flags & indeterminateFlags) !== 0) {
    return null;
  }
  if ((type.flags & ts.TypeFlags.StringLike) !== 0) {
    return 'string';
  }
  if ((type.flags & ts.TypeFlags.NumberLike) !== 0) {
    return 'number';
  }
  if ((type.flags & ts.TypeFlags.BooleanLike) !== 0) {
    return 'boolean';
  }
  if ((type.flags & ts.TypeFlags.BigIntLike) !== 0) {
    return 'bigint';
  }
  if ((type.flags & ts.TypeFlags.ESSymbolLike) !== 0) {
    return 'symbol';
  }
  if ((type.flags & ts.TypeFlags.Null) !== 0) {
    return 'null';
  }
  if ((type.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Void)) !== 0) {
    return 'undefined';
  }
  if ((type.flags & ts.TypeFlags.Object) !== 0) {
    return 'object';
  }
  return null;
}

// Narrow the mapped category list back to `PrimitiveCategory[]` once null has been ruled out.
function isPrimitiveCategory(category: PrimitiveCategory | null): category is PrimitiveCategory {
  return category !== null;
}

// A write is trustworthy when TypeScript can still classify the assigned value into primitive
// families at the write site. If not, the identifier's current type is not reliable enough for
// this rule:
//   value = readAny();      // bail out
//   value = values[index];  // bail out when the indexed access is imprecise
//
//   value = 'ready';        // precise
//   value = 1;              // precise
function isPreciselyTypedWrite(
  writeExpr: estree.Node | null,
  checker: ts.TypeChecker,
  services: Rule.RuleContext['sourceCode']['parserServices'],
): boolean {
  if (!writeExpr) {
    return false;
  }
  return (
    getPrimitiveCategories(
      checker.getBaseTypeOfLiteralType(getTypeFromTreeNode(writeExpr, services)),
    ) !== null
  );
}

function getRootIdentifier(node: estree.Node): estree.Identifier | null {
  let current = node;
  while (current.type === 'ChainExpression' || current.type === 'MemberExpression') {
    current = current.type === 'ChainExpression' ? current.expression : current.object;
  }
  return current.type === 'Identifier' ? current : null;
}

function isFunctionLikeExpression(
  node: estree.Node,
): node is estree.FunctionExpression | estree.ArrowFunctionExpression {
  return node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression';
}
