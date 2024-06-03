import type { ExpressionHandler } from '../expression-handler';
import { TSESTree } from '@typescript-eslint/utils';
import { handleExpression } from './index';
import { createBranchingInstruction } from '../instructions/branching-instruction';
import { createConditionalBranchingInstruction } from '../instructions/conditional-branching-instruction';
import { createPhiInstruction } from '../instructions/phi-instruction';
import { createNull, createReference } from '../values/reference';
import { createCallInstruction } from '../instructions/call-instruction';
import { createBinaryOperationFunctionDefinition } from '../function-definition';

export const handleLogicalExpression: ExpressionHandler<TSESTree.LogicalExpression> = (
  node,
  context,
  scopeReference,
) => {
  const { left, right, operator } = node;
  const { createScopedBlock, blockManager, scopeManager } = context;

  const { value: leftValue } = handleExpression(left, context, scopeReference);
  const startingBlock = blockManager.getCurrentBlock();

  const finallyBlock = createScopedBlock(node.loc);

  const consequentBlock = createScopedBlock(node.right.loc);
  blockManager.pushBlock(consequentBlock);
  const { value: rightValue } = handleExpression(right, context, scopeReference);
  const blockAfterRightExpression = blockManager.getCurrentBlock();
  blockAfterRightExpression.instructions.push(createBranchingInstruction(finallyBlock, right.loc));

  switch (operator) {
    case '||': {
      startingBlock.instructions.push(
        createConditionalBranchingInstruction(leftValue, finallyBlock, consequentBlock, left.loc),
      );
      break;
    }
    case '&&': {
      startingBlock.instructions.push(
        createConditionalBranchingInstruction(leftValue, consequentBlock, finallyBlock, left.loc),
      );
      break;
    }
    case '??': {
      const isNullLeftValue = createReference(scopeManager.createValueIdentifier());
      startingBlock.instructions.push(
        createCallInstruction(
          isNullLeftValue.identifier,
          null,
          createBinaryOperationFunctionDefinition('=='),
          [leftValue, createNull()],
          left.loc,
        ),
      );
      startingBlock.instructions.push(
        createConditionalBranchingInstruction(
          isNullLeftValue,
          consequentBlock,
          finallyBlock,
          left.loc,
        ),
      );
      break;
    }
  }

  const returnValue = createReference(scopeManager.createValueIdentifier());
  finallyBlock.instructions.push(
    createPhiInstruction(
      returnValue,
      null,
      new Map([
        [startingBlock, leftValue],
        [blockAfterRightExpression, rightValue],
      ]),
      node.loc,
    ),
  );

  blockManager.pushBlock(finallyBlock);
  return {
    instructions: [],
    value: returnValue,
  };
};
