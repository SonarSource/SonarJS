import { TSESTree } from '@typescript-eslint/typescript-estree';
import type { StatementHandler } from '../statement-handler';
import { handleExpression } from '../expressions';

export const handleVariableDeclaration: StatementHandler<TSESTree.VariableDeclaration> = (
  node,
  context,
) => {
  for (const declaration of node.declarations) {
    handleExpression(declaration, context);
  }
};
