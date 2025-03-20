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
// https://sonarsource.github.io/rspec/#/rspec/S2123/javascript

import { Rule, Scope } from 'eslint';
import estree from 'estree';
import { generateMeta } from '../helpers/index.js';
import * as meta from './generated-meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      removeIncrement: 'Remove this {{updateOperator}}rement or correct the code not to waste it.',
    },
  }),
  create(context: Rule.RuleContext) {
    function reportUpdateExpression(updateExpression: estree.UpdateExpression) {
      const updateOperator = updateExpression.operator === '++' ? 'inc' : 'dec';
      context.report({
        messageId: 'removeIncrement',
        data: {
          updateOperator,
        },
        node: updateExpression,
      });
    }

    return {
      'ReturnStatement > UpdateExpression'(node: estree.Node) {
        const updateExpression = node as estree.UpdateExpression;
        const argument = updateExpression.argument;
        if (
          !updateExpression.prefix &&
          argument.type === 'Identifier' &&
          isLocalIdentifier(argument, context.sourceCode.getScope(node))
        ) {
          reportUpdateExpression(updateExpression);
        }
      },
      AssignmentExpression(node: estree.Node) {
        const assignment = node as estree.AssignmentExpression;
        const rhs = assignment.right;
        if (rhs.type === 'UpdateExpression' && !rhs.prefix) {
          const lhs = assignment.left;
          if (
            lhs.type === 'Identifier' &&
            rhs.argument.type === 'Identifier' &&
            rhs.argument.name === lhs.name
          ) {
            reportUpdateExpression(rhs);
          }
        }
      },
    };
  },
};

function isLocalIdentifier(id: estree.Identifier, scope: Scope.Scope) {
  return scope.variables.some(v => v.identifiers.some(i => i.name === id.name));
}
