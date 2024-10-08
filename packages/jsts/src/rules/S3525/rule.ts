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
// https://sonarsource.github.io/rspec/#/rspec/S3525/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import ts from 'typescript';
import {
  generateMeta,
  getTypeFromTreeNode,
  isRequiredParserServices,
  RequiredParserServices,
} from '../helpers/index.js';
import { meta } from './meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      declareClass:
        'Declare a "{{class}}" class and move this declaration of "{{declaration}}" into it.',
    },
  }),
  create(context: Rule.RuleContext) {
    const services = context.sourceCode.parserServices;
    const isFunction = isRequiredParserServices(services) ? isFunctionType : isFunctionLike;
    return {
      AssignmentExpression: (node: estree.Node) => {
        const { left, right } = node as estree.AssignmentExpression;
        if (left.type === 'MemberExpression' && isFunction(right, services)) {
          const [member, prototype] = [left.object, left.property];
          if (member.type === 'MemberExpression' && prototype.type === 'Identifier') {
            const [klass, property] = [member.object, member.property];
            if (
              klass.type === 'Identifier' &&
              property.type === 'Identifier' &&
              property.name === 'prototype'
            ) {
              context.report({
                messageId: 'declareClass',
                data: {
                  class: klass.name,
                  declaration: prototype.name,
                },
                node: left,
              });
            }
          }
        }
      },
    };
  },
};

function isFunctionType(node: estree.Node, services: RequiredParserServices) {
  const type = getTypeFromTreeNode(node, services);
  return type.symbol && (type.symbol.flags & ts.SymbolFlags.Function) !== 0;
}

function isFunctionLike(node: estree.Node, _services: RequiredParserServices) {
  return ['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'].includes(
    node.type,
  );
}
