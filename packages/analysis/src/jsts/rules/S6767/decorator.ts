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
// https://sonarsource.github.io/rspec/#/rspec/S6767/javascript

import type { Rule, Scope, SourceCode } from 'eslint';
import type estree from 'estree';
import type { JSXSpreadAttribute } from 'estree-jsx';
import { childrenOf, getNodeParent } from '../helpers/ancestor.js';
import { isFunctionNode, isIdentifier } from '../helpers/ast.js';
import { interceptReportForReact } from '../helpers/decorators/interceptor.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { findComponentNode, getComponentVariable } from '../helpers/react.js';
import * as meta from './generated-meta.js';

/** Composable pattern checkers — extend via Array.some() for future FP patterns. */
const propsArgPatterns: Array<(arg: estree.Node) => boolean> = [
  arg => isIdentifier(arg, 'props'),
  arg =>
    arg.type === 'MemberExpression' &&
    arg.object.type === 'ThisExpression' &&
    isIdentifier(arg.property, 'props'),
];

/** Composable callee checkers for forwardRef call detection. */
const forwardRefCalleePatterns: Array<(callee: estree.Expression | estree.Super) => boolean> = [
  callee => isIdentifier(callee, 'forwardRef'),
  callee =>
    callee.type === 'MemberExpression' &&
    isIdentifier(callee.object, 'React') &&
    isIdentifier(callee.property, 'forwardRef'),
];

type PropsUsageMatcher = (
  node: estree.Node,
  isPropsArgument: (arg: estree.Node) => boolean,
) => boolean;

/** Keep the whole-props usage taxonomy shared between recursive and reference-based checks. */
const wholePropsUsagePatterns: PropsUsageMatcher[] = [
  (node, isPropsArgument) =>
    node.type === 'CallExpression' &&
    node.callee.type !== 'Super' &&
    node.arguments.some(argument => isPropsArgument(argument as estree.Node)),
  (node, isPropsArgument) => node.type === 'SpreadElement' && isPropsArgument(node.argument),
  (node, isPropsArgument) =>
    node.type === 'JSXSpreadAttribute' &&
    isPropsArgument((node as unknown as JSXSpreadAttribute).argument),
  (node, isPropsArgument) =>
    node.type === 'MemberExpression' && node.computed && isPropsArgument(node.object),
];

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReportForReact(
    { ...rule, meta: generateMeta(meta, rule.meta) },
    (context, descriptor) => {
      const { node } = descriptor as { node: estree.Node };
      const componentNode = findComponentNode(node, context);
      if (
        componentNode &&
        (hasPropsCall(componentNode, context.sourceCode.visitorKeys) ||
          hasOwnCustomSuperclassPropsForwarding(componentNode))
      ) {
        return;
      }
      // Suppress only when the reported prop is consumed through a known indirect usage pattern.
      const { data } = descriptor as { data?: Record<string, string> };
      const propName = data?.name;
      if (
        propName &&
        componentNode &&
        propUsagePatterns.some(pattern => pattern(context.sourceCode, componentNode, propName))
      ) {
        return;
      }
      context.report(descriptor);
    },
  );
}

function hasOwnCustomSuperclassPropsForwarding(componentNode: estree.Node): boolean {
  if (componentNode.type !== 'ClassDeclaration' && componentNode.type !== 'ClassExpression') {
    return false;
  }

  const superClass = componentNode.superClass;
  if (superClass == null || isBuiltinReactSuperclass(superClass)) {
    return false;
  }

  return componentNode.body.body.some(
    member =>
      member.type === 'MethodDefinition' &&
      member.kind === 'constructor' &&
      member.value.body?.body.some(isWholePropsSuperCallStatement) === true,
  );
}

function isBuiltinReactSuperclass(superClass: estree.Expression): boolean {
  return (
    isIdentifier(superClass, 'Component') ||
    isIdentifier(superClass, 'PureComponent') ||
    (superClass.type === 'MemberExpression' &&
      isIdentifier(superClass.object, 'React') &&
      (isIdentifier(superClass.property, 'Component') ||
        isIdentifier(superClass.property, 'PureComponent')))
  );
}

function isWholePropsSuperCallStatement(statement: estree.Statement): boolean {
  if (
    statement.type !== 'ExpressionStatement' ||
    statement.expression.type !== 'CallExpression' ||
    statement.expression.callee.type !== 'Super'
  ) {
    return false;
  }

  // This decorator intentionally treats direct whole-props forwarding to a custom
  // superclass as sufficient usage. Deeper validation of actual superclass prop
  // consumption is intentionally out of scope for this decorator-based design, even
  // though that accepts a small false-negative risk when forwarded props are not read.
  return statement.expression.arguments.some(argument =>
    isIdentifier(argument as estree.Node, 'props'),
  );
}

