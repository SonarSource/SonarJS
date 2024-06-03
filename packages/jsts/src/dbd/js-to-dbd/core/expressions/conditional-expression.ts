import type { ExpressionHandler } from '../expression-handler';
import { TSESTree } from '@typescript-eslint/utils';
import { handleExpression } from './index';
import { createConditionalBranchingInstruction } from '../instructions/conditional-branching-instruction';
import { createBranchingInstruction } from '../instructions/branching-instruction';
import { createPhiInstruction } from '../instructions/phi-instruction';
import { createReference } from '../values/reference';

export const handleConditionalExpression: ExpressionHandler<TSESTree.ConditionalExpression> = (
  node,
  record,
  context,
) => {
  const { test, consequent, alternate } = node;
  const { blockManager, createScopedBlock } = context;

  const testValue = handleExpression(test, record, context);
  const currentBlock = blockManager.getCurrentBlock();

  const consequentBlock = createScopedBlock(consequent.loc);
  blockManager.pushBlock(consequentBlock);
  const consequentValue = handleExpression(consequent, record, context);
  const afterConsequentInstructionsBlock = blockManager.getCurrentBlock();

  const alternateBlock = createScopedBlock(alternate.loc);
  blockManager.pushBlock(alternateBlock);
  const alternateValue = handleExpression(alternate, record, context);
  const afterAlternateInstructionsBlock = blockManager.getCurrentBlock();

  currentBlock.instructions.push(
    createConditionalBranchingInstruction(testValue, consequentBlock, alternateBlock, test.loc),
  );

  const finallyBlock = createScopedBlock(node.loc);

  afterConsequentInstructionsBlock.instructions.push(
    createBranchingInstruction(finallyBlock, consequent.loc),
  );
  afterAlternateInstructionsBlock.instructions.push(
    createBranchingInstruction(finallyBlock, alternate.loc),
  );
  const resultValue = createReference(context.scopeManager.createValueIdentifier());
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
  blockManager.pushBlock(finallyBlock);
  return resultValue;
};
