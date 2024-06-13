import { TSESTree } from '@typescript-eslint/utils';
import { handleExpression } from '../expressions';
import type { StatementHandler } from '../statement-handler';
import { createNull } from '../values/constant';

export const handleReturnStatement: StatementHandler<TSESTree.ReturnStatement> = (
  node,
  functionInfo,
) => {
  if (node.argument === null) {
    functionInfo.createReturnInstruction(createNull(), node.loc);
  } else {
    const value = handleExpression(node.argument, functionInfo);
    functionInfo.createReturnInstruction(value, node.loc);
  }
};
