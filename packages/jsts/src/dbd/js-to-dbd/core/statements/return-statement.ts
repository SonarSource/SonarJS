import { TSESTree } from '@typescript-eslint/utils';
import { createReturnInstruction } from '../instructions/return-instruction';
import { handleExpression } from '../expressions';
import type { StatementHandler } from '../statement-handler';
import { createNull, createReference } from '../values/reference';

export const handleReturnStatement: StatementHandler<TSESTree.ReturnStatement> = (
  node,
  context,
) => {
  const { scopeManager, addInstructions } = context;

  if (node.argument === null) {
    addInstructions([createReturnInstruction(createNull(), node.loc)]);
  } else {
    const { value } = handleExpression(
      node.argument,
      context,
      createReference(scopeManager.getCurrentScopeIdentifier()),
    );
    addInstructions([createReturnInstruction(value, node.loc)]);
  }
};
