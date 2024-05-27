import type { Instruction } from '../instruction';
import { createReference } from '../values/reference';
import { createCallInstruction } from '../instructions/call-instruction';
import { createBinaryOperationFunctionDefinition } from '../function-definition';
import { TSESTree } from '@typescript-eslint/utils';
import { handleExpression } from './index';
import type { ExpressionHandler } from '../expression-handler';

export const handleBinaryExpression: ExpressionHandler<TSESTree.BinaryExpression> = (
  context,
  node,
  scope,
) => {
  const instructions: Array<Instruction> = [];

  const { left, right, operator } = node;

  // rhs
  const { instructions: rightInstructions, value: rightValue } = handleExpression(
    context,
    right,
    scope,
  );

  // lhs
  const { instructions: leftInstructions, value: leftValue } = handleExpression(
    context,
    left,
    scope,
  );

  instructions.push(...rightInstructions);
  instructions.push(...leftInstructions);

  const value = createReference(context.scope.createValueIdentifier());

  instructions.push(
    createCallInstruction(
      value.identifier,
      null,
      createBinaryOperationFunctionDefinition(operator),
      [leftValue, rightValue],
      node.loc,
    ),
  );

  return {
    instructions,
    value,
  };
};
