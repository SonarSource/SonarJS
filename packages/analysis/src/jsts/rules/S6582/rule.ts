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
// https://sonarsource.github.io/rspec/#/rspec/S6582/javascript

import type { Rule } from 'eslint';
import ts from 'typescript';
import { rules as tsEslintRules } from '../external/typescript-eslint/index.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import * as meta from './generated-meta.js';

/**
 * Original rule 'prefer-optional-chain' from TypeScript ESLint.
 */
const preferOptionalChainRule = tsEslintRules['prefer-optional-chain'];
const BOOLEAN_COMPARISON_OPERATORS = new Set([
  '==',
  '!=',
  '===',
  '!==',
  '<',
  '>',
  '<=',
  '>=',
  'instanceof',
  'in',
]);

/**
 * Matches negated access guards that stay boolean after optional chaining.
 *
 * Pseudo code:
 * if (!value || !value.property) {
 *   // `value?.property` remains wrapped by `!`
 * }
 */
function isNegatedOptionalChainGuard(node: Rule.Node) {
  return (
    node.type === 'LogicalExpression' &&
    node.operator === '||' &&
    node.left.type === 'UnaryExpression' &&
    node.left.operator === '!' &&
    node.right.type === 'UnaryExpression' &&
    node.right.operator === '!'
  );
}

/**
 * Matches guards where optional chaining feeds a comparison operator.
 *
 * Pseudo code:
 * if (value && value.kind === 160) {}
 * return !options || options.mode !== current.mode;
 *
 * The comparison operator determines the final value. Rewriting to
 * `value?.kind === 160` or `options?.mode !== current.mode` still yields
 * a boolean, so `undefined` never escapes the comparison.
 */
function isComparisonOptionalChainGuard(node: Rule.Node): boolean {
  return (
    node.type === 'LogicalExpression' &&
    node.right.type === 'BinaryExpression' &&
    BOOLEAN_COMPARISON_OPERATORS.has(node.right.operator)
  );
}

/**
 * Tells whether the optional-chain rewrite is guaranteed to produce boolean.
 *
 * "Boolean by construction" means the enclosing operator, not the operand type,
 * determines the final type:
 * - `!value` is always boolean
 * - `left === right`, `left != right`, `left < right`, etc. are always boolean
 *
 * In these patterns, optional chaining may change an inner operand to include
 * `undefined`, but the outer operator still consumes that operand and returns
 * boolean. No contextual-type check is needed.
 */
function isBooleanResultByConstruction(node: Rule.Node): boolean {
  return isNegatedOptionalChainGuard(node) || isComparisonOptionalChainGuard(node);
}

/**
 * Reports `(a && a.prop)` when it is immediately consumed by `||` or `??`.
 *
 * Pseudo code:
 * (repo && repo.name) || fallback
 * (repo && repo.name) ?? fallback
 *
 * The parent operator absorbs the `undefined` introduced by `repo?.name`, so the
 * rewrite is safe. Returns `true` when the node matches this pattern and has been
 * reported, `false` otherwise.
 */
function reportIfFallbackConsumesUndefined(
  node: Rule.Node,
  ctx: Rule.RuleContext,
  descriptor: Rule.ReportDescriptor,
): boolean {
  const parent = node.parent;
  if (
    parent?.type !== 'LogicalExpression' ||
    (parent.operator !== '||' && parent.operator !== '??') ||
    parent.left !== node
  ) {
    return false;
  }

  // Upstream `prefer-optional-chain` emits only a suggestion when `?.` may union
  // `undefined` into the result type; see `analyzeChain.ts`, where
  // `useSuggestionFixer = true` is the defensive default and the TODO explicitly
  // calls out missing context-sensitive checks for safe sites such as conditionals.
  // In `(a && a.b) || fallback` / `(a && a.b) ?? fallback`, we have that missing
  // context: the parent fallback operator immediately consumes the introduced
  // `undefined`, so we can safely promote the upstream suggestion to a fix.
  const suggestFix = descriptor.suggest?.[0]?.fix;
  if (suggestFix == null) {
    ctx.report(descriptor);
    return true;
  }

  const { suggest: _suggest, ...rest } = descriptor;
  ctx.report({ ...rest, fix: suggestFix } as Rule.ReportDescriptor);
  return true;
}

