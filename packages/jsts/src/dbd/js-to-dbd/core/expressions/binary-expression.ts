import type { Instruction } from '../instruction';
import { createReference } from '../values/reference';
import { createCallInstruction } from '../instructions/call-instruction';
import { createBinaryOperationFunctionDefinition } from '../function-definition';
import { TSESTree } from '@typescript-eslint/utils';
import { handleExpression } from './index';
import type { ExpressionHandler } from '../expression-handler';

export const handleBinaryExpression: ExpressionHandler<TSESTree.BinaryExpression> = (
  node,
  context,
  scopeReference,
) => {
  const instructions: Array<Instruction> = [];

  const { left, right, operator } = node;

  // rhs
  const { instructions: rightInstructions, value: rightValue } = handleExpression(
    right,
    context,
    scopeReference,
  );

  // lhs
  const { instructions: leftInstructions, value: leftValue } = handleExpression(
    left,
    context,
    scopeReference,
  );

  instructions.push(...rightInstructions);
  instructions.push(...leftInstructions);

  const value = createReference(context.scopeManager.createValueIdentifier());

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
