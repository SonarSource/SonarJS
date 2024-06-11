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
import { handleExpression } from './index';
import { createCallInstruction } from '../instructions/call-instruction';
import { Value } from '../value';
import { createReference } from '../values/reference';
import type { ExpressionHandler } from '../expression-handler';
import {
  createNewObjectFunctionDefinition,
  createSetFieldFunctionDefinition,
} from '../function-definition';
import { getParameterField } from '../utils';

export const handleCallExpression: ExpressionHandler<TSESTree.CallExpression> = (
  node,
  functionInfo,
) => {
  const { scopeManager, addInstructions } = functionInfo;
  const { createValueIdentifier } = scopeManager;

  const { callee, arguments: argumentExpressions } = node;

  const argumentValues: Array<Value> = argumentExpressions.map(expression =>
    handleExpression(expression, functionInfo),
  );

  const operands: Array<Value> = [];

  // first argument is the current scope
  operands.push(createReference(scopeManager.getScopeId(scopeManager.getScope(node))));
  const value = createReference(createValueIdentifier());

  // second argument is an array of the passed arguments filled
  const argumentValue = createReference(scopeManager.createValueIdentifier());
  addInstructions([
    createCallInstruction(
      argumentValue.identifier,
      null,
      createNewObjectFunctionDefinition(),
      [],
      node.loc,
    ),
    ...argumentValues.map((argument, position) => {
      const value = createReference(scopeManager.createValueIdentifier());
      return createCallInstruction(
        value.identifier,
        null,
        createSetFieldFunctionDefinition(getParameterField(position)),
        [argumentValue, argument],
        node.loc,
      );
    }),
  ]);
  operands.push(argumentValue);

  const functionDefinition = functionInfo.scopeManager.getFunctionDefinition(callee);
  functionInfo.addFunctionCall(functionDefinition);
  addInstructions([
    createCallInstruction(value.identifier, null, functionDefinition, operands, node.loc),
    // createCallInstruction(
    //   value.identifier,
    //   null,
    //   functionInfo.scopeManager.getFunctionDefinition(callee),
    //   operands,
    //   node.loc,
    // ),
  ]);

  return value;
};
