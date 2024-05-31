import { TSESTree } from '@typescript-eslint/utils';
import { compileAsAssignment, handleExpression } from './index';
import type { ExpressionHandler } from '../expression-handler';
import { createNull } from '../values/reference';

export const handleAssignmentExpression: ExpressionHandler<TSESTree.AssignmentExpression> = (
  node,
  context,
  scopeReference,
) => {
  const { left, right } = node;

  // rhs
  const { value: rightValue } = handleExpression(right, context, scopeReference);

  // lhs
  const leftInstructions = compileAsAssignment(left, rightValue, context, scopeReference);
  context.blockManager.getCurrentBlock().instructions.push(...leftInstructions);

  return {
    value: createNull(),
  };
};
