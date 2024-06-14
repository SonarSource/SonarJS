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
import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/utils';
import { handleExpression } from './index';
import { createCallInstruction } from '../instructions/call-instruction';
import { Value } from '../value';
import { createReference } from '../values/reference';
import type { ExpressionHandler } from '../expression-handler';
import {
  createGetFieldFunctionDefinition,
  createNewObjectFunctionDefinition,
  createSetFieldFunctionDefinition,
  FunctionDefinition,
} from '../function-definition';
import { getParameterField } from '../utils';
import { FunctionInfo } from '../function-info';
import type { Location } from '../location';
import { unresolvable } from '../scope-manager';

export const handleCallExpression: ExpressionHandler<TSESTree.CallExpression> = (
  node,
  functionInfo,
) => {
  const { scopeManager, addInstructions } = functionInfo;

  const { callee, arguments: argumentExpressions } = node;

  const argumentValues: Array<Value> = argumentExpressions.map(expression =>
    handleExpression(expression, functionInfo),
  );

  const operands: Array<Value> = [];

  if (callee.type === AST_NODE_TYPES.Identifier) {
    const identifierReference = functionInfo.scopeManager.getIdentifierReference(callee);
    if (identifierReference.base !== unresolvable) {
      const scopeId = functionInfo.scopeManager.getScopeId(identifierReference.variable.scope);
      // first argument is the function declaration scope
      operands.push(createReference(scopeId));
    }
  } else {
    operands.push(createReference(0));
  }

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

  const functionDefinition = scopeManager.getFunctionDefinition(callee);
  functionInfo.addFunctionCall(functionDefinition);
  return executeCall(functionDefinition, functionInfo, operands, node.loc);
};

export function executeCall(
  functionDefinition: FunctionDefinition,
  functionInfo: FunctionInfo,
  operands: Array<Value>,
  loc: Location,
) {
  const { scopeManager, addInstructions } = functionInfo;
  const { createValueIdentifier } = scopeManager;

  const value = createReference(createValueIdentifier());
  const resultValue = createReference(scopeManager.createValueIdentifier());
  addInstructions([
    createCallInstruction(resultValue.identifier, null, functionDefinition, operands, loc),
    createCallInstruction(
      value.identifier,
      null,
      createGetFieldFunctionDefinition('@return'),
      [resultValue],
      loc,
    ),
    // TODO: What to do with this closure scope? keep resultValue in scope manager?
    //  * need to make sure we keep track of references created
    //  * only create the call instruction if value.identifier is going to be used for a call?
    // createCallInstruction(
    //   value.identifier,
    //   null,
    //   createGetFieldFunctionDefinition('@scope'),
    //   [resultValue],
    //   node.loc,
    // ),
  ]);

  return value;
}
