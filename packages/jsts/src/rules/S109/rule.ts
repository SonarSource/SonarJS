/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S109/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import { tsEslintRules } from '../typescript-eslint';
import { generateMeta, getNodeParent, isMethodInvocation } from '../helpers';
import { meta } from './meta';

const baseRuleModule = tsEslintRules['no-magic-numbers'];
export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, baseRuleModule.meta),
  create(context: Rule.RuleContext) {
    const baseRule = baseRuleModule.create(context);
    return {
      Literal: (node: estree.Node) => {
        if (!isNumericLiteral(node)) {
          return;
        }
        const numericLiteral = getNumericLiteral(node);
        if (!numericLiteral) {
          return;
        }
        const { value, parent } = numericLiteral;
        if (
          isPower(value) ||
          isJSX(context, node) ||
          isBitwiseOperator(parent) ||
          isJsonStringify(parent)
        ) {
          return;
        }
        // Delegate to the typescript-eslint rule
        // @ts-ignore
        baseRule.Literal(node);
      },
    };
  },
};

function getNumericLiteral(node: estree.Literal) {
  // Literal or UnaryExpression
  let numberNode;
  let raw: string;
  let value = numericLiteralValue(node);
  let parent = getNodeParent(node);

  if (!parent || !value) {
    return undefined;
  }
  // Treat unary minus as a part of the number
  if (parent.type === 'UnaryExpression' && parent.operator === '-') {
    numberNode = parent;
    parent = getNodeParent(parent);
    value = -value;
    raw = `-${node.raw}`;
  } else {
    numberNode = node;
    raw = node.raw ?? '';
  }

  return { numberNode, raw, value, parent };
}

function numericLiteralValue(node: estree.Literal) {
  if (typeof node.value === 'number') {
    return node.value;
  }
}

function isNumericLiteral(node: estree.Node): node is estree.Literal {
  return (
    node.type === 'Literal' && (typeof node.value === 'number' || typeof node.value === 'bigint')
  );
}

function isPower(value: number) {
  return Number.isInteger(Math.log10(value)) || Number.isInteger(Math.log2(value));
}

function isJSX(context: Rule.RuleContext, node: estree.Node) {
  return context.sourceCode.getAncestors(node).some(node => node.type.startsWith('JSX'));
}

function isBitwiseOperator(node: estree.Node) {
  return (
    node.type === 'BinaryExpression' && ['&', '|', '^', '<<', '>>', '>>>'].includes(node.operator)
  );
}

function isJsonStringify(node: estree.Node) {
  return node.type === 'CallExpression' && isMethodInvocation(node, 'JSON', 'stringify', 3);
}
