import { TSESTree } from '@typescript-eslint/utils';
import { compileAsAssignment, handleExpression } from './index';
import type { ExpressionHandler } from '../expression-handler';
import type { Instruction } from '../instruction';
import { createNull } from '../values/null';

export const handleAssignmentExpression: ExpressionHandler<TSESTree.AssignmentExpression> = (
  node,
  context,
  scope,
) => {
  const instructions: Array<Instruction> = [];

  const { left, right } = node;

  // rhs
  const { instructions: rightInstructions, value: rightValue } = handleExpression(right, context);

  instructions.push(...rightInstructions);

  // lhs
  const leftInstructions = compileAsAssignment(left, rightValue, context, scope);

  instructions.push(...leftInstructions);

  return {
    instructions,
    value: createNull(),
  };
};
