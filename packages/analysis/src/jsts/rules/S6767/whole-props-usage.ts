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

import type { Rule, SourceCode } from 'eslint';
import type estree from 'estree';
import { childrenOf } from '../helpers/ancestor.js';
import { isIdentifier } from '../helpers/ast.js';

/**
 * False-positive remediation escape:
 * returns true when the component consumes whole props through a supported
 * indirect pattern such as helper-call forwarding, spread usage, or computed access.
 */
export function hasSupportedWholePropsUsage(
  componentNode: estree.Node,
  context: Rule.RuleContext,
  _propName: string | undefined,
): boolean {
  return hasSupportedWholePropsUsageInSubtree(componentNode, context.sourceCode.visitorKeys);
}

function hasSupportedWholePropsUsageInSubtree(
  root: estree.Node,
  keys: SourceCode.VisitorKeys,
): boolean {
  if (isSupportedWholePropsUsage(root, isWholePropsArgument)) {
    return true;
  }

  // Recursively check all children
  return childrenOf(root, keys).some(child => hasSupportedWholePropsUsageInSubtree(child, keys));
}

/**
 * Returns true when `node` matches any supported whole-props usage shape for the
 * provided `isPropsArgument` predicate and is not filtered out by the ignore rules.
 *
 * Pseudo code:
 *   consume(props)
 *   [...props]
 *   <Component {...props} />
 *   props[key]
 *
 * Ignored pseudo code:
 *   PropTypes.checkPropTypes(props, ...)
 */
export function isSupportedWholePropsUsage(
  node: estree.Node,
  isPropsArgument: (argument: estree.Node) => boolean,
): boolean {
  return matchesWholePropsUsage(node, isPropsArgument) && !isIgnoredWholePropsUsage(node);
}

/**
 * Returns true when `node` matches any supported whole-props usage shape for the
 * provided `isPropsArgument` predicate.
 */
function matchesWholePropsUsage(
  node: estree.Node,
  isPropsArgument: (argument: estree.Node) => boolean,
): boolean {
  return (
    isWholePropsPassedToCall(node, isPropsArgument) ||
    isWholePropsSpreadElement(node, isPropsArgument) ||
    isWholePropsJsxSpreadAttribute(node, isPropsArgument) ||
    isWholePropsComputedMemberAccess(node, isPropsArgument)
  );
}

/**
 * Returns true when a whole-props usage should be ignored rather than treated as
 * evidence that the component really consumes props.
 *
 * Pseudo code:
 *   ignore: PropTypes.checkPropTypes(props, ...)
 */
function isIgnoredWholePropsUsage(node: estree.Node): boolean {
  return node.type === 'CallExpression' && isPropTypesCheckCall(node);
}

/**
 * Pseudo code:
 *   props
 *   this.props
 */
function isWholePropsArgument(argument: estree.Node): boolean {
  return (
    isIdentifier(argument, 'props') ||
    (argument.type === 'MemberExpression' &&
      argument.object.type === 'ThisExpression' &&
      isIdentifier(argument.property, 'props'))
  );
}

/**
 * Pseudo code:
 *   consume(props)
 *   consume(this.props)
 * but not:
 *   super(props)
 */
function isWholePropsPassedToCall(
  node: estree.Node,
  isPropsArgument: (arg: estree.Node) => boolean,
): boolean {
  return (
    node.type === 'CallExpression' &&
    node.callee.type !== 'Super' &&
    node.arguments.some(argument => isPropsArgument(argument))
  );
}

/**
 * Pseudo code:
 *   [...props]
 *   [...this.props]
 */
function isWholePropsSpreadElement(
  node: estree.Node,
  isPropsArgument: (arg: estree.Node) => boolean,
): boolean {
  return node.type === 'SpreadElement' && isPropsArgument(node.argument);
}

/**
 * Pseudo code:
 *   <Component {...props} />
 *   <Component {...this.props} />
 */
function isWholePropsJsxSpreadAttribute(
  node: estree.Node,
  isPropsArgument: (arg: estree.Node) => boolean,
): boolean {
  return node.type === 'JSXSpreadAttribute' && isPropsArgument(node.argument);
}

/**
 * Pseudo code:
 *   props[key]
 *   this.props[key]
 */
function isWholePropsComputedMemberAccess(
  node: estree.Node,
  isPropsArgument: (arg: estree.Node) => boolean,
): boolean {
  return node.type === 'MemberExpression' && node.computed && isPropsArgument(node.object);
}

/**
 * Pseudo code:
 *   PropTypes.checkPropTypes(...)
 */
function isPropTypesCheckCall(call: estree.CallExpression): boolean {
  return (
    call.callee.type === 'MemberExpression' &&
    isIdentifier(call.callee.object, 'PropTypes') &&
    isIdentifier(call.callee.property, 'checkPropTypes')
  );
}