/**
 * Resolves the AST node associated with a report descriptor.
 *
 * When the descriptor carries a `node` directly, that node is returned.
 * When it carries only a `loc`, the node is looked up by source range.
 * If neither is available or the lookup fails, `ctx.report` is called
 * immediately and `null` is returned so the caller can short-circuit.
 */
function findReportNode(
  ctx: Rule.RuleContext,
  descriptor: Rule.ReportDescriptor,
): (Rule.Node & { range: [number, number] }) | null {
  if ('node' in descriptor) {
    return descriptor.node as Rule.Node & { range: [number, number] };
  }

  const loc =
    'loc' in descriptor
      ? (descriptor.loc as
          | { start: { line: number; column: number }; end: { line: number; column: number } }
          | undefined)
      : undefined;

  if (!loc || !('start' in loc)) {
    ctx.report(descriptor);
    return null;
  }

  const startIndex = ctx.sourceCode.getIndexFromLoc(loc.start);
  const endIndex = ctx.sourceCode.getIndexFromLoc(loc.end);
  let node = ctx.sourceCode.getNodeByRangeIndex(startIndex) as
    | (Rule.Node & { range: [number, number] })
    | null;
  if (!node) {
    ctx.report(descriptor);
    return null;
  }
  while (node.range[1] < endIndex && node.parent) {
    node = node.parent as Rule.Node & { range: [number, number] };
  }
  return node;
}

/**
 * Tells whether a contextual type accepts `undefined`.
 *
 * Pseudo code:
 * let result: string | undefined;
 * result = value?.property;
 */
function allowsUndefined(type: ts.Type): boolean {
  const constituents: ts.Type[] = type.isUnion() ? type.types : [type];
  return constituents.some(
    constituent =>
      (constituent.flags & ts.TypeFlags.Undefined) !== 0 ||
      (constituent.flags & ts.TypeFlags.Any) !== 0 ||
      (constituent.flags & ts.TypeFlags.Unknown) !== 0 ||
      (constituent.flags & ts.TypeFlags.Void) !== 0,
  );
}

/**
 * Returns the type imposed by the surrounding context on the reported expression.
 *
 * Pseudo code:
 * let result: string | null;
 * result = value && value.property;
 *
 * Here, `node` is `value && value.property`, and its contextual type is `string | null`
 * because that is the type expected by the assignment target `result`.
 */
function getContextualTypeOfNode(
  services: Rule.RuleContext['sourceCode']['parserServices'],
  checker: ts.TypeChecker,
  node: Rule.Node,
): ts.Type | null {
  const tsNode = services.esTreeNodeToTSNodeMap.get(node);
  if (!tsNode) {
    return null;
  }

  return checker.getContextualType(tsNode as ts.Expression) ?? null;
}

/**
 * Tells whether the reported expression is only used for boolean coercion.
 *
 * Examples:
 * if (!obj || (obj.prop && obj.prop.method())) {}
 * while (value && value.next) {}
 * const ok = !!(value && value.next);
 *
 * In these contexts, introducing `undefined` is harmless because the enclosing
 * construct consumes the expression as a truthiness test rather than a value
 * whose type must remain assignable.
 */
function isInBooleanCoercionContext(node: Rule.Node): boolean {
  let current: Rule.Node | null = node;

  while (current) {
    const parent: Rule.Node | null = current.parent;
    if (!parent) {
      return false;
    }

    if (
      parent.type === 'LogicalExpression' &&
      (parent.left === current || parent.right === current)
    ) {
      current = parent;
      continue;
    }

    if (parent.type === 'UnaryExpression' && parent.operator === '!') {
      return true;
    }

    return (
      (parent.type === 'IfStatement' && parent.test === current) ||
      (parent.type === 'WhileStatement' && parent.test === current) ||
      (parent.type === 'DoWhileStatement' && parent.test === current) ||
      (parent.type === 'ForStatement' && parent.test === current) ||
      (parent.type === 'ConditionalExpression' && parent.test === current)
    );
  }

  return false;
}

