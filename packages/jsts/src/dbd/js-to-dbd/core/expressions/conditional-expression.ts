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
import { TSESTree } from '@typescript-eslint/utils';
import { handleExpression } from './index';
import { createConditionalBranchingInstruction } from '../instructions/conditional-branching-instruction';
import { createBranchingInstruction } from '../instructions/branching-instruction';
import { createPhiInstruction } from '../instructions/phi-instruction';
import { createReference } from '../values/reference';

export const handleConditionalExpression: ExpressionHandler<TSESTree.ConditionalExpression> = (
  node,
  functionInfo,
) => {
  const { test, consequent, alternate } = node;
  const { createBlock, pushBlock, getCurrentBlock } = functionInfo;

  const testValue = handleExpression(test, functionInfo);
  const currentBlock = functionInfo.getCurrentBlock();

  const consequentBlock = createBlock(consequent.loc);
  pushBlock(consequentBlock);
  const consequentValue = handleExpression(consequent, functionInfo);
  const afterConsequentInstructionsBlock = getCurrentBlock();

  const alternateBlock = createBlock(alternate.loc);
  pushBlock(alternateBlock);
  const alternateValue = handleExpression(alternate, functionInfo);
  const afterAlternateInstructionsBlock = getCurrentBlock();

  currentBlock.instructions.push(
    createConditionalBranchingInstruction(testValue, consequentBlock, alternateBlock, test.loc),
  );

  const finallyBlock = createBlock(node.loc);

  afterConsequentInstructionsBlock.instructions.push(
    createBranchingInstruction(finallyBlock, consequent.loc),
  );
  afterAlternateInstructionsBlock.instructions.push(
    createBranchingInstruction(finallyBlock, alternate.loc),
  );
  const resultValue = createReference(functionInfo.scopeManager.createValueIdentifier());
  finallyBlock.instructions.push(
    createPhiInstruction(
      resultValue,
      null,
      new Map([
        [afterConsequentInstructionsBlock, consequentValue],
        [afterAlternateInstructionsBlock, alternateValue],
      ]),
      node.loc,
    ),
  );
  pushBlock(finallyBlock);
  return resultValue;
};
