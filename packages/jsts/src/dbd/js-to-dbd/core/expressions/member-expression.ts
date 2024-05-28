import type { Instruction } from '../instruction';
import { TSESTree } from '@typescript-eslint/utils';
import { handleExpression } from './index';
import type { ExpressionHandler } from '../expression-handler';

export const handleMemberExpression: ExpressionHandler<TSESTree.MemberExpression> = (
  node,
  context,
  scope,
) => {
  const instructions: Array<Instruction> = [];

  const { object, property } = node;
  const { instructions: objectInstructions, value: objectValue } = handleExpression(
    object,
    context,
    scope,
  );

  instructions.push(...objectInstructions);

  const { instructions: propertyInstructions, value: propertyValue } = handleExpression(
    property,
    context,
    objectValue,
  );

  instructions.push(...propertyInstructions);

  return {
    instructions,
    value: propertyValue,
  };
};
