import { TSESTree } from '@typescript-eslint/utils';
import { createReturnInstruction } from '../instructions/return-instruction';
import { handleExpression } from '../expressions';
import type { StatementHandler } from '../statement-handler';
import { createNull } from '../values/constant';

export const handleReturnStatement: StatementHandler<TSESTree.ReturnStatement> = (
  node,
  functionInfo,
) => {
  const { addInstructions } = functionInfo;

  if (node.argument === null) {
    addInstructions([createReturnInstruction(createNull(), node.loc)]);
  } else {
    const value = handleExpression(node.argument, functionInfo);
    addInstructions([createReturnInstruction(value, node.loc)]);
  }
};
