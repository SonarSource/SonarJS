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
  compileAsAssignment(left, functionInfo, rightValue);

  return rightValue;
};
