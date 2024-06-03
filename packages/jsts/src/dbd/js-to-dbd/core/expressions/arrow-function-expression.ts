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
import { createNewObjectFunctionDefinition } from '../function-definition';
import { createFunctionReference } from '../values/function-reference';
import { createCallInstruction } from '../instructions/call-instruction';

export const handleArrowFunctionExpression: ExpressionHandler<TSESTree.ArrowFunctionExpression> = (
  node,
  _record,
  context,
) => {
  const { functionInfo: currentFunctionInfo, processFunction, scopeManager } = context;
  const { createValueIdentifier } = scopeManager;

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

  const functionReferenceIdentifier = createValueIdentifier();
  // todo: we may need a common helper
  const functionName = `${currentFunctionInfo.definition.name}__${functionReferenceIdentifier}`;

  const functionInfo = processFunction(functionName, body, node.params, node.loc);

  const functionReference = createFunctionReference(functionReferenceIdentifier, functionInfo);

  currentFunctionInfo.functionReferences.push(functionReference);

  context.blockManager
    .getCurrentBlock()
    .instructions.push(
      createCallInstruction(
        functionReference.identifier,
        null,
        createNewObjectFunctionDefinition(),
        [],
        node.loc,
      ),
    );

  // todo: add other functions symbols, through a common method shared with FunctionDeclaration handler

  return functionReference;
};
