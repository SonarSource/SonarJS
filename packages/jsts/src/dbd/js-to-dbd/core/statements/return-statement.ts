import { TSESTree } from '@typescript-eslint/utils';
import { createReturnInstruction } from '../instructions/return-instruction';
import { createNull } from '../values/null';
import { handleExpression } from '../expressions';
import type { StatementHandler } from '../statement-handler';

export const handleReturnStatement: StatementHandler<TSESTree.ReturnStatement> = (
  node,
  context,
) => {
  const { blockManager } = context;
  const { getCurrentBlock } = blockManager;

  if (node.argument === null) {
    getCurrentBlock().instructions.push(createReturnInstruction(createNull(), node.loc));
  } else {
    const value = handleExpression(node.argument, context);
    getCurrentBlock().instructions.push(...value.instructions);
    getCurrentBlock().instructions.push(createReturnInstruction(value.value, node.loc));
  }
};
