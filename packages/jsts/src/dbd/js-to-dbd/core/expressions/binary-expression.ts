import { createReference } from '../values/reference';
import { createCallInstruction } from '../instructions/call-instruction';
import { createBinaryOperationFunctionDefinition } from '../function-definition';
import { TSESTree } from '@typescript-eslint/utils';
import { handleExpression } from './index';
import type { ExpressionHandler } from '../expression-handler';

export const handleBinaryExpression: ExpressionHandler<TSESTree.BinaryExpression> = (
  node,
  functionInfo,
) => {
  const { left, right, operator } = node;

  // rhs
  const rightValue = handleExpression(right, functionInfo);

  // lhs
  const leftValue = handleExpression(left, functionInfo);

  const value = createReference(functionInfo.scopeManager.createValueIdentifier());

  functionInfo
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

  return value;
};
