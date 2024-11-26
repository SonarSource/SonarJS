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
// https://sonarsource.github.io/rspec/#/rspec/S1535/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import { generateMeta } from '../helpers/index.js';
import { meta } from './meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      restrictLoop: 'Restrict what this loop acts on by testing each property.',
    },
  }),
  create(context: Rule.RuleContext) {
    function isAttrCopy(statement: estree.Node) {
      if (statement.type !== 'ExpressionStatement') {
        return false;
      }
      const expression = statement.expression;
      return (
        expression.type === 'AssignmentExpression' &&
        expression.left.type === 'MemberExpression' &&
        expression.left.computed
      );
    }

    return {
      ForInStatement(node) {
        const forInStatement = node as estree.ForInStatement;
        const body = forInStatement.body;

        if (body.type === 'BlockStatement') {
          if (body.body.length === 0) {
            return;
          }
          const firstStatement = body.body[0];
          if (firstStatement.type === 'IfStatement' || isAttrCopy(firstStatement)) {
            return;
          }
        }

        if (body.type === 'EmptyStatement' || body.type === 'IfStatement' || isAttrCopy(body)) {
          return;
        }

        context.report({
          node: forInStatement,
          messageId: 'restrictLoop',
        });
      },
    };
  },
};