const propUsagePatterns: Array<
  (sourceCode: SourceCode, componentNode: estree.Node, propName: string) => boolean
> = [hasPropMemberReference, hasDecoratorPropUsage];

/**
 * Returns true only when `propName` is referenced through the component's actual
 * first parameter binding and the matching member access sits inside a forwardRef callback.
 */
function hasPropMemberReference(
  sourceCode: SourceCode,
  componentNode: estree.Node,
  propName: string,
): boolean {
  if (!isFunctionNode(componentNode)) {
    return false;
  }

  const propsParam = componentNode.params[0];
  if (!isIdentifier(propsParam)) {
    return false;
  }

  const variable = sourceCode.getScope(componentNode).set.get(propsParam.name);
  if (!variable) {
    return false;
  }

  return variable.references.some(reference =>
    isPropReferenceInForwardRefCallback(reference, propName),
  );
}

function isPropReferenceInForwardRefCallback(
  reference: Scope.Reference,
  propName: string,
): boolean {
  const memberExpression = getNodeParent(reference.identifier);
  if (
    memberExpression?.type !== 'MemberExpression' ||
    memberExpression.object !== reference.identifier ||
    memberExpression.computed ||
    !isIdentifier(memberExpression.property, propName)
  ) {
    return false;
  }

  // Walk up ancestors. Track `prev` so that when we find a forwardRef CallExpression
  // we can confirm the reference sits inside its first argument (the render callback),
  // not in the callee position or a later argument.
  let prev: estree.Node = memberExpression;
  let current: estree.Node | undefined = getNodeParent(memberExpression);
  while (current) {
    if (current.type === 'CallExpression') {
      const call = current;
      if (
        forwardRefCalleePatterns.some(pattern => pattern(call.callee)) &&
        call.arguments[0] === prev
      ) {
        return true;
      }
    }
    prev = current;
    current = getNodeParent(current);
  }
  return false;
}

function hasDecoratorPropUsage(
  sourceCode: SourceCode,
  componentNode: estree.Node,
  propName: string,
): boolean {
  return hasDecoratorFactoryCallPropUsage(sourceCode, componentNode, propName);
}

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
      decoratorApplication.arguments[0] === reference.identifier &&
      decoratorApplication.callee.type === 'CallExpression' &&
      decoratorApplication.callee.arguments.some(argument =>
        isPropsCallbackUsingProp(sourceCode, argument as estree.Node, propName),
      )
    );
  });
}

function isPropsCallbackUsingProp(
  sourceCode: SourceCode,
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

  const variable = sourceCode.getScope(callbackNode).set.get(firstParam.name);
  if (!variable) {
    return false;
  }

  return variable.references.some(reference => isTrackedPropsReference(reference, propName));
}

function isTrackedPropsReference(reference: Scope.Reference, propName: string): boolean {
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

  return isWholePropsUsage(parent, reference.identifier) && !isIgnoredWholePropsUsage(parent);
}

function isWholePropsUsage(parent: estree.Node, propsIdentifier: estree.Identifier): boolean {
  return matchesWholePropsUsage(parent, argument => argument === propsIdentifier);
}

function isIgnoredWholePropsUsage(node: estree.Node): boolean {
  return node.type === 'CallExpression' && isPropTypesCheckCall(node);
}

function hasPropsCall(root: estree.Node, keys: SourceCode.VisitorKeys): boolean {
  if (!root) {
    return false;
  }

  if (
    matchesWholePropsUsage(root, argument => propsArgPatterns.some(pattern => pattern(argument))) &&
    !isIgnoredWholePropsUsage(root)
  ) {
    return true;
  }

  // Recursively check all children
  return childrenOf(root, keys).some(child => hasPropsCall(child, keys));
}

function matchesWholePropsUsage(
  node: estree.Node,
  isPropsArgument: (argument: estree.Node) => boolean,
): boolean {
  return wholePropsUsagePatterns.some(pattern => pattern(node, isPropsArgument));
}

function isPropTypesCheckCall(call: estree.CallExpression): boolean {
  return (
    call.callee.type === 'MemberExpression' &&
    isIdentifier(call.callee.object, 'PropTypes') &&
    isIdentifier(call.callee.property, 'checkPropTypes')
  );
}
