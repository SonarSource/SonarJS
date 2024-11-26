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
// https://sonarsource.github.io/rspec/#/rspec/S7059/javascript

import type { Rule } from 'eslint';
import {
  isRequiredParserServices,
  generateMeta,
  isThenable,
  isFunctionNode,
} from '../helpers/index.js';
import estree from 'estree';
import { meta } from './meta.js';
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
