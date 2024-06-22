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

import type { TSESTree, TSESLint } from '@typescript-eslint/utils';
import { isIfStatement, isBlockStatement } from '../utils/nodes';
import { report, issueLocation } from '../utils/locations';
import docsUrl from '../utils/docs-url';

const message = 'Merge this if statement with the nested one.';

const rule: TSESLint.RuleModule<string, string[]> = {
  defaultOptions: [],
  meta: {
    messages: {
      mergeNestedIfStatement: message,
      sonarRuntime: '{{sonarRuntimeData}}',
    },
    type: 'suggestion',
    docs: {
      description: 'Collapsible "if" statements should be merged',
      recommended: 'recommended',
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
      IfStatement(node: TSESTree.Node) {
        let { consequent } = node as TSESTree.IfStatement;
        if (isBlockStatement(consequent) && consequent.body.length === 1) {
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

    function isIfStatementWithoutElse(node: TSESTree.Node): node is TSESTree.IfStatement {
      return isIfStatement(node) && !node.alternate;
    }
  },
};

export = rule;
