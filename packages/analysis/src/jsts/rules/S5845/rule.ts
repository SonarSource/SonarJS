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

import type { Rule } from 'eslint';
import type estree from 'estree';
import ts from 'typescript';
import { getVariableFromName } from '../helpers/ast.js';
import { type Assertion, extractTestAssertion } from '../helpers/assertions.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { isRequiredParserServices } from '../helpers/parser-services.js';
import { getTypeFromTreeNode } from '../helpers/type.js';
import * as meta from './generated-meta.js';

const messages = {
  alwaysFails:
    'Change this assertion; it always fails because it compares dissimilar types ("{{actual}}" and "{{expected}}").',
  alwaysSucceeds:
    'Change this assertion; it always succeeds because it compares dissimilar types ("{{actual}}" and "{{expected}}").',
};

type PrimitiveCategory =
  | 'string'
  | 'number'
  | 'boolean'
  | 'bigint'
  | 'null'
  | 'undefined'
  | 'object';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages }),
  /*
   * High-level idea:
   * - only run when the parser provides type information;
   * - reduce both assertion operands to broad primitive families instead of comparing exact
   *   TypeScript types, because the rule is only meant to catch obviously impossible equality
   *   assertions;
   * - stay conservative whenever the type is imprecise (`any`, `unknown`, type parameters, etc.),
   *   or when a mutable identifier may have been reassigned to a different family.
   */
  create(context: Rule.RuleContext) {
    const services = context.sourceCode.parserServices;
    if (!isRequiredParserServices(services)) {
      return {};
    }

    const checker = services.program.getTypeChecker();

    // Centralise the whole decision tree once per extracted assertion so both visitors below
    // share the same filtering, type lookup, and reporting logic.
    function checkAssertion(node: estree.Node): void {
      const assertion = extractTestAssertion(context, node);
      if (!isRelevantAssertion(assertion)) {
        return;
      }
      if (
        assertion.actual.type === 'CallExpression' ||
        assertion.expected.type === 'CallExpression'
      ) {
        return;
      }

      const actualType = checker.getBaseTypeOfLiteralType(
        getTypeFromTreeNode(assertion.actual, services),
      );
      const expectedType = checker.getBaseTypeOfLiteralType(
        getTypeFromTreeNode(assertion.expected, services),
      );
      if (
        !hasStablePrimitiveType(context, assertion.actual, actualType, checker, services) ||
        !hasStablePrimitiveType(context, assertion.expected, expectedType, checker, services)
      ) {
        return;
      }
      const incompatibility = getIncompatibility(actualType, expectedType, checker);
      if (incompatibility) {
        context.report({
          node: assertion.reportNode,
          messageId: assertion.negated ? 'alwaysSucceeds' : 'alwaysFails',
          data: incompatibility,
        });
      }
    }

    return {
      CallExpression(node: estree.Node) {
        checkAssertion(node);
      },
      MemberExpression(node: estree.Node) {
        checkAssertion(node);
      },
    };
  },
};

// Only strict comparison-style assertions are in scope. Loose equality is intentionally excluded
// because coercion rules make "always true/false" reasoning much less reliable there.
function isRelevantAssertion(assertion: Assertion | null): assertion is Assertion & {
  kind: 'comparison';
} {
  return assertion?.kind === 'comparison' && assertion.comparison !== 'loose';
}

// Mutable identifiers need extra care: the current type at the assertion site may be narrower
// than what was actually written earlier. We only trust identifier types when every write stays in
// the same primitive family as the current type.
function hasStablePrimitiveType(
  context: Rule.RuleContext,
  node: estree.Node,
  nodeType: ts.Type,
  checker: ts.TypeChecker,
  services: Rule.RuleContext['sourceCode']['parserServices'],
): boolean {
  if (node.type !== 'Identifier') {
    return true;
  }
  const allowedCategories = getPrimitiveCategories(nodeType);
  if (!allowedCategories) {
    return false;
  }
  const variable = getVariableFromName(context, node.name, node);
  if (!variable) {
    return true;
  }

  return variable.references
    .filter(ref => ref.isWrite())
    .every(ref => isCompatibleWrite(ref.writeExpr, allowedCategories, checker, services));
}

// A write is compatible only when we can classify it precisely and every resulting primitive
// family is still inside the identifier's allowed families. If not, we bail out conservatively.
function isCompatibleWrite(
  writeExpr: estree.Node | null,
  allowedCategories: PrimitiveCategory[],
  checker: ts.TypeChecker,
  services: Rule.RuleContext['sourceCode']['parserServices'],
): boolean {
  if (!writeExpr) {
    return false;
  }
  const writeCategories = getPrimitiveCategories(
    checker.getBaseTypeOfLiteralType(getTypeFromTreeNode(writeExpr, services)),
  );
  return writeCategories?.every(category => allowedCategories.includes(category)) ?? false;
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
