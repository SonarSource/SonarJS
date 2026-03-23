/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
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
import { findComponentNode } from '../helpers/react.js';
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

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReportForReact(
    { ...rule, meta: generateMeta(meta, rule.meta) },
    (context, descriptor) => {
      const { node } = descriptor as { node: estree.Node };
      const componentNode = findComponentNode(node, context);
      if (componentNode && hasPropsCall(componentNode, context.sourceCode.visitorKeys)) {
        return;
      }
      // Suppress FP only when the specific reported prop is referenced inside a forwardRef callback.
      const { data } = descriptor as { data?: Record<string, string> };
      const propName = data?.name;
      if (
        propName &&
        componentNode &&
        hasPropMemberReference(context.sourceCode, componentNode, propName)
      ) {
        return;
      }
      context.report(descriptor);
    },
  );
}

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

function hasPropsCall(root: estree.Node, keys: SourceCode.VisitorKeys): boolean {
  if (!root) {
    return false;
  }

  // Check if this is a CallExpression with props as argument
  if (root.type === 'CallExpression') {
    const call = root as estree.CallExpression;
    if (
      call.callee.type !== 'Super' &&
      !isPropTypesCheckCall(call) &&
      call.arguments.some(a => propsArgPatterns.some(p => p(a as estree.Node)))
    ) {
      return true;
    }
  }

  // Check if this is a SpreadElement with props (for {...props} in JSX)
  if (root.type === 'SpreadElement' && propsArgPatterns.some(p => p(root.argument))) {
    return true;
  }

  // Check if this is a JSXSpreadAttribute with props (for {...props} or {...this.props} in JSX elements)
  if (
    root.type === 'JSXSpreadAttribute' &&
    propsArgPatterns.some(p => p((root as unknown as JSXSpreadAttribute).argument))
  ) {
    return true;
  }

  // Check if this is a computed MemberExpression with props (for props[key] or this.props[key])
  if (
    root.type === 'MemberExpression' &&
    root.computed &&
    propsArgPatterns.some(p => p(root.object))
  ) {
    return true;
  }

  // Recursively check all children
  return childrenOf(root, keys).some(child => hasPropsCall(child, keys));
}

function isPropTypesCheckCall(call: estree.CallExpression): boolean {
  return (
    call.callee.type === 'MemberExpression' &&
    isIdentifier(call.callee.object, 'PropTypes') &&
    isIdentifier(call.callee.property, 'checkPropTypes')
  );
}
