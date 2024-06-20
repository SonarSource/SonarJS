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
import { handleExpression } from '../expressions';
import type { Block } from '../block';
import { createBranchingInstruction } from '../instructions/branching-instruction';
import { createConditionalBranchingInstruction } from '../instructions/conditional-branching-instruction';
import { isTerminated } from '../utils';
import { handleStatement } from './index';
import type { StatementHandler } from '../statement-handler';
import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';

export const handleIfStatement: StatementHandler<TSESTree.IfStatement> = (node, functionInfo) => {
  const { consequent, alternate, test } = node;
  const { getCurrentBlock, pushBlock, createBlock } = functionInfo;

  // the "finally" block belongs to the same scope as the current block
  const finallyBlock = createBlock(node.loc);

  const processNode = (innerNode: TSESTree.Statement | null): Block => {
    const loc = innerNode?.loc ?? node.loc;
    const block = createBlock(loc);
    if (innerNode === null) {
      innerNode = {
        type: AST_NODE_TYPES.BlockStatement,
        parent: node.parent,
        loc: node.loc,
        range: node.range,
        body: [],
      };
    }

    pushBlock(block);

    handleStatement(innerNode, functionInfo);

    if (!isTerminated(getCurrentBlock())) {
      // branch the CURRENT BLOCK to the finally one
      getCurrentBlock().instructions.push(createBranchingInstruction(finallyBlock, loc));
    }

    return block;
  };

  const testValue = handleExpression(test, functionInfo);

  const currentBlock = getCurrentBlock();

  // process the consequent block
  const consequentBlock = processNode(consequent);

  // process the alternate block
  const alternateBlock = processNode(alternate);

  // add the conditional branching instruction
  currentBlock.instructions.push(
    createConditionalBranchingInstruction(testValue, consequentBlock, alternateBlock, node.loc),
  );

  pushBlock(finallyBlock);
};
