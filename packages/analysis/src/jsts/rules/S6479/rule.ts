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
// https://sonarsource.github.io/rspec/#/rspec/S6479/javascript

// inspired from `no-array-index` from `eslint-plugin-react`:
// https://github.com/jsx-eslint/eslint-plugin-react/blob/0a2f6b7e9df32215fcd4e3061ec69ea3f2eef793/lib/rules/no-array-index-key.js#L16

import type { TSESTree } from '@typescript-eslint/utils';
import type estree from 'estree';
import { rules } from '../external/react.js';
import {
  getProperty,
  getVariableFromName,
  isIdentifier,
  type Node as AstNode,
} from '../helpers/ast.js';
import { writingMethods } from '../helpers/collection.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { interceptReportForReact } from '../helpers/decorators/interceptor.js';
import type { Rule, Scope } from 'eslint';
import * as meta from './generated-meta.js';

const baseRule = rules['no-array-index-key'];
type IteratorCall = TSESTree.CallExpression & {
  callee: TSESTree.MemberExpression & { property: TSESTree.Identifier };
};
type TransparentExpressionWrapper = AstNode & { expression: AstNode };

const ITERATOR_INDEX_PARAMETER_POSITIONS = new Map([
  ['every', 1],
  ['filter', 1],
  ['find', 1],
  ['findIndex', 1],
  ['flatMap', 1],
  ['forEach', 1],
  ['map', 1],
  ['reduce', 2],
  ['reduceRight', 2],
  ['some', 1],
]);

export const rule = interceptReportForReact(
  {
    ...baseRule,
    meta: generateMeta(meta, baseRule.meta),
  },
  (context, reportDescriptor) => {
    const { node } = reportDescriptor as Rule.ReportDescriptor & { node: TSESTree.Node };
    if (isCompositeKey(node) || isStaticListKey(node, context)) {
      return;
    }

    context.report(reportDescriptor);
  },
);

/**
 * Returns whether the reported key is already exempted by the composite-key logic.
 * @param node Reported key node from the upstream rule.
 * @return True when the report should be skipped.
 */
function isCompositeKey(node: TSESTree.Node): boolean {
  return (
    node.type === 'BinaryExpression' ||
    (node.type === 'TemplateLiteral' && node.expressions.length > 1)
  );
}

/**
 * Returns whether the reported key belongs to a list with a statically fixed source.
 * @param node Reported key node from the upstream rule.
 * @param context ESLint rule context.
 * @return True when the report should be skipped.
 */
function isStaticListKey(node: TSESTree.Node, context: Rule.RuleContext): boolean {
  const iteratorCall = findEnclosingIteratorCall(node);
  return iteratorCall !== undefined && hasStaticListSource(iteratorCall.callee.object, context);
}

/**
 * Finds the iterator call that owns the reported key usage.
 * @param node Reported key node from the upstream rule.
 * @return The enclosing iterator call when it exists.
 */
function findEnclosingIteratorCall(node: TSESTree.Node): IteratorCall | undefined {
  let current = node.parent;
  while (current) {
    if (current.type === 'ArrowFunctionExpression' || current.type === 'FunctionExpression') {
      return getIteratorCallFromCallback(current);
    }
    current = current.parent;
  }

  return undefined;
}

/**
 * Returns the iterator call associated with a callback function.
 * @param callback Callback candidate enclosing the reported key.
 * @return The iterator call when the callback matches a supported collection method.
 */
function getIteratorCallFromCallback(
  callback: TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression,
): IteratorCall | undefined {
  const callExpression = callback.parent;
  if (
    callExpression?.type !== 'CallExpression' ||
    callExpression.callee.type !== 'MemberExpression' ||
    callExpression.callee.computed ||
    callExpression.callee.property.type !== 'Identifier' ||
    callExpression.arguments[0] !== callback
  ) {
    return undefined;
  }

  const indexParameterPosition = ITERATOR_INDEX_PARAMETER_POSITIONS.get(
    callExpression.callee.property.name,
  );
  const indexParameter = callback.params[indexParameterPosition ?? 0];
  if (indexParameterPosition === undefined || indexParameter?.type !== 'Identifier') {
    return undefined;
  }

  return callExpression as IteratorCall;
}

/**
 * Returns whether a list source is statically fixed and safe to key by index.
 * @param source Object on which the iterator method is invoked.
 * @param context ESLint rule context.
 * @return True when the source is known to be static.
 */
function hasStaticListSource(source: AstNode, context: Rule.RuleContext): boolean {
  return (
    isStaticArrayExpression(source) ||
    isArrayFromLengthCall(source, context) ||
    resolvesToConstStaticArrayExpression(source, context, new Set())
  );
}

