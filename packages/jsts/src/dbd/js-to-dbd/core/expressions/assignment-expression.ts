import { TSESTree } from '@typescript-eslint/utils';
import { compileAsAssignment, handleExpression } from './index';
import { type ExpressionHandler } from '../expression-handler';

export const handleAssignmentExpression: ExpressionHandler<TSESTree.AssignmentExpression> = (
  node,
  record,
  context,
) => {
  const { left, right } = node;

  // rhs
  const rightValue = handleExpression(right, record, context);

  // lhs
  const leftInstructions = compileAsAssignment(left, record, context, rightValue);
  context.blockManager.getCurrentBlock().instructions.push(...leftInstructions);

  return rightValue;
};
