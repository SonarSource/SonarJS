import type { ExpressionHandler } from '../expression-handler';
import { TSESTree } from '@typescript-eslint/utils';
import { handleExpression } from './index';
import { createConstant } from '../values/constant';
import { createBranchingInstruction } from '../instructions/branching-instruction';
import { createConditionalBranchingInstruction } from '../instructions/conditional-branching-instruction';
import { createPhiInstruction } from '../instructions/phi-instruction';
import { createReference } from '../values/reference';

export const handleLogicalExpression: ExpressionHandler<TSESTree.LogicalExpression> = (
  node,
  context,
  scopeReference,
) => {
  const { left, right, operator } = node;
  const { createScopedBlock, blockManager } = context;

  const { value: leftValue } = handleExpression(left, context, scopeReference);
  const startingBlock = blockManager.getCurrentBlock();

  const finallyBlock = createScopedBlock(node.loc);

  const consequentBlock = createScopedBlock(node.right.loc);
  blockManager.pushBlock(consequentBlock);
  const { value: rightValue } = handleExpression(right, context, scopeReference);
  const blockAfterRightExpression = blockManager.getCurrentBlock();

  const handleLogicalOperators = (operator: '||' | '&&') => {
    const falsyBlock = createScopedBlock(node.loc);
    falsyBlock.instructions.push(createBranchingInstruction(finallyBlock, node.loc));
    blockManager.pushBlock(falsyBlock);

    const truthyBlock = context.createScopedBlock(node.loc);
    truthyBlock.instructions.push(createBranchingInstruction(finallyBlock, node.loc));
    blockManager.pushBlock(truthyBlock);

    if (operator === '&&') {
      blockAfterRightExpression.instructions.push(
        createConditionalBranchingInstruction(rightValue, truthyBlock, falsyBlock, right.loc),
      );

      startingBlock.instructions.push(
        createConditionalBranchingInstruction(leftValue, consequentBlock, falsyBlock, left.loc),
      );
    } else {
      blockAfterRightExpression.instructions.push(
        createConditionalBranchingInstruction(rightValue, truthyBlock, falsyBlock, right.loc),
      );

      startingBlock.instructions.push(
        createConditionalBranchingInstruction(leftValue, truthyBlock, consequentBlock, left.loc),
      );
    }

    const returnValue = createReference(context.scopeManager.createValueIdentifier());
    finallyBlock.instructions.push(
      createPhiInstruction(
        returnValue,
        null,
        new Map([
          [truthyBlock, createConstant(context.scopeManager.createValueIdentifier(), true)],
          [falsyBlock, createConstant(context.scopeManager.createValueIdentifier(), false)],
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

  const handleNullCoalesce = () => {
    blockAfterRightExpression.instructions.push(
      createBranchingInstruction(finallyBlock, right.loc),
    );

    startingBlock.instructions.push(
      createConditionalBranchingInstruction(leftValue, finallyBlock, consequentBlock, left.loc),
    );

    const returnValue = createReference(context.scopeManager.createValueIdentifier());
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

  switch (operator) {
    case '||':
    case '&&':
      return handleLogicalOperators(operator);
    case '??': {
      return handleNullCoalesce();
    }
  }
};
