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

import type { TSESTree } from '@typescript-eslint/utils';
import type { Rule, Scope, SourceCode } from 'eslint';
import type estree from 'estree';
import { getNodeParent } from '../helpers/ancestor.js';
import { isFunctionNode, isIdentifier } from '../helpers/ast.js';
import { isRequiredParserServices } from '../helpers/parser-services.js';
import { getComponentPropsType, getComponentVariable } from '../helpers/react.js';
import { areSameTypeDeclarations, getTypeFromTreeNode } from '../helpers/type.js';
import { isSupportedWholePropsUsage } from './whole-props-usage.js';

/**
 * False-positive remediation escape:
 * returns true when the specific reported prop is consumed through one of these
 * decorator-specific indirect patterns:
 *
 * track((props: ComponentProps) => props.propName)(Component);
 *
 * @track((props: ComponentProps) => props.propName)
 * class Component extends React.Component<ComponentProps> {}
 */
export function hasDecoratorPropUsage(
  componentNode: estree.Node,
  context: Rule.RuleContext,
  propName: string | undefined,
): boolean {
  if (!propName) {
    return false;
  }

  return (
    hasDecoratorFactoryCallPropUsage(context.sourceCode, componentNode, propName) ||
    hasDecoratorAnnotationPropUsage(context.sourceCode, componentNode, propName)
  );
}

/**
 * Pseudo code for the matched AST:
 * track(
 *   (props: ComponentProps) => {
 *     props.propName;
 *     return buildPayload(props);
 *   },
 * )(Component);
 *
 * The decorated target must be the component reference passed as the sole outer
 * call argument.
 */
function hasDecoratorFactoryCallPropUsage(
  sourceCode: SourceCode,
  componentNode: estree.Node,
  propName: string,
): boolean {
  const componentVariable = getComponentVariable(sourceCode, componentNode);
  if (!componentVariable) {
    return false;
  }

  return componentVariable.references.some(reference => {
    const decoratorApplication = getNodeParent(reference.identifier);
    return (
      decoratorApplication?.type === 'CallExpression' &&
      decoratorApplication.arguments.length === 1 &&
      decoratorApplication.arguments[0] === reference.identifier &&
      decoratorApplication.callee.type === 'CallExpression' &&
      decoratorApplication.callee.arguments.some(argument =>
        isComponentPropsCallbackUsingProp(sourceCode, componentNode, argument, propName),
      )
    );
  });
}

/**
 * Pseudo code for the matched AST:
 * @track(
 *   (props: ComponentProps) => {
 *     props.propName;
 *     return buildPayload(props);
 *   },
 * )
 * class Component extends React.Component<ComponentProps> {}
 */
function hasDecoratorAnnotationPropUsage(
  sourceCode: SourceCode,
  componentNode: estree.Node,
  propName: string,
): boolean {
  const componentTsNode = componentNode as TSESTree.Node;
  if (componentTsNode.type !== 'ClassDeclaration' && componentTsNode.type !== 'ClassExpression') {
    return false;
  }

  return (
    componentTsNode.decorators?.some(({ expression }) =>
      isDecoratorCallUsingProp(expression, sourceCode, componentNode, propName),
    ) ?? false
  );
}

function isDecoratorCallUsingProp(
  expression: TSESTree.Node,
  sourceCode: SourceCode,
  componentNode: estree.Node,
  propName: string,
): boolean {
  return (
    expression.type === 'CallExpression' &&
    expression.arguments.some(argument =>
      isComponentPropsCallbackUsingProp(
        sourceCode,
        componentNode,
        argument as estree.Node,
        propName,
      ),
    )
  );
}

/**
 * Pseudo code for the matched AST:
 * (props: ComponentProps) => {
 *   props.propName;
 *   return buildPayload(props);
 * }
 *
 * The callback first parameter must be provably the same component props type,
 * including the same generic instantiation, not just any object with a matching
 * alias symbol.
 */
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
  if (!isIdentifier(firstParam)) {
    return false;
  }
  if (!isSameDeclaredPropsType(sourceCode, componentNode, firstParam)) {
    return false;
  }

  const variable = sourceCode.getScope(callbackNode).set.get(firstParam.name);
  if (!variable) {
    return false;
  }

  // Unlike forwardRef closures, decorator callbacks introduce their own props
  // parameter instead of closing over the component's original one. That means
  // the rule-level whole-props remediation does not naturally observe callback
  // usages such as `buildPayload(props)`, so we re-apply the same whole-props
  // shapes against this callback parameter here.
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
  // Keep the escape conservative when either side collapses to top-level `any`
  // or `unknown`: without a declared props shape, we cannot prove equivalence.
  return areSameTypeDeclarations(checker, callbackPropsType, componentPropsType);
}

/**
 * Pseudo code for the matched AST patterns:
 * props.propName;
 *
 * buildPayload(props);
 *
 * The whole-props handoff must also pass the ignore filter from `whole-props-usage.ts`.
 */
function isComponentPropsUsageReference(reference: Scope.Reference, propName: string): boolean {
  const parent = getNodeParent(reference.identifier);
  if (!parent) {
    return false;
  }

  if (
    parent.type === 'MemberExpression' &&
    parent.object === reference.identifier &&
    !parent.computed &&
    isIdentifier(parent.property, propName)
  ) {
    return true;
  }

  return isSupportedWholePropsUsage(parent, argument => argument === reference.identifier);
}
