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
import { getNodeParent } from '../helpers/ancestor.js';
import {
  collectReferences,
  getVariableFromName,
  isFunctionNode,
  isIdentifier,
} from '../helpers/ast.js';
import { isRequiredParserServices } from '../helpers/parser-services.js';
import {
  getComponentIdentifier,
  getComponentPropsType,
} from '../helpers/react/component-analysis.js';
import { areSameTypeDeclarations, getTypeFromTreeNode } from '../helpers/type.js';
import {
  isNamedPropExpressionOrAlias,
  isWholePropsExpressionOrAlias,
} from '../helpers/react/prop-alias-resolution.js';
import { isSupportedWholePropsUsage } from './whole-props-usage.js';

/**
 * Returns true when the specific reported prop is consumed through a decorator
 * factory callback typed with the same props contract as the component.
 *
 * track((props: ComponentProps) => props.propName)(Component);
 */
export function hasDecoratorPropUsage(
  componentNode: estree.Node,
  context: Rule.RuleContext,
  propName: string | undefined,
): boolean {
  return (
    !!propName &&
    hasDecoratorFactoryCallPropUsage(context, context.sourceCode, componentNode, propName)
  );
}

function hasDecoratorFactoryCallPropUsage(
  context: Rule.RuleContext,
  sourceCode: SourceCode,
  componentNode: estree.Node,
  propName: string,
): boolean {
  const componentIdentifier = getComponentIdentifier(componentNode);
  const componentVariable =
    componentIdentifier && getVariableForIdentifier(sourceCode, componentIdentifier);
  if (!componentVariable) {
    return false;
  }

  return componentVariable.references.some(reference =>
    isDecoratorFactoryTargetReference(context, sourceCode, componentNode, reference, propName),
  );
}

/**
 * Pseudo code:
 *   track(callback)(Component)
 *
 * The matched component reference must be the only outer application argument.
 */
function isDecoratorFactoryTargetReference(
  context: Rule.RuleContext,
  sourceCode: SourceCode,
  componentNode: estree.Node,
  reference: Scope.Reference,
  propName: string,
): boolean {
  const decoratorApplication = getDecoratorApplicationForReference(reference);
  return (
    !!decoratorApplication &&
    hasMatchingDecoratorCallbackArgument(
      context,
      sourceCode,
      componentNode,
      decoratorApplication.callee,
      propName,
    )
  );
}

/**
 * Pseudo code:
 *   track(callback)(Component)
 *
 * Returns the outer application call when the reference is the only target argument.
 */
function getDecoratorApplicationForReference(
  reference: Scope.Reference,
): (estree.CallExpression & { callee: estree.CallExpression }) | undefined {
  const parent = getNodeParent(reference.identifier);
  return isDecoratorApplicationCall(parent, reference.identifier) ? parent : undefined;
}

function isDecoratorApplicationCall(
  node: estree.Node | undefined,
  targetNode: estree.Identifier,
): node is estree.CallExpression & { callee: estree.CallExpression } {
  return (
    node?.type === 'CallExpression' &&
    node.arguments.length === 1 &&
    node.arguments[0] === targetNode &&
    node.callee.type === 'CallExpression'
  );
}

/**
 * Pseudo code:
 *   track(
 *     (props: ComponentProps) => {
 *       props.propName;
 *     },
 *   )(Component)
 *
 * At least one inner call argument must be a callback whose first parameter is typed
 * with the same declared props contract as the component and uses the reported prop.
 */
function hasMatchingDecoratorCallbackArgument(
  context: Rule.RuleContext,
  sourceCode: SourceCode,
  componentNode: estree.Node,
  decoratorFactoryCall: estree.CallExpression,
  propName: string,
): boolean {
  return decoratorFactoryCall.arguments.some(argument =>
    isComponentPropsCallbackUsingProp(context, sourceCode, componentNode, argument, propName),
  );
}

function isComponentPropsCallbackUsingProp(
  context: Rule.RuleContext,
  sourceCode: SourceCode,
  componentNode: estree.Node,
  callbackNode: estree.Node,
  propName: string,
): boolean {
  const propsVariable = getMatchingCallbackPropsVariable(sourceCode, componentNode, callbackNode);
  const isTrackedPropsExpression = (node: estree.Node) =>
    node.type === 'Identifier' && getVariableFromName(context, node.name, node) === propsVariable;

  return (
    !!propsVariable &&
    collectReferences(sourceCode.getScope(callbackNode)).some(reference =>
      isComponentPropsUsageReference(context, reference, isTrackedPropsExpression, propName),
    )
  );
}

/**
 * Pseudo code:
 *   (props: ComponentProps) => ...
 *
 * The first callback parameter must be an identifier typed with the same declared props
 * contract as the component. When that holds, return its scope variable.
 */
function getMatchingCallbackPropsVariable(
  sourceCode: SourceCode,
  componentNode: estree.Node,
  callbackNode: estree.Node,
): Scope.Variable | undefined {
  if (!isFunctionNode(callbackNode)) {
    return undefined;
  }

  const firstParam = callbackNode.params[0];
  if (
    !isIdentifier(firstParam) ||
    !isSameDeclaredPropsType(sourceCode, componentNode, firstParam)
  ) {
    return undefined;
  }

  return sourceCode.getScope(callbackNode).set.get(firstParam.name);
}

function getVariableForIdentifier(
  sourceCode: SourceCode,
  identifier: estree.Identifier,
): Scope.Variable | undefined {
  let scope: Scope.Scope | null = sourceCode.getScope(identifier);
  while (scope) {
    const reference = scope.references.find(candidate => candidate.identifier === identifier);
    if (reference) {
      return reference.resolved ?? undefined;
    }

    const variable = scope.variables.find(candidate =>
      candidate.defs.some(definition => definition.name === identifier),
    );
    if (variable) {
      return variable;
    }

    scope = scope.upper;
  }

  return undefined;
}

function isSameDeclaredPropsType(
  sourceCode: SourceCode,
  componentNode: estree.Node,
  callbackPropsParam: estree.Identifier,
): boolean {
  const services = sourceCode.parserServices;
  if (!isRequiredParserServices(services)) {
    return false;
  }

  const checker = services.program.getTypeChecker();
  const componentPropsType = getComponentPropsType(componentNode, services);
  const callbackPropsType = getTypeFromTreeNode(callbackPropsParam, services);
  return areSameTypeDeclarations(checker, callbackPropsType, componentPropsType);
}

function isComponentPropsUsageReference(
  context: Rule.RuleContext,
  reference: Scope.Reference,
  isTrackedPropsExpression: (node: estree.Node) => boolean,
  propName: string,
): boolean {
  const parent = getNodeParent(reference.identifier);
  const usageNode =
    parent?.type === 'MemberExpression' && parent.object === reference.identifier
      ? parent
      : reference.identifier;

  return (
    isNamedPropExpressionOrAlias(context, usageNode, propName, isTrackedPropsExpression) ||
    isWholePropsForwardingUsage(context, parent, isTrackedPropsExpression)
  );
}

/**
 * Pseudo code:
 *   consume(props)
 *   [...props]
 *   <Component {...props} />
 *   props[key]
 */
function isWholePropsForwardingUsage(
  context: Rule.RuleContext,
  node: estree.Node | undefined,
  isTrackedPropsExpression: (node: estree.Node) => boolean,
): boolean {
  return (
    !!node &&
    isSupportedWholePropsUsage(node, argument =>
      isWholePropsExpressionOrAlias(context, argument, isTrackedPropsExpression),
    )
  );
}
