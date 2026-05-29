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

import type { Rule, Scope, SourceCode } from 'eslint';
import type estree from 'estree';
import { childrenOf } from '../helpers/ancestor.js';
import { getVariableFromName, isFunctionNode, isIdentifier } from '../helpers/ast.js';
import { isWholePropsExpressionOrAlias } from './prop-alias-resolution.js';

/**
 * False-positive remediation escape:
 * returns true when the component consumes whole props through a supported
 * indirect pattern such as helper-call forwarding, spread usage, or computed access.
 */
export function hasSupportedWholePropsUsage(
  componentNode: estree.Node,
  context: Rule.RuleContext,
): boolean {
  const isTrackedPropsExpression = getTrackedWholePropsExpression(componentNode, context);
  return hasSupportedWholePropsUsageInSubtree(
    componentNode,
    context.sourceCode.visitorKeys,
    isTrackedPropsExpression,
  );
}

function getTrackedWholePropsExpression(
  componentNode: estree.Node,
  context: Rule.RuleContext,
): (node: estree.Node) => boolean {
  if (isFunctionNode(componentNode)) {
    const propsVariable = getFunctionPropsVariable(componentNode, context);
    return node =>
      isWholePropsExpressionOrAlias(context, node, argument =>
        isTrackedIdentifier(context, argument, propsVariable),
      );
  }

  const constructorPropsVariable = getClassConstructorPropsVariable(componentNode, context);

  return node =>
    isWholePropsExpressionOrAlias(context, node, isWholePropsArgument) ||
    isTrackedIdentifier(context, node, constructorPropsVariable);
}

function getFunctionPropsVariable(
  componentNode: estree.Function,
  context: Rule.RuleContext,
): Scope.Variable | undefined {
  const propsParam = getPropsParamIdentifier(componentNode.params[0]);
  return propsParam
    ? context.sourceCode.getScope(componentNode).set.get(propsParam.name)
    : undefined;
}

function getClassConstructorPropsVariable(
  componentNode: estree.Node,
  context: Rule.RuleContext,
): Scope.Variable | undefined {
  if (componentNode.type !== 'ClassDeclaration' && componentNode.type !== 'ClassExpression') {
    return undefined;
  }

  const ctor = componentNode.body.body.find(
    (member): member is estree.MethodDefinition =>
      member.type === 'MethodDefinition' && member.kind === 'constructor',
  );
  if (!ctor) {
    return undefined;
  }

  const propsParam = getPropsParamIdentifier(ctor.value.params[0]);
  if (!propsParam || propsParam.name !== 'props') {
    return undefined;
  }

  return context.sourceCode.getScope(ctor.value).set.get(propsParam.name);
}

function isTrackedIdentifier(
  context: Rule.RuleContext,
  node: estree.Node,
  variable: Scope.Variable | undefined,
): boolean {
  return (
    !!variable &&
    node.type === 'Identifier' &&
    getVariableFromName(context, node.name, node) === variable
  );
}

function getPropsParamIdentifier(
  propsParam: estree.Function['params'][number] | undefined,
): estree.Identifier | undefined {
  if (isIdentifier(propsParam)) {
    return propsParam;
  }

  return propsParam?.type === 'AssignmentPattern' && isIdentifier(propsParam.left)
    ? propsParam.left
    : undefined;
}

function hasSupportedWholePropsUsageInSubtree(
  root: estree.Node,
  keys: SourceCode.VisitorKeys,
  isPropsArgument: (argument: estree.Node) => boolean,
): boolean {
  if (isSupportedWholePropsUsage(root, isPropsArgument)) {
    return true;
  }

  return childrenOf(root, keys).some(child =>
    hasSupportedWholePropsUsageInSubtree(child, keys, isPropsArgument),
  );
}

/**
 * Returns true when `node` matches any supported whole-props usage shape for the
 * provided `isPropsArgument` predicate and is not filtered out by the ignore rules.
 *
 * Exported so sibling S6767 escapes can reuse the same whole-props shape matcher
 * with a narrower props-binding predicate, for example a decorator callback
 * parameter instead of only literal `props` or `this.props`.
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
 *   this.props
 */
function isWholePropsArgument(argument: estree.Node): boolean {
  return (
    argument.type === 'MemberExpression' &&
    argument.object.type === 'ThisExpression' &&
    isIdentifier(argument.property, 'props')
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
