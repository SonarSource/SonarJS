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
// https://sonarsource.github.io/rspec/#/rspec/S2428

import type { TSESTree } from '@typescript-eslint/utils';
import { Rule, SourceCode } from 'eslint';
import {
  areEquivalent,
  generateMeta,
  getProgramStatements,
  isIdentifier,
} from '../helpers/index.js';
import estree from 'estree';
import { meta } from './meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      declarePropertiesInsideObject:
        'Declare one or more properties of this object inside of the object literal syntax instead of using separate statements.',
    },
  }),
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
  if (statement.type === 'VariableDeclaration') {
    return statement.declarations.find(
      declaration => !!declaration.init && isEmptyObjectExpression(declaration.init),
    );
  }
  return undefined;
}

function isEmptyObjectExpression(expression: estree.Expression) {
  return expression.type === 'ObjectExpression' && expression.properties.length === 0;
}

function isPropertyAssignment(
  statement: estree.Statement,
  objectIdentifier: estree.Identifier,
  sourceCode: SourceCode,
) {
  if (
    statement.type === 'ExpressionStatement' &&
    statement.expression.type === 'AssignmentExpression'
  ) {
    const { left, right } = statement.expression;
    if (left.type === 'MemberExpression') {
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
