/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S3525/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import ts from 'typescript';
import {
  generateMeta,
  getTypeFromTreeNode,
  isRequiredParserServices,
  RequiredParserServices,
} from '../helpers/index.js';
import * as meta from './generated-meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
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
