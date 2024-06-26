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
// https://sonarsource.github.io/rspec/#/rspec/S2428

import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/utils';
import { Rule, SourceCode } from 'eslint';
import { areEquivalent, docsUrl, getProgramStatements, isIdentifier } from '../helpers';
import estree from 'estree';

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      declarePropertiesInsideObject:
        'Declare one or more properties of this object inside of the object literal syntax instead of using separate statements.',
    },
    schema: [],
    type: 'suggestion',
    docs: {
      description: 'Object literal syntax should be used',
      recommended: true,
      url: docsUrl(__filename),
    },
  },
  create(context) {
    return {
      BlockStatement: (node: estree.BlockStatement) =>
        checkObjectInitialization(node.body, context),
      Program: (node: estree.Program) => {
        checkObjectInitialization(getProgramStatements(node), context);
      },
    };
  },
};

function checkObjectInitialization(statements: estree.Statement[], context: Rule.RuleContext) {
  let index = 0;
  while (index < statements.length - 1) {
    const objectDeclaration = getObjectDeclaration(statements[index]);
    if (objectDeclaration && isIdentifier(objectDeclaration.id)) {
      const nextStmt = statements[index + 1];
      if (isPropertyAssignment(nextStmt, objectDeclaration.id, context.sourceCode)) {
        context.report({ messageId: 'declarePropertiesInsideObject', node: objectDeclaration });
      }
    }
    index++;
  }
}

function getObjectDeclaration(statement: estree.Statement) {
  if (statement.type === AST_NODE_TYPES.VariableDeclaration) {
    return statement.declarations.find(
      declaration => !!declaration.init && isEmptyObjectExpression(declaration.init),
    );
  }
  return undefined;
}

function isEmptyObjectExpression(expression: estree.Expression) {
  return expression.type === AST_NODE_TYPES.ObjectExpression && expression.properties.length === 0;
}

function isPropertyAssignment(
  statement: estree.Statement,
  objectIdentifier: estree.Identifier,
  sourceCode: SourceCode,
) {
  if (
    statement.type === AST_NODE_TYPES.ExpressionStatement &&
    statement.expression.type === AST_NODE_TYPES.AssignmentExpression
  ) {
    const { left, right } = statement.expression;
    if (left.type === AST_NODE_TYPES.MemberExpression) {
      return (
        !left.computed &&
        isSingleLineExpression(right, sourceCode) &&
        areEquivalent(
          left.object as TSESTree.Node,
          objectIdentifier as TSESTree.Node,
          sourceCode,
        ) &&
        !areEquivalent(left.object as TSESTree.Node, right as TSESTree.Node, sourceCode)
      );
    }
  }
  return false;

  function isSingleLineExpression(expression: estree.Node, sourceCode: SourceCode) {
    const first = sourceCode.getFirstToken(expression)!.loc;
    const last = sourceCode.getLastToken(expression)!.loc;
    return first.start.line === last.end.line;
  }
}
