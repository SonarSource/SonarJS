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
