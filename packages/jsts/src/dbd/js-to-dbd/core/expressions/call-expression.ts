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
import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import { getParameter } from '../utils';
import { isAFunctionReference } from '../values/function-reference';
import { getIdentifierReference, isAnEnvironmentRecord } from '../ecma/environment-record';
import { getValue } from '../ecma/reference-record';
import {
  createNewObjectFunctionDefinition,
  createSetFieldFunctionDefinition,
} from '../function-definition';
import { createNull } from '../values/constant';

export const handleCallExpression: ExpressionHandler<TSESTree.CallExpression> = (
  node,
  record,
  context,
) => {
  const { functionInfo, scopeManager, addInstructions } = context;
  const { createValueIdentifier } = scopeManager;

  let value: Value;

  const { callee, arguments: argumentExpressions } = node;

  const argumentValues: Array<Value> = [];

  for (const argumentExpression of argumentExpressions) {
    if (argumentExpression.type === AST_NODE_TYPES.Identifier) {
      const parameter = getParameter(context, functionInfo, argumentExpression.name);

      if (parameter) {
        argumentValues.push(parameter);
      } else {
        // if not it may be a variable of the scope
        if (isAnEnvironmentRecord(record)) {
          const identifierReference = getIdentifierReference(record, argumentExpression.name);

          const value = getValue(identifierReference);

          if (value) {
            argumentValues.push(value);
          }
        }

        // todo
      }
    } else {
      const argumentValue = handleExpression(argumentExpression, record, context);

      argumentValues.push(argumentValue);
    }
  }
  for (let i = 0; i < 10; i++) {
    argumentValues.push(createNull());
  }

  const calleeValue = handleExpression(callee, record, context);

  if (isAFunctionReference(calleeValue)) {
    const { functionInfo } = calleeValue;
    const operands: Array<Value> = [];

    // first argument is the current scope
    operands.push(createReference(scopeManager.getCurrentEnvironmentRecord().identifier));
    value = createReference(createValueIdentifier());

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
          createSetFieldFunctionDefinition(String(position)),
          [argumentValue, argument],
          node.loc,
        );
      }),
    ]);
    operands.push(argumentValue);

    addInstructions([
      createCallInstruction(value.identifier, null, functionInfo.definition, operands, node.loc),
    ]);
  }

  return calleeValue;
};
