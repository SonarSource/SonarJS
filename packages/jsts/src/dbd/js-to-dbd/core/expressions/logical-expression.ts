import type { ExpressionHandler } from '../expression-handler';
import { TSESTree } from '@typescript-eslint/utils';
import { Instruction } from '../instruction';
import { createReference } from '../values/reference';
import { handleExpression } from './index';
import { createCallInstruction } from '../instructions/call-instruction';
import { createBuiltinLogicalExpressionFunctionDefinition } from '../function-definition';

export const handleLogicalExpression: ExpressionHandler<TSESTree.LogicalExpression> = (
  node,
  context,
  scopeReference,
) => {
  const instructions: Array<Instruction> = [];
  const { left, right, operator } = node;
  const { instructions: leftInstructions, value: leftValue } = handleExpression(
    left,
    context,
    scopeReference,
  );
  const { instructions: rightInstructions, value: rightValue } = handleExpression(
    right,
    context,
    scopeReference,
  );

  instructions.push(...leftInstructions);
  instructions.push(...rightInstructions);

  const result = createReference(context.scopeManager.createValueIdentifier());
  instructions.push(
    createCallInstruction(
      result.identifier,
      null,
      createBuiltinLogicalExpressionFunctionDefinition(operator),
      [leftValue, rightValue],
      node.loc,
    ),
  );

  return {
    instructions,
    value: result,
  };
};
