import type { ExpressionHandler } from '../expression-handler';
import { TSESTree } from '@typescript-eslint/utils';
import { handleExpression } from './index';
import { createReference } from '../values/reference';
import { createCallInstruction } from '../instructions/call-instruction';
import { createUnaryOperationFunctionDefinition } from '../function-definition';

export const handleUnaryExpression: ExpressionHandler<TSESTree.UnaryExpression> = (
  node,
  record,
  context,
) => {
  const { argument } = node;

  const argumentValue = handleExpression(argument, record, context);

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

  return value;
};
