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

import type { Rule, SourceCode } from 'eslint';
import type estree from 'estree';
import type { JSXSpreadAttribute } from 'estree-jsx';
import { childrenOf } from '../helpers/ancestor.js';
import { isIdentifier } from '../helpers/ast.js';
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
      // Suppress FP when the component contains a forwardRef call (closure over outer props).
      if (componentNode && containsForwardRefCall(componentNode, context.sourceCode.visitorKeys)) {
        return;
      }
      context.report(descriptor);
    },
  );
}

function containsForwardRefCall(root: estree.Node, keys: SourceCode.VisitorKeys): boolean {
  if (root.type === 'CallExpression') {
    const call = root as estree.CallExpression;
    if (forwardRefCalleePatterns.some(p => p(call.callee))) {
      return true;
    }
  }
  return childrenOf(root, keys).some(child => containsForwardRefCall(child, keys));
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
