/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
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
import { isRequiredParserServices } from '../helpers/parser-services.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { isThenable } from '../helpers/type.js';
import { isFunctionNode, isStaticMethodCall } from '../helpers/ast.js';
import type estree from 'estree';
import type { TSESTree } from '@typescript-eslint/utils';
import type ts from 'typescript';
import * as meta from './generated-meta.js';

const flaggedStatements = new Set();

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
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
      for (const ancestor of context.sourceCode.getAncestors(node)) {
        if (ancestor.type === 'MethodDefinition' && ancestor.kind === 'constructor') {
          classConstructor = ancestor;
        }
        if (classConstructor && ancestor.type.endsWith('Statement')) {
          statement = ancestor as estree.Statement;
        }
        // If we find a function declaration it should not be considered as part of the constructor
        if (classConstructor && statement && isFunctionNode(ancestor)) {
          statement = undefined;
          classConstructor = undefined;
        }
      }
      return statement;
    }

    function isResolvedPromiseSentinel(node: estree.CallExpression, statement: estree.Statement) {
      if (statement.type !== 'ExpressionStatement') {
        return false;
      }
      const assignment = statement.expression;
      if (
        assignment.type !== 'AssignmentExpression' ||
        assignment.operator !== '=' ||
        assignment.right !== node ||
        assignment.left.type !== 'MemberExpression' ||
        assignment.left.object.type !== 'ThisExpression' ||
        (assignment.left.computed
          ? assignment.left.property.type !== 'Literal'
          : assignment.left.property.type !== 'Identifier' &&
            assignment.left.property.type !== 'PrivateIdentifier') ||
        node.arguments.length !== 0 ||
        !isStaticMethodCall(node, 'Promise', 'resolve') ||
        node.callee.type !== 'MemberExpression'
      ) {
        return false;
      }
      return (
        isDefaultLibrarySymbol(node.callee.object) && isDefaultLibrarySymbol(node.callee.property)
      );
    }

    function isDefaultLibrarySymbol(node: estree.Node) {
      const mapped = services.esTreeNodeToTSNodeMap.get(node as TSESTree.Node);
      if (!mapped) {
        return false;
      }
      const declarations: readonly ts.Declaration[] | undefined = services.program
        .getTypeChecker()
        .getSymbolAtLocation(mapped)?.declarations;
      return (
        declarations !== undefined &&
        declarations.length > 0 &&
        declarations.every(declaration =>
          services.program.isSourceFileDefaultLibrary(declaration.getSourceFile()),
        )
      );
    }

    return {
      CallExpression(node: estree.CallExpression) {
        if (!isThenable(node, services)) {
          return;
        }
        // we want to raise on the parent statement
        const statement = asyncStatementInsideConstructor(node);
        if (
          statement &&
          !flaggedStatements.has(statement) &&
          !isResolvedPromiseSentinel(node, statement)
        ) {
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
