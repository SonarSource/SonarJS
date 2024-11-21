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
// https://sonarsource.github.io/rspec/#/rspec/S1066

import type { Rule } from 'eslint';
import estree from 'estree';
import { generateMeta, report, toSecondaryLocation } from '../helpers/index.js';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import { meta } from './meta.js';

const message = 'Merge this if statement with the nested one.';

export const rule: Rule.RuleModule = {
  meta: generateMeta(
    meta as Rule.RuleMetaData,
    {
      messages: {
        mergeNestedIfStatement: message,
      },
    },
    true,
  ),
  create(context) {
    return {
      IfStatement(node: estree.IfStatement) {
        let { consequent } = node;
        if (consequent.type === AST_NODE_TYPES.BlockStatement && consequent.body.length === 1) {
          consequent = consequent.body[0];
        }
        if (isIfStatementWithoutElse(node) && isIfStatementWithoutElse(consequent)) {
          const ifKeyword = context.sourceCode.getFirstToken(consequent);
          const enclosingIfKeyword = context.sourceCode.getFirstToken(node);
          if (ifKeyword && enclosingIfKeyword) {
            report(
              context,
              {
                messageId: 'mergeNestedIfStatement',
                message,
                loc: enclosingIfKeyword.loc,
              },
              [toSecondaryLocation(ifKeyword, 'Nested "if" statement.')],
            );
          }
        }
      },
    };

    function isIfStatementWithoutElse(node: estree.Node): node is estree.IfStatement {
      return node.type === AST_NODE_TYPES.IfStatement && !node.alternate;
    }
  },
};