/**
 * Returns whether an array expression is a plain static literal.
 * @param node Candidate array expression.
 * @return True when the array contains no spread elements.
 */
function isStaticArrayExpression(node: AstNode | null | undefined): boolean {
  return (
    node?.type === 'ArrayExpression' &&
    node.elements.every(element => element?.type !== 'SpreadElement')
  );
}

/**
 * Returns whether a node is an `Array.from({ length: ... })` call.
 * @param node Candidate source node.
 * @param context ESLint rule context.
 * @return True when the node creates a fixed-length synthetic list.
 */
function isArrayFromLengthCall(node: AstNode, context: Rule.RuleContext): boolean {
  if (
    node.type !== 'CallExpression' ||
    node.callee.type !== 'MemberExpression' ||
    node.callee.computed ||
    !isIdentifier(node.callee.object, 'Array') ||
    !isIdentifier(node.callee.property, 'from')
  ) {
    return false;
  }

  const firstArgument = node.arguments[0];
  if (!firstArgument || firstArgument.type === 'SpreadElement') {
    return false;
  }

  return (
    getProperty(
      unwrapExpression(firstArgument) as estree.Node | null | undefined,
      'length',
      context,
    ) != null
  );
}

/**
 * Resolves a const binding to a static array literal when its value stays unchanged.
 * @param node Candidate identifier or initializer.
 * @param context ESLint rule context.
 * @param visited Previously visited variables to avoid recursive loops.
 * @return True when the initializer chain resolves to a static array literal.
 */
function resolvesToConstStaticArrayExpression(
  node: AstNode | null | undefined,
  context: Rule.RuleContext,
  visited: Set<Scope.Variable>,
): boolean {
  const expression = unwrapExpression(node) ?? undefined;
  if (isStaticArrayExpression(expression)) {
    return true;
  }
  if (!isIdentifier(expression)) {
    return false;
  }

  const variable = getVariableFromName(context, expression.name, expression);
  if (
    !variable ||
    visited.has(variable) ||
    variable.defs.length !== 1 ||
    variable.defs[0].type !== 'Variable' ||
    variable.defs[0].parent?.type !== 'VariableDeclaration' ||
    variable.defs[0].parent.kind !== 'const' ||
    variable.defs[0].node.id.type !== 'Identifier' ||
    hasCollectionMutation(variable)
  ) {
    return false;
  }

  visited.add(variable);
  return resolvesToConstStaticArrayExpression(variable.defs[0].node.init, context, visited);
}

/**
 * Returns whether a variable is modified after its declaration.
 * @param variable Const variable that may hold a static array literal.
 * @return True when a mutation is detected.
 */
function hasCollectionMutation(variable: Scope.Variable): boolean {
  return variable.references.some(reference => !reference.init && isCollectionMutation(reference));
}

/**
 * Returns whether a reference mutates the array bound to a variable.
 * @param reference Reference to the variable being inspected.
 * @return True when the reference is part of a mutating operation.
 */
function isCollectionMutation(reference: Scope.Reference): boolean {
  if (reference.isWrite()) {
    return true;
  }

  const identifier = reference.identifier as TSESTree.Identifier;
  const memberExpression = identifier.parent;
  if (memberExpression?.type !== 'MemberExpression' || memberExpression.object !== identifier) {
    return false;
  }

  const parent = memberExpression.parent;
  return (
    (parent?.type === 'AssignmentExpression' && parent.left === memberExpression) ||
    (parent?.type === 'UpdateExpression' && parent.argument === memberExpression) ||
    (parent?.type === 'CallExpression' &&
      parent.callee === memberExpression &&
      memberExpression.property.type === 'Identifier' &&
      writingMethods.includes(memberExpression.property.name))
  );
}

/**
 * Removes transparent wrapper nodes around an expression.
 * @param node Expression that may be wrapped by type assertions or parentheses.
 * @return The innermost wrapped expression.
 */
function unwrapExpression(node: AstNode | null | undefined): AstNode | null | undefined {
  if (isTransparentExpressionWrapper(node)) {
    return unwrapExpression(node.expression);
  }

  return node;
}

function isTransparentExpressionWrapper(
  node: AstNode | null | undefined,
): node is TransparentExpressionWrapper {
  return (
    node != null &&
    ((node.type as string) === 'ParenthesizedExpression' ||
      (node.type as string) === 'TSAsExpression' ||
      (node.type as string) === 'TSTypeAssertion' ||
      (node.type as string) === 'TSNonNullExpression')
  );
}
