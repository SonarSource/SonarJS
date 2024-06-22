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

import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import {
  isModuleDeclaration,
  isVariableDeclaration,
  isObjectExpression,
  isExpressionStatement,
  isAssignmentExpression,
  isMemberExpression,
  isIdentifier,
} from '../utils/nodes';
import { areEquivalent } from '../utils/equivalence';
import docsUrl from '../utils/docs-url';

const rule: TSESLint.RuleModule<string, string[]> = {
  defaultOptions: [],
  meta: {
    messages: {
      declarePropertiesInsideObject:
        'Declare one or more properties of this object inside of the object literal syntax instead of using separate statements.',
    },
    schema: [],
    type: 'suggestion',
    docs: {
      description: 'Object literal syntax should be used',
      recommended: 'recommended',
      url: docsUrl(__filename),
    },
  },
  create(context) {
    return {
      BlockStatement: (node: TSESTree.Node) =>
        checkObjectInitialization((node as TSESTree.BlockStatement).body, context),
      Program: (node: TSESTree.Node) => {
        const statements = (node as TSESTree.Program).body.filter(
          (statement): statement is TSESTree.Statement => !isModuleDeclaration(statement),
        );
        checkObjectInitialization(statements, context);
      },
    };
  },
};

function checkObjectInitialization(
  statements: TSESTree.Statement[],
  context: TSESLint.RuleContext<string, string[]>,
) {
  let index = 0;
  while (index < statements.length - 1) {
    const objectDeclaration = getObjectDeclaration(statements[index]);
    // eslint-disable-next-line sonarjs/no-collapsible-if
    if (objectDeclaration && isIdentifier(objectDeclaration.id)) {
      const nextStmt = statements[index + 1];
      if (isPropertyAssignment(nextStmt, objectDeclaration.id, context.sourceCode)) {
        context.report({ messageId: 'declarePropertiesInsideObject', node: objectDeclaration });
      }
    }
    index++;
  }
}

function getObjectDeclaration(statement: TSESTree.Statement) {
  if (isVariableDeclaration(statement)) {
    return statement.declarations.find(
      declaration => !!declaration.init && isEmptyObjectExpression(declaration.init),
    );
  }
  return undefined;
}

function isEmptyObjectExpression(expression: TSESTree.Expression) {
  return isObjectExpression(expression) && expression.properties.length === 0;
}

function isPropertyAssignment(
  statement: TSESTree.Statement,
  objectIdentifier: TSESTree.Identifier,
  sourceCode: TSESLint.SourceCode,
) {
  if (isExpressionStatement(statement) && isAssignmentExpression(statement.expression)) {
    const { left, right } = statement.expression;
    if (isMemberExpression(left)) {
      return (
        !left.computed &&
        isSingleLineExpression(right, sourceCode) &&
        areEquivalent(left.object, objectIdentifier, sourceCode) &&
        !isCircularReference(left, right, sourceCode)
      );
    }
  }
  return false;

  function isSingleLineExpression(
    expression: TSESTree.Expression,
    sourceCode: TSESLint.SourceCode,
  ) {
    const first = sourceCode.getFirstToken(expression)!.loc;
    const last = sourceCode.getLastToken(expression)!.loc;
    return first.start.line === last.end.line;
  }

  function isCircularReference(
    left: TSESTree.MemberExpression,
    right: TSESTree.Expression,
    sourceCode: TSESLint.SourceCode,
  ) {
    return areEquivalent(left.object, right, sourceCode);
  }
}

export = rule;
