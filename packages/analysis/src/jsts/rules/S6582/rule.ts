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
    function getContextualTypeOfNode(node: Rule.Node): ts.Type | null {
      const tsNode = services.esTreeNodeToTSNodeMap.get(node);
      if (!tsNode) {
        return null;
      }

      return checker.getContextualType(tsNode as ts.Expression) ?? null;
    }

    function getTypeOfNode(node: Rule.Node): ts.Type | null {
      const tsNode = services.esTreeNodeToTSNodeMap.get(node);
      if (!tsNode) {
        return null;
      }

      return checker.getTypeAtLocation(tsNode);
    }

    function getContextualTypeSubject(node: Rule.Node) {
      let current = node;
      while (
        current.parent?.type === 'LogicalExpression' &&
        (current.parent.left === current || current.parent.right === current)
      ) {
        current = current.parent;
      }
      return current;
    }

    function hasTypeUnsafeContextualType(node: Rule.Node) {
      const contextualType = getContextualTypeOfNode(getContextualTypeSubject(node));
      return contextualType != null && !allowsUndefined(contextualType);
    }

    function matchesFunctionReturnFalsePositive(node: Rule.Node) {
      return (
        node.type === 'LogicalExpression' &&
        node.operator === '&&' &&
        node.parent?.type === 'ReturnStatement' &&
        node.right.type !== 'BinaryExpression' &&
        hasTypeUnsafeContextualType(node)
      );
    }

    function matchesTypedVariableInitializerFalsePositive(node: Rule.Node) {
      return (
        node.type === 'LogicalExpression' &&
        node.operator === '&&' &&
        node.parent?.type === 'VariableDeclarator' &&
        node.parent.init === node &&
        node.right.type !== 'BinaryExpression' &&
        hasTypeUnsafeContextualType(node)
      );
    }

    function matchesObjectLiteralPropertyFalsePositive(node: Rule.Node) {
      return (
        node.type === 'LogicalExpression' &&
        node.operator === '&&' &&
        node.parent?.type === 'Property' &&
        node.parent.value === node &&
        node.right.type !== 'BinaryExpression' &&
        hasTypeUnsafeContextualType(node)
      );
    }

    function matchesCallArgumentFalsePositive(node: Rule.Node) {
      const subject = getContextualTypeSubject(node);
      const parent = subject.parent;
      if (
        node.type !== 'LogicalExpression' ||
        node.operator !== '&&' ||
        node.right.type === 'BinaryExpression' ||
        parent?.type !== 'CallExpression' ||
        !parent.arguments.includes(subject as never)
      ) {
        return false;
      }

      const contextualType = getContextualTypeOfNode(subject);
      return contextualType != null && !allowsUndefined(contextualType);
    }

    function matchesAssignmentFalsePositive(node: Rule.Node) {
      if (
        node.type !== 'LogicalExpression' ||
        node.operator !== '&&' ||
        node.right.type === 'BinaryExpression' ||
        node.parent?.type !== 'AssignmentExpression' ||
        node.parent.right !== node ||
        node.parent.operator !== '='
      ) {
        return false;
      }

      const parent = node.parent;
      if (parent.left.type !== 'Identifier' && parent.left.type !== 'MemberExpression') {
        // Keep the matcher narrowly scoped to ordinary typed assignment targets.
        // Broader target coverage can be added once we have concrete FP examples.
        return false;
      }

      const targetType = getTypeOfNode(parent.left as Rule.Node);
      return targetType != null && !allowsUndefined(targetType);
    }

    /**
     * Returns true when the upstream report is a known false positive that should be suppressed.
     *
     * We suppress only when the optional-chain rewrite would leak a type-unsafe `undefined`
     * into the surrounding context. All other cases are reported by default.
     */
    function isKnownFalsePositive(node: Rule.Node): boolean {
      if (matchesFunctionReturnFalsePositive(node)) {
        return true;
      }

      if (matchesTypedVariableInitializerFalsePositive(node)) {
        return true;
      }

      if (matchesObjectLiteralPropertyFalsePositive(node)) {
        return true;
      }

      if (matchesCallArgumentFalsePositive(node)) {
        return true;
      }

      if (matchesAssignmentFalsePositive(node)) {
        return true;
      }

      return false;
    }

    return interceptReport(preferOptionalChainRule, (ctx, descriptor) => {
      const node = findReportNode(ctx, descriptor);
      if (!node) {
        return;
      }

      if (isKnownFalsePositive(node)) {
        return;
      }

      const parent = node.parent;
      if (
        parent?.type === 'LogicalExpression' &&
        (parent.operator === '||' || parent.operator === '??') &&
        parent.left === node
      ) {
        // The upstream rule may emit the fix as a suggestion (not autofix) when the
        // operands don't include undefined, because optional chaining would change the
        // type from T|null to T|undefined in isolation. Since the enclosing ||/??
        // absorbs any undefined the rewrite introduces, the fix is safe as an autofix.
        const suggestFix = descriptor.suggest?.[0]?.fix;
        if (suggestFix == null) {
          ctx.report(descriptor);
        } else {
          const { suggest: _suggest, ...rest } = descriptor;
          ctx.report({ ...rest, fix: suggestFix } as Rule.ReportDescriptor);
        }
        return;
      }

      ctx.report(descriptor);
    }).create(context);
  },
};
