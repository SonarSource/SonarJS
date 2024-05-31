import type { ExpressionHandler } from '../expression-handler';
import { TSESTree } from '@typescript-eslint/utils';
import { handleExpression } from './index';
import { createConditionalBranchingInstruction } from '../instructions/conditional-branching-instruction';
import { createBranchingInstruction } from '../instructions/branching-instruction';
import { createPhiInstruction } from '../instructions/phi-instruction';
import { createReference } from '../values/reference';

export const handleConditionalExpression: ExpressionHandler<TSESTree.ConditionalExpression> = (
  node,
  context,
  scopeReference,
) => {
  const { test, consequent, alternate } = node;
  const { blockManager, createScopedBlock } = context;

  const { value: testValue } = handleExpression(test, context, scopeReference);
  const currentBlock = blockManager.getCurrentBlock();

  const consequentBlock = createScopedBlock(consequent.loc);
  blockManager.pushBlock(consequentBlock);
  const { value: consequentValue } = handleExpression(consequent, context, scopeReference);
  const afterConsequentInstructionsBlock = blockManager.getCurrentBlock();

  const alternateBlock = createScopedBlock(alternate.loc);
  blockManager.pushBlock(alternateBlock);
  const { value: alternateValue } = handleExpression(alternate, context, scopeReference);
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
  return {
    instructions: [],
    value: resultValue,
  };
};
