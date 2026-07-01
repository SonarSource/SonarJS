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
// https://sonarsource.github.io/rspec/#/rspec/S7766/javascript

import type { Rule, SourceCode } from 'eslint';
import type estree from 'estree';
import ts from 'typescript';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import { areEquivalent } from '../helpers/equivalence.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { isRequiredParserServices } from '../helpers/parser-services.js';
import { getTypeFromTreeNode, isNumberType } from '../helpers/type.js';
import * as meta from './generated-meta.js';
import { hasDirectObjectOrigin } from './origin.js';

const comparisonOperators = new Set(['<', '<=', '>', '>=']);

type MinMaxConditionalExpression = estree.ConditionalExpression & {
  test: estree.BinaryExpression;
};

type TypedMinMaxDecision = 'report' | 'suppress' | 'unknown';

/**
 * Decorates Unicorn's prefer-math-min-max rule with SonarJS false-positive escapes.
 *
 * The decorator only filters reports that already match the upstream min/max
 * ternary pattern. Those reports are forwarded unless:
 * 1. The type of the whole ternary proves the result is not a plain numeric value.
 * 2. The typed path cannot decide and the compared values can be traced to
 *    `this` or to direct object expressions such as `new Date(...)`.
 */
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    (context, descriptor) => {
      if (!isMinMaxConditionalReport(descriptor, context.sourceCode)) {
        context.report(descriptor);
        return;
      }

      if (shouldSuppressReport(descriptor.node, context.sourceCode)) {
        return;
      }

      context.report(descriptor);
    },
  );
}

/**
 * Decides whether a ternary already matched as a min/max pattern should be suppressed.
 *
 * The decision order mirrors the implementation:
 * 1. Use the type of the full conditional expression when available.
 * 2. Use the object fallback only when typing is unavailable or inconclusive.
 */
function shouldSuppressReport(node: MinMaxConditionalExpression, sourceCode: SourceCode): boolean {
  const typedDecision = getTypedMinMaxDecision(node, sourceCode);
  if (typedDecision !== 'unknown') {
    return typedDecision === 'suppress';
  }

  return hasComparedOperandDirectObjectOrigin(node, sourceCode);
}

/**
 * Classifies the full ternary expression using TypeScript type information.
 *
 * This reads the type of `left < right ? left : right` as a whole, not the types
 * of `left` and `right` separately. That matters for contextually typed callbacks:
 *
 * Pseudo-code:
 *   const pick: (x: T, y: T) => T = (x, y) => x > y ? x : y
 *
 * The conditional expression is typed as `T`, so the report is suppressed.
 */
function getTypedMinMaxDecision(
  node: MinMaxConditionalExpression,
  sourceCode: SourceCode,
): TypedMinMaxDecision {
  if (!isRequiredParserServices(sourceCode.parserServices)) {
    return 'unknown';
  }

  return classifyMinMaxType(getTypeFromTreeNode(node, sourceCode.parserServices));
}

/**
 * Converts a TypeScript type into a reporting decision.
 *
 * Decision rules:
 * 1. Union: return `unknown` if any branch is unknown, `report` if any branch
 *    is numeric, otherwise `suppress`.
 * 2. `any` / `unknown`: return `unknown` so the syntax fallback can decide.
 * 3. Type parameters and intersections: return `suppress`.
 * 4. Plain numeric types: return `report`.
 * 5. Every other type: return `suppress`.
 */
function classifyMinMaxType(type: ts.Type): TypedMinMaxDecision {
  if (type.isUnion()) {
    let sawSuppressibleType = false;

    for (const constituent of type.types) {
      const decision = classifyMinMaxType(constituent);
      if (decision === 'unknown') {
        return 'unknown';
      }
      if (decision === 'report') {
        return 'report';
      }
      sawSuppressibleType ||= decision === 'suppress';
    }

    return sawSuppressibleType ? 'suppress' : 'report';
  }

  if ((type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) !== 0) {
    return 'unknown';
  }

  if (
    (type.flags & ts.TypeFlags.TypeParameter) !== 0 ||
    (type.flags & ts.TypeFlags.Intersection) !== 0
  ) {
    return 'suppress';
  }

  return isNumberType(type) ? 'report' : 'suppress';
}

/**
 * Matches the conditional expressions that the upstream rule treats as
 * `Math.min(...)` or `Math.max(...)` candidates.
 *
 * Pseudo-code:
 *   left < right ? left : right
 *   left <= right ? left : right
 *   left > right ? left : right
 *   left >= right ? left : right
 *   left < right ? right : left
 *   left <= right ? right : left
 *   left > right ? right : left
 *   left >= right ? right : left
 */
function isMinMaxConditionalReport(
  descriptor: Rule.ReportDescriptor,
  sourceCode: SourceCode,
): descriptor is Rule.ReportDescriptor & { node: MinMaxConditionalExpression } {
  if (!('node' in descriptor) || descriptor.node.type !== 'ConditionalExpression') {
    return false;
  }

  const { test, consequent, alternate } = descriptor.node;
  return (
    test.type === 'BinaryExpression' &&
    comparisonOperators.has(test.operator) &&
    ((areEquivalent(test.left, consequent, sourceCode) &&
      areEquivalent(test.right, alternate, sourceCode)) ||
      (areEquivalent(test.left, alternate, sourceCode) &&
        areEquivalent(test.right, consequent, sourceCode)))
  );
}

/**
 * Checks whether either compared operand has direct-object origin for the fallback.
 *
 * Pseudo-code:
 *   left < right ? left : right
 *   ^ inspect `left`
 *           ^ inspect `right`
 *
 * This fallback runs only when the typed path returns `unknown`.
 */
function hasComparedOperandDirectObjectOrigin(
  node: MinMaxConditionalExpression,
  sourceCode: SourceCode,
): boolean {
  const { left, right } = node.test;
  return (
    hasDirectObjectOrigin(left, sourceCode, new Set()) ||
    hasDirectObjectOrigin(right, sourceCode, new Set())
  );
}
