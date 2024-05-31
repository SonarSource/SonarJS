import { TSESTree } from '@typescript-eslint/typescript-estree';
import type { StatementHandler } from '../statement-handler';
import { handleExpression } from '../expressions';

export const handleVariableDeclaration: StatementHandler<TSESTree.VariableDeclaration> = (
  node,
  context,
) => {
  const { scopeManager } = context;

  const environmentRecord = scopeManager.getCurrentEnvironmentRecord();

  for (const declaration of node.declarations) {
    handleExpression(
      declaration,
      environmentRecord,
      context,
    );
  }
};
