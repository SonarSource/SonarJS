/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
// https://sonarsource.github.io/rspec/#/rspec/S6486/javascript

// inspired from `no-array-index` from `eslint-plugin-react`:
// https://github.com/jsx-eslint/eslint-plugin-react/blob/0a2f6b7e9df32215fcd4e3061ec69ea3f2eef793/lib/rules/no-array-index-key.js#L16

import { Rule } from 'eslint';
import { isMemberExpression } from './helpers';
import { TSESTree } from '@typescript-eslint/experimental-utils';
import * as estree from 'estree';

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      noGeneratedKeys: 'Do not use generated values for keys of React list components.',
    },
  },
  create(context: Rule.RuleContext) {
    return {
      "JSXAttribute[name.name='key']": (pNode: estree.Node) => {
        // hack: it's not possible to type the argument node from TSESTree
        const node = pNode as unknown as TSESTree.JSXAttribute;

        const value = node.value;
        if (!value || value.type !== 'JSXExpressionContainer') {
          // key='foo' or just simply 'key'
          return;
        }

        checkPropValue(context, value.expression);
      },
    };
  },
};

function checkPropValue(context: Rule.RuleContext, node: TSESTree.Node) {
  if (isGeneratedExpression(node)) {
    // key={bar}
    context.report({
      messageId: 'noGeneratedKeys',
      node: node as estree.Node,
    });
    return;
  }

  if (node.type === 'TemplateLiteral') {
    // key={`foo-${bar}`}
    node.expressions.filter(isGeneratedExpression).forEach(() => {
      context.report({
        messageId: 'noGeneratedKeys',
        node: node as estree.Node,
      });
    });

    return;
  }

  if (node.type === 'BinaryExpression') {
    // key={'foo' + bar}
    const identifiers = getIdentifiersFromBinaryExpression(node) as TSESTree.Identifier[];

    identifiers.filter(isGeneratedExpression).forEach(() => {
      context.report({
        messageId: 'noGeneratedKeys',
        node: node as estree.Node,
      });
    });

    return;
  }

  if (
    node.type === 'CallExpression' &&
    node.callee &&
    node.callee.type === 'MemberExpression' &&
    node.callee.object &&
    isGeneratedExpression(node.callee.object) &&
    node.callee.property &&
    node.callee.property.type === 'Identifier' &&
    node.callee.property.name === 'toString'
  ) {
    // key={bar.toString()}
    context.report({
      messageId: 'noGeneratedKeys',
      node: node as estree.Node,
    });
    return;
  }

  if (
    node.type === 'CallExpression' &&
    node.callee &&
    node.callee.type === 'Identifier' &&
    node.callee.name === 'String' &&
    Array.isArray(node.arguments) &&
    node.arguments.length > 0 &&
    isGeneratedExpression(node.arguments[0])
  ) {
    // key={String(bar)}
    context.report({
      messageId: 'noGeneratedKeys',
      node: node.arguments[0] as estree.Node,
    });
  }
}

function isGeneratedExpression(node: TSESTree.Node) {
  return isMathRandom(node) || isDateNow(node);

  function isMathRandom(node: TSESTree.Node) {
    return (
      node.type === 'CallExpression' &&
      isMemberExpression(node.callee as estree.Node, 'Math', 'random')
    );
  }

  function isDateNow(node: TSESTree.Node) {
    return (
      node.type === 'CallExpression' &&
      isMemberExpression(node.callee as estree.Node, 'Date', 'now')
    );
  }
}

function getIdentifiersFromBinaryExpression(side: TSESTree.Node) {
  if (side.type === 'CallExpression') {
    return side;
  }

  if (side.type === 'BinaryExpression') {
    // recurse
    const left: any = getIdentifiersFromBinaryExpression(side.left);
    const right: any = getIdentifiersFromBinaryExpression(side.right);
    return [].concat(left, right).filter(Boolean);
  }

  return null;
}
