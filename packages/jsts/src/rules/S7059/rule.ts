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
// https://sonarsource.github.io/rspec/#/rspec/S7059/javascript

import { Rule } from 'eslint';
import { isRequiredParserServices, generateMeta, isThenable, isFunctionNode } from '../helpers';
import * as estree from 'estree';
import { meta } from './meta';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

const flaggedStatements = new Set();

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      noAsyncConstructor: 'Refactor this asynchronous operation outside of the constructor.',
    },
  }),
  create(context: Rule.RuleContext) {
    const services = context.sourceCode.parserServices;
    if (!isRequiredParserServices(services)) {
      return {};
    }

    /**
     * Given a Promise call, get the parent statement of the async call.
     * We want to ensure that it is inside a constructor, but not part of a function declaration:
     * constructor() {
     *  foo();
     * }
     * and not
     * constructor() {
     *  myFunction = () => { foo() }
     * }
     * @param node : promise call
     */
    function asyncStatementInsideConstructor(node: estree.Expression) {
      let classConstructor: estree.MethodDefinition | undefined;
      let statement: estree.Statement | undefined;
      context.sourceCode.getAncestors(node).forEach(node => {
        if (node.type === AST_NODE_TYPES.MethodDefinition && node.kind === 'constructor') {
          classConstructor = node;
        }
        if (classConstructor && node.type.endsWith('Statement')) {
          statement = node as estree.Statement;
        }
        // If we find a function declaration it should not be considered as part of the constructor
        if (classConstructor && statement && isFunctionNode(node)) {
          statement = undefined;
          classConstructor = undefined;
        }
      });
      return statement;
    }

    return {
      CallExpression(node: estree.CallExpression) {
        if (!isThenable(node, services)) {
          return;
        }
        // we want to raise on the parent statement
        const statement = asyncStatementInsideConstructor(node);
        if (statement && !flaggedStatements.has(statement)) {
          flaggedStatements.add(statement);
          context.report({
            node: statement,
            messageId: 'noAsyncConstructor',
          });
        }
      },
      'Program:exit'() {
        flaggedStatements.clear();
      },
    };
  },
};