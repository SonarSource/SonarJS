import type { ExpressionHandler } from '../expression-handler';
import { TSESTree } from '@typescript-eslint/utils';
import { handleExpression } from './index';
import { createBranchingInstruction } from '../instructions/branching-instruction';
import { createConditionalBranchingInstruction } from '../instructions/conditional-branching-instruction';
import { createPhiInstruction } from '../instructions/phi-instruction';
import { createReference } from '../values/reference';
import { createCallInstruction } from '../instructions/call-instruction';
import { createBinaryOperationFunctionDefinition } from '../function-definition';
import { createNull } from '../values/constant';

export const handleLogicalExpression: ExpressionHandler<TSESTree.LogicalExpression> = (
  node,
  functionInfo,
) => {
  const { left, right, operator } = node;
  const { createBlock, getCurrentBlock, pushBlock, scopeManager } = functionInfo;

  const leftValue = handleExpression(left, functionInfo);
  const startingBlock = getCurrentBlock();

  const finallyBlock = createBlock(node.loc);

  const consequentBlock = createBlock(node.right.loc);
  pushBlock(consequentBlock);
  const rightValue = handleExpression(right, functionInfo);
  const blockAfterRightExpression = getCurrentBlock();
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

  pushBlock(finallyBlock);
  return returnValue;
};
