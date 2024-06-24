/*
 * eslint-plugin-sonarjs
 * Copyright (C) 2018-2021 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S1066

import { Rule } from 'eslint';
import estree from 'estree';
import { docsUrl, issueLocation, report } from '../helpers';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

const message = 'Merge this if statement with the nested one.';

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      mergeNestedIfStatement: message,
      sonarRuntime: '{{sonarRuntimeData}}',
    },
    type: 'suggestion',
    docs: {
      description: 'Collapsible "if" statements should be merged',
      recommended: true,
      url: docsUrl(__filename),
    },
    schema: [
      {
        // internal parameter
        type: 'string',
        enum: ['sonar-runtime'],
      },
    ],
  },
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
                loc: enclosingIfKeyword.loc,
              },
              [issueLocation(ifKeyword.loc, ifKeyword.loc, 'Nested "if" statement.')],
              message,
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
