import { TSESTree } from '@typescript-eslint/utils';
import { compileAsAssignment, handleExpression } from './index';
import { type ExpressionHandler } from '../expression-handler';

export const handleAssignmentExpression: ExpressionHandler<TSESTree.AssignmentExpression> = (
  node,
  functionInfo,
) => {
  const { left, right } = node;

  // rhs
  const rightValue = handleExpression(right, functionInfo);

  // lhs
  const leftInstructions = compileAsAssignment(left, functionInfo, rightValue);
  functionInfo.getCurrentBlock().instructions.push(...leftInstructions);

  return rightValue;
};
