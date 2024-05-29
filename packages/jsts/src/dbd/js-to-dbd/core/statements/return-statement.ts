import { TSESTree } from '@typescript-eslint/utils';
import { createReturnInstruction } from '../instructions/return-instruction';
import { handleExpression } from '../expressions';
import type { StatementHandler } from '../statement-handler';
import { createNull, createReference } from '../values/reference';

export const handleReturnStatement: StatementHandler<TSESTree.ReturnStatement> = (
  node,
  context,
) => {
  const { blockManager, scopeManager } = context;
  const { getCurrentBlock } = blockManager;

  if (node.argument === null) {
    getCurrentBlock().instructions.push(createReturnInstruction(createNull(), node.loc));
  } else {
    const value = handleExpression(
      node.argument,
      context,
      createReference(scopeManager.getCurrentScopeIdentifier()),
    );
    getCurrentBlock().instructions.push(...value.instructions);
    getCurrentBlock().instructions.push(createReturnInstruction(value.value, node.loc));
  }
};
