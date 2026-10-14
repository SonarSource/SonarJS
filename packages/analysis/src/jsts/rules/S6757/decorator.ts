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
// https://sonarsource.github.io/rspec/#/rspec/S6757/javascript

import type { TSESTree } from '@typescript-eslint/utils';
import type { Rule } from 'eslint';
import type estree from 'estree';
import { isCreateElement } from '../external/react.js';
import { ancestorsChain, childrenOf } from '../helpers/ancestor.js';
import { functionLike } from '../helpers/ast.js';
import { interceptReportForReact } from '../helpers/decorators/interceptor.js';
import { generateMeta } from '../helpers/generate-meta.js';
import * as meta from './generated-meta.js';

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReportForReact(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    (context, reportDescriptor) => {
      const { node } = reportDescriptor as { node?: TSESTree.Node };

      if (
        isThisMemberExpression(node) &&
        (isLexicallyBoundToClassMember(node) ||
          isBoundToLowercaseMemberAssignment(node) ||
          isBoundToTypedThisParameter(node, context))
      ) {
        return;
      }

      context.report(reportDescriptor);
    },
  );
}

function getReceiverFunction(node: TSESTree.MemberExpression) {
  // Arrow functions preserve the receiver; an ordinary nested function owns its own.
  return ancestorsChain(node, new Set<string>()).find(
    ancestor => ancestor.type === 'FunctionExpression' || ancestor.type === 'FunctionDeclaration',
  );
}

function isBoundToTypedThisParameter(
  node: TSESTree.MemberExpression,
  context: Rule.RuleContext,
): boolean {
  const receiver = getReceiverFunction(node);
  if (!receiver) {
    return false;
  }
  const parameter = receiver.params[0];
  return (
    parameter?.type === 'Identifier' &&
    parameter.name === 'this' &&
    parameter.typeAnnotation?.type === 'TSTypeAnnotation' &&
    !isComponentReceiver(receiver, context)
  );
}

function isComponentReceiver(
  receiver: TSESTree.FunctionDeclaration | TSESTree.FunctionExpression,
  context: Rule.RuleContext,
): boolean {
  const parent = receiver.parent;
  let target: TSESTree.Node | undefined;
  if (parent.type === 'VariableDeclarator') {
    target = parent.id;
  } else if (parent.type === 'AssignmentExpression') {
    target = parent.left.type === 'MemberExpression' ? parent.left.property : parent.left;
  } else if (parent.type === 'Property') {
    target = parent.key;
  }
  const name = target?.type === 'Identifier' ? target.name : receiver.id?.name;
  if (name && /^[a-z]/.test(name.replace(/^_+/, ''))) {
    return false;
  }

  // React does not supply a receiver to components, even when they declare typed `this`.
  // Ignore rendering in nested functions: it belongs to those functions, not this receiver.
  const pending = [receiver.body as estree.Node];
  for (let current = pending.pop(); current; current = pending.pop()) {
    if (
      current.type === 'JSXElement' ||
      current.type === 'JSXFragment' ||
      (current.type === 'CallExpression' && isCreateElement(context, current))
    ) {
      return true;
    }
    if (
      !functionLike.has(current.type) &&
      current.type !== 'ClassDeclaration' &&
      current.type !== 'ClassExpression'
    ) {
      pending.push(...childrenOf(current, context.sourceCode.visitorKeys));
    }
  }
  return false;
}

function isBoundToLowercaseMemberAssignment(node: TSESTree.MemberExpression): boolean {
  const receiver = getReceiverFunction(node);
  if (receiver?.type !== 'FunctionExpression') {
    return false;
  }

  const assignment = receiver.parent;
  if (
    assignment.type !== 'AssignmentExpression' ||
    assignment.right !== receiver ||
    assignment.left.type !== 'MemberExpression' ||
    assignment.left.computed ||
    assignment.left.property.type !== 'Identifier'
  ) {
    return false;
  }

  if (
    assignment.left.object.type === 'Identifier' &&
    assignment.left.object.name === 'module' &&
    assignment.left.property.name === 'exports'
  ) {
    return false;
  }

  // Match React's component naming convention, which ignores leading underscores.
  const firstLetter = assignment.left.property.name.replace(/^_+/, '').charAt(0);
  return firstLetter.toUpperCase() !== firstLetter;
}

function isThisMemberExpression(
  node: TSESTree.Node | undefined,
): node is TSESTree.MemberExpression {
  return node?.type === 'MemberExpression' && node.object.type === 'ThisExpression';
}

function isLexicallyBoundToClassMember(node: TSESTree.MemberExpression): boolean {
  let previous: TSESTree.Node = node;

  for (const current of ancestorsChain(node, new Set<string>())) {
    if (isClassMember(current)) {
      // Only the member value owns the instance receiver. A computed key or a member
      // decorator is evaluated in the enclosing scope, which may be a functional component.
      return previous === current.value;
    }

    if (isNonLexicalFunctionBoundary(current)) {
      return false;
    }

    previous = current;
  }

  return false;
}

function isClassMember(
  node: TSESTree.Node,
): node is TSESTree.MethodDefinition | TSESTree.PropertyDefinition | TSESTree.AccessorProperty {
  return (
    node.type === 'MethodDefinition' ||
    node.type === 'PropertyDefinition' ||
    node.type === 'AccessorProperty'
  );
}

function isNonLexicalFunctionBoundary(node: TSESTree.Node): boolean {
  if (node.type === 'FunctionDeclaration') {
    return true;
  }

  if (node.type !== 'FunctionExpression') {
    return false;
  }

  // Method bodies are transparent so traversal can reach the enclosing MethodDefinition.
  return node.parent?.type !== 'MethodDefinition';
}
