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
import { childrenOf, getNodeParent } from '../helpers/ancestor.js';
import { isFunctionNode, isIdentifier } from '../helpers/ast.js';
import { isRequiredParserServices } from '../helpers/parser-services.js';
import {
  getComponentIdentifier,
  getComponentPropsType,
} from '../helpers/react/component-analysis.js';
import { areSameTypeDeclarations, getTypeFromTreeNode } from '../helpers/type.js';
import { isSupportedWholePropsUsage } from './whole-props-usage.js';

/**
 * False-positive remediation escape:
 * returns true when the specific reported prop is consumed through a decorator
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
    !!propName && hasDecoratorFactoryCallPropUsage(context.sourceCode, componentNode, propName)
  );
}

function hasDecoratorFactoryCallPropUsage(
  sourceCode: SourceCode,
  componentNode: estree.Node,
  propName: string,
): boolean {
  const componentIdentifier = getComponentIdentifier(componentNode);
  if (!componentIdentifier) {
    return false;
  }

  const stack = [sourceCode.ast];
  while (stack.length > 0) {
    const node = stack.pop();
    if (node === undefined) {
      continue;
    }

    if (
      node.type === 'CallExpression' &&
      node.arguments.length === 1 &&
      isIdentifier(node.arguments[0], componentIdentifier.name) &&
      node.callee.type === 'CallExpression' &&
      node.callee.arguments.some(argument =>
        isComponentPropsCallbackUsingProp(sourceCode, componentNode, argument, propName),
      )
    ) {
      return true;
    }

    const children = childrenOf(node, sourceCode.visitorKeys);
    for (let i = children.length - 1; i >= 0; i--) {
      stack.push(children[i]);
    }
  }

  return false;
}

function isComponentPropsCallbackUsingProp(
  sourceCode: SourceCode,
  componentNode: estree.Node,
  callbackNode: estree.Node,
  propName: string,
): boolean {
  if (!isFunctionNode(callbackNode)) {
    return false;
  }

  const firstParam = callbackNode.params[0];
  if (
    !isIdentifier(firstParam) ||
    !isSameDeclaredPropsType(sourceCode, componentNode, firstParam)
  ) {
    return false;
  }

  const variable = sourceCode.getScope(callbackNode).set.get(firstParam.name);
  if (!variable) {
    return false;
  }

  return variable.references.some(reference => isComponentPropsUsageReference(reference, propName));
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

function isComponentPropsUsageReference(reference: Scope.Reference, propName: string): boolean {
  const parent = getNodeParent(reference.identifier);
  if (
    parent?.type === 'MemberExpression' &&
    parent.object === reference.identifier &&
    !parent.computed &&
    isIdentifier(parent.property, propName)
  ) {
    return true;
  }

  return (
    !!parent && isSupportedWholePropsUsage(parent, argument => argument === reference.identifier)
  );
}
