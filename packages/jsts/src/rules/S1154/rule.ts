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
// https://sonarsource.github.io/rspec/#/rspec/S1154/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import ts from 'typescript';
import { generateMeta, getTypeFromTreeNode, isRequiredParserServices } from '../helpers/index.js';
import * as meta from './meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      uselessStringOp:
        '{{symbol}} is an immutable object; you must either store or return the result of the operation.',
    },
  }),
  create(context: Rule.RuleContext) {
    const services = context.sourceCode.parserServices;
    if (!isRequiredParserServices(services)) {
      return {};
    }

    function isString(node: estree.Node) {
      const type = getTypeFromTreeNode(node, services);
      return (type.flags & ts.TypeFlags.StringLike) !== 0;
    }

    function getVariable(node: estree.Node) {
      let variable = context.sourceCode.getText(node);
      if (variable.length > 30) {
        variable = 'String';
      }
      return variable;
    }

    return {
      'ExpressionStatement > CallExpression[callee.type="MemberExpression"]': (
        node: estree.Node,
      ) => {
        const { object, property } = (node as estree.CallExpression)
          .callee as estree.MemberExpression;
        if (isString(object) && property.type === 'Identifier') {
          context.report({
            messageId: 'uselessStringOp',
            data: {
              symbol: getVariable(object),
            },
            node: property,
          });
        }
      },
    };
  },
};