/**
 * Sanitized rule 'prefer-optional-chain' from TypeScript ESLint.
 *
 * TypeScript ESLint's rule raises a runtime error if the parser services of the
 * injected context is missing some helper functions allowing to convert between
 * TypeScript ESLint and TypeScript ASTs. Contrary to rules requiring type checking,
 * there is no way to determine programmatically if a rule requires such a service.
 *
 * This is the case for the rule 'prefer-optional-chain', for which we need to provide
 * a custom sanitization in case the parser services miss these helpers.
 *
 * Suppresses reports where optional chaining would introduce a type-unsafe `undefined`.
 * When a LogicalExpression like `a && a.prop` is used in a typed context (e.g., assigned
 * to `T | null`), replacing it with `a?.prop` changes the result type to `T | undefined`,
 * which is not assignable to `T | null`. We use TypeScript's contextual type to detect
 * when the replacement would break type safety and suppress only those reports.
 *
 * In boolean/void contexts (e.g., `if` conditions), no contextual type is imposed,
 * so reports pass through correctly.
 *
 * @see https://github.com/typescript-eslint/typescript-eslint/blob/cf045f2c390353c1a074ba85391f773f1ede702c/packages/eslint-plugin/src/rules/prefer-optional-chain.ts#LL54C39-L54C39
 * @see https://github.com/typescript-eslint/typescript-eslint/blob/cf045f2c390353c1a074ba85391f773f1ede702c/packages/utils/src/eslint-utils/getParserServices.ts#L19-L25
 */
export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { ...preferOptionalChainRule.meta }),
  create(context: Rule.RuleContext) {
    const services = context.sourceCode.parserServices;
    if (!services?.program || !services.esTreeNodeToTSNodeMap || !services.tsNodeToESTreeNodeMap) {
      return {};
    }

    // Without strictNullChecks, null and undefined are implicitly assignable to every type.
    // Any reasoning about whether undefined is safe to introduce is meaningless in that mode.
    // `strict: true` implies strictNullChecks but does not materialize it as an explicit property.
    const compilerOptions = services.program.getCompilerOptions();
    if (!compilerOptions.strictNullChecks && !compilerOptions.strict) {
      return preferOptionalChainRule.create(context);
    }

    const checker = services.program.getTypeChecker();
    return interceptReport(preferOptionalChainRule, (ctx, descriptor) => {
      const node = findReportNode(ctx, descriptor);
      if (!node) {
        return;
      }

      // Negation and comparison operators determine the outer expression type.
      // Even if optional chaining introduces `undefined` in an operand, `!`, `===`,
      // `!==`, `<`, `in`, etc. still evaluate to a boolean result.
      if (isBooleanResultByConstruction(node)) {
        ctx.report(descriptor);
        return;
      }

      // Fallback operators are safe without contextual typing because `||` / `??`
      // absorb the `undefined` introduced by optional chaining.
      if (reportIfFallbackConsumesUndefined(node, ctx, descriptor)) {
        return;
      }

      // Pure boolean-coercion contexts are safe without contextual typing because
      // the enclosing construct consumes truthiness rather than a typed value.
      if (isInBooleanCoercionContext(node)) {
        ctx.report(descriptor);
        return;
      }

      const contextualType = getContextualTypeOfNode(services, checker, node);
      if (!contextualType) {
        // If no contextual type is imposed, the rewrite cannot violate assignability.
        ctx.report(descriptor);
        return;
      }

      if (allowsUndefined(contextualType)) {
        // If the contextual type accepts `undefined`, the rewrite remains assignable.
        ctx.report(descriptor);
      }
      // Otherwise optional chaining would introduce an unassignable `undefined`,
      // so this report is suppressed as a false positive.
    }).create(context);
  },
};
