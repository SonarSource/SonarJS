import { TSESTree } from '@typescript-eslint/utils';
import { compileAsAssignment, handleExpression } from './index';
import { type ExpressionHandler } from '../expression-handler';

export const handleAssignmentExpression: ExpressionHandler<TSESTree.AssignmentExpression> = (
  node,
  context,
) => {
  const { left, right } = node;

  // rhs
  const rightValue = handleExpression(right, context);

  // lhs
  const leftInstructions = compileAsAssignment(left, context, rightValue);
  context.blockManager.getCurrentBlock().instructions.push(...leftInstructions);

  return rightValue;
};
