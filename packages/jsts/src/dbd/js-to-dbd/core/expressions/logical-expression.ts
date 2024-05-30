import type { ExpressionHandler } from '../expression-handler';
import { TSESTree } from '@typescript-eslint/utils';
import { Instruction } from '../instruction';
import { createReference } from '../values/reference';

export const handleLogicalExpression: ExpressionHandler<TSESTree.LogicalExpression> = (
  _node,
  context,
  _scopeReference,
) => {
  const instructions: Array<Instruction> = [];

  return {
    instructions,
    value: createReference(context.scopeManager.createValueIdentifier()),
  };
};
