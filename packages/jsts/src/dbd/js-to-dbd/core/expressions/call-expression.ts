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
import { handleMemberExpression } from './member-expression';
import { CompilationResult, handleExpression } from './index';
import { ContextManager } from '../context-manager';
import type { Instruction } from '../instruction';
import { createCallInstruction } from '../instructions/call-instruction';
import { Value } from '../value';
import { createReference } from '../values/reference';
import { createFunctionDefinition2 } from '../function-definition';
import { createNull } from '../values/null';

export function handleCallExpression(
  context: ContextManager,
  callExpression: TSESTree.CallExpression,
): CompilationResult {
  const instructions: Instruction[] = [];
  let calleeValue;
  let simpleName;
  let calleObjectSimpleName;
  let isFunctionRef = false;
  switch (callExpression.callee.type) {
    case TSESTree.AST_NODE_TYPES.MemberExpression: {
      const memberExpressionResult = handleMemberExpression(context, callExpression.callee);
      calleeValue = memberExpressionResult.value;
      instructions.push(...memberExpressionResult.instructions);
      if (callExpression.callee.property.type !== TSESTree.AST_NODE_TYPES.Identifier) {
        throw new Error(
          `Unhandled method call ${JSON.stringify(callExpression.callee.property.loc)}`,
        );
      }
      if (callExpression.callee.object.type === TSESTree.AST_NODE_TYPES.Identifier) {
        calleObjectSimpleName = callExpression.callee.object.name;
      }
      simpleName = callExpression.callee.property.name;
      break;
    }
    case TSESTree.AST_NODE_TYPES.Identifier:
      simpleName = callExpression.callee.name;
      if (context.scope.getVariableAndOwner(simpleName)) {
        isFunctionRef = true;
      }
      break;
    default:
      console.error(`Unsupported call expression callee ${callExpression.callee.type}`);

      return {
        instructions: [],
        value: createNull(),
      };
  }

  let args: Value[] = [];
  if (calleeValue) {
    args = [calleeValue];
  }
  callExpression.arguments.forEach(arg => {
    if (arg.type === TSESTree.AST_NODE_TYPES.SpreadElement) {
      return;
    }
    const argExpressionResult = handleExpression(context, arg);
    instructions.push(...argExpressionResult.instructions);
    args.push(argExpressionResult.value);
  });
  const isInstanceMethodCall =
    calleObjectSimpleName !== undefined &&
    context.scope.getVariableAndOwner(calleObjectSimpleName) !== null;

  const resultValueId = context.scope.createValueIdentifier();
  const resultValue = createReference(resultValueId);
  instructions.push(
    createCallInstruction(
      resultValueId,
      null,
      createFunctionDefinition2(simpleName, 'FILENAME', isFunctionRef, isInstanceMethodCall),
      args,
      callExpression.loc,
    ),
  );
  return {
    instructions,
    value: resultValue,
  };
}
