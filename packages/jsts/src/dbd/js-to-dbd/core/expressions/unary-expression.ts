import type { ExpressionHandler } from '../expression-handler';
import { TSESTree } from '@typescript-eslint/utils';
import { handleExpression } from './index';
import { createReference } from '../values/reference';
import { createCallInstruction } from '../instructions/call-instruction';
import { createUnaryOperationFunctionDefinition } from '../function-definition';

export const handleUnaryExpression: ExpressionHandler<TSESTree.UnaryExpression> = (
  node,
  context,
  scopeReference,
) => {
  const { argument } = node;

  const { value: argumentValue } = handleExpression(argument, context, scopeReference);

  const value = createReference(context.scopeManager.createValueIdentifier());
  context.addInstructions([
    createCallInstruction(
      value.identifier,
      null,
      createUnaryOperationFunctionDefinition(node.operator),
      [argumentValue],
      node.loc,
    ),
  ]);

  return {
    value,
  };
};
