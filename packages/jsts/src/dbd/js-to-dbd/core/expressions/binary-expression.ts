import { createReference } from '../values/reference';
import { createCallInstruction } from '../instructions/call-instruction';
import { createBinaryOperationFunctionDefinition } from '../function-definition';
import { TSESTree } from '@typescript-eslint/utils';
import { handleExpression } from './index';
import type { ExpressionHandler } from '../expression-handler';

export const handleBinaryExpression: ExpressionHandler<TSESTree.BinaryExpression> = (
  node,
  record,
  context,
) => {
  const { left, right, operator } = node;

  // rhs
  const { value: rightValue } = handleExpression(right, record, context);

  // lhs
  const { value: leftValue } = handleExpression(left, record, context);

  const value = createReference(context.scopeManager.createValueIdentifier());

  context.blockManager
    .getCurrentBlock()
    .instructions.push(
      createCallInstruction(
        value.identifier,
        null,
        createBinaryOperationFunctionDefinition(operator),
        [leftValue, rightValue],
        node.loc,
      ),
    );

  return {
    record,
    value,
  };
};
