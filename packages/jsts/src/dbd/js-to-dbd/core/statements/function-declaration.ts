import type { StatementHandler } from '../statement-handler';
import { TSESTree } from '@typescript-eslint/typescript-estree';
import { handleFunctionLike } from '../function-info';

export const handleFunctionDeclaration: StatementHandler<TSESTree.FunctionDeclarationWithName> = (
  node,
  functionInfo,
) => {
  handleFunctionLike(node, functionInfo);
};
