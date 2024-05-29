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
import type { ExpressionHandler } from '../expression-handler';
import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/typescript-estree';
import { createFunctionInfo } from '../function-info';
import {
  createFunctionDefinition,
  createNewObjectFunctionDefinition,
  generateSignature,
} from '../function-definition';
import { createParameter } from '../values/parameter';
import { createFunctionReference } from '../values/function-reference';
import { createCallInstruction } from '../instructions/call-instruction';
import type { Instruction } from '../instruction';

export const handleArrowFunctionExpression: ExpressionHandler<TSESTree.ArrowFunctionExpression> = (
  node,
  context,
) => {
  const { fileName, scopeManager } = context;
  const { createValueIdentifier, processFunctionInfo, getCurrentFunctionInfo } = scopeManager;
  const instructions: Array<Instruction> = [];

  let body: Array<TSESTree.Statement>;

  if (node.expression) {
    body = [
      {
        type: AST_NODE_TYPES.ExpressionStatement,
        expression: node.body as TSESTree.Expression,
        loc: node.loc,
        range: node.range,
        directive: undefined,
        parent: node,
      },
    ];
  } else {
    body = (node.body as TSESTree.BlockStatement).body;
  }

  const currentFunctionInfo = getCurrentFunctionInfo();

  const functionReferenceIdentifier = createValueIdentifier();
  const functionName = `${currentFunctionInfo.definition.name}__${functionReferenceIdentifier}`;

  const functionInfo = createFunctionInfo(
    fileName,
    createFunctionDefinition(functionName, generateSignature(functionName, fileName)),
    node.params.map(parameter => {
      let parameterName: string;

      if (parameter.type === AST_NODE_TYPES.Identifier) {
        parameterName = parameter.name;
      } else {
        // todo
        parameterName = '';
      }

      return createParameter(createValueIdentifier(), parameterName, parameter.loc);
    }),
  );

  processFunctionInfo(functionInfo, body, node.loc);

  const functionReference = createFunctionReference(functionInfo, functionReferenceIdentifier);

  getCurrentFunctionInfo().functionReferences.push(functionReference);

  instructions.push(
    createCallInstruction(
      functionReference.identifier,
      null,
      createNewObjectFunctionDefinition(),
      [],
      node.loc,
    ),
  );

  // todo: add other functions symbols, through a common method shared with FunctionDeclaration handler

  return {
    instructions,
    value: functionReference,
  };
};
