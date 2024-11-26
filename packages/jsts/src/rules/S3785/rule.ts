/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S3785/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import ts from 'typescript';
import {
  generateMeta,
  getTypeFromTreeNode,
  isRequiredParserServices,
  report,
  toSecondaryLocation,
} from '../helpers/index.js';
import { meta } from './meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, undefined, true),
  create(context: Rule.RuleContext) {
    const services = context.sourceCode.parserServices;
    if (!isRequiredParserServices(services)) {
      return {};
    }
    function isPrimitive(node: estree.Node) {
      const type = getTypeFromTreeNode(node, services);
      return (
        (type.flags & ts.TypeFlags.StringLike) !== 0 ||
        (type.flags & ts.TypeFlags.NumberLike) !== 0 ||
        (type.flags & ts.TypeFlags.BooleanLike) !== 0 ||
        (type.flags & ts.TypeFlags.Null) !== 0 ||
        (type.flags & ts.TypeFlags.Undefined) !== 0
      );
    }
    return {
      'BinaryExpression[operator="in"]': (node: estree.Node) => {
        const { left, right, operator } = node as estree.BinaryExpression;
        if (isPrimitive(right)) {
          const opToken = context.sourceCode
            .getTokensBetween(left, right)
            .find(token => token.type === 'Keyword' && token.value === operator)!;
          report(
            context,
            {
              message: 'TypeError can be thrown as this operand might have primitive type.',
              node: right,
            },
            [toSecondaryLocation(opToken)],
          );
        }
      },
    };
  },
};
