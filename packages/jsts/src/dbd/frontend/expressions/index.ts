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
import { TSESTree } from '@typescript-eslint/utils';
import { handleObjectExpression } from './object-expression';
import { ScopeTranslator } from '../scope-translator';
import { handleExpressionLiteral } from './literal';
import { handleCallExpression } from './call-expression';
import { handleMemberExpression } from './member-expression';
import { handleBinaryExpression } from './binary-expression';
import { handleUnaryExpression } from './unary-expression';
import { handleAssignmentExpression } from './assignment-expression';
import { handleArrayExpression } from './array-expression';
import { handleIdentifier } from './identifier';

export function handleExpression(
  scopeTranslator: ScopeTranslator,
  expression: TSESTree.Expression | null,
  variableName: string | undefined = undefined,
): number {
  if (!expression) {
    throw new Error('Null Expression provided');
  }
  switch (expression.type) {
    case TSESTree.AST_NODE_TYPES.Literal:
      return handleExpressionLiteral(scopeTranslator, expression, variableName);
    case TSESTree.AST_NODE_TYPES.ObjectExpression:
      return handleObjectExpression(scopeTranslator, expression, variableName);
    case TSESTree.AST_NODE_TYPES.Identifier:
      return handleIdentifier(scopeTranslator, expression);
    case TSESTree.AST_NODE_TYPES.CallExpression:
      return handleCallExpression(scopeTranslator, expression);
    case TSESTree.AST_NODE_TYPES.MemberExpression:
      return handleMemberExpression(scopeTranslator, expression);
    case TSESTree.AST_NODE_TYPES.BinaryExpression:
      return handleBinaryExpression(scopeTranslator, expression);
    case TSESTree.AST_NODE_TYPES.UnaryExpression:
      return handleUnaryExpression(scopeTranslator, expression);
    case TSESTree.AST_NODE_TYPES.AssignmentExpression:
      return handleAssignmentExpression(scopeTranslator, expression);
    case TSESTree.AST_NODE_TYPES.ArrayExpression:
      return handleArrayExpression(scopeTranslator, expression, variableName);
    default:
      throw new Error(`Unhandled Expression type ${expression.type}`);
  }
}
