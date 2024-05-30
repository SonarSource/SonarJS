import type { ExpressionHandler } from '../expression-handler';
import { TSESTree } from '@typescript-eslint/utils';
import type { Instruction } from '../instruction';
import { handleExpression } from './index';
import { createReference } from '../values/reference';
import { createCallInstruction } from '../instructions/call-instruction';
import { createUnaryOperationFunctionDefinition } from '../function-definition';

export const handleUnaryExpression: ExpressionHandler<TSESTree.UnaryExpression> = (
  node,
  context,
  scopeReference,
) => {
  const instructions: Array<Instruction> = [];
  const { argument } = node;

  const { instructions: argumentInstructions, value: argumentValue } = handleExpression(
    argument,
    context,
    scopeReference,
  );
  instructions.push(...argumentInstructions);

  const value = createReference(context.scopeManager.createValueIdentifier());
  instructions.push(
    createCallInstruction(
      value.identifier,
      null,
      createUnaryOperationFunctionDefinition(node.operator),
      [argumentValue],
      node.loc,
    ),
  );

  return {
    instructions,
    value,
  };
};
