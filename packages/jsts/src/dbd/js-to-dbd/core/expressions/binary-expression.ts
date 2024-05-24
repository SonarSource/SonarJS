import type { Instruction } from '../instruction';
import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import { createReference } from '../values/reference';
import { createCallInstruction } from '../instructions/call-instruction';
import { createBinaryOperationFunctionDefinition } from '../function-definition';
import { ContextManager } from '../context-manager';
import { TSESTree } from '@typescript-eslint/utils';
import { handleExpression } from './index';

export function handleBinaryExpression(context: ContextManager, node: TSESTree.BinaryExpression) {
  const instructions: Array<Instruction> = [];

  const { left, right, operator } = node;

  if (left.type === AST_NODE_TYPES.PrivateIdentifier) {
    throw new Error(`Unable to compute binary expression with ${left.type}`);
  }
  const { instructions: rightInstructions, value: rightValue } = handleExpression(context, right);

  const { instructions: leftInstructions, value: leftValue } = handleExpression(context, left);

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
}
