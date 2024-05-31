import { TSESTree } from '@typescript-eslint/typescript-estree';
import type { StatementHandler } from '../statement-handler';
import { handleExpression } from '../expressions';
import { createReference } from '../values/reference';

export const handleVariableDeclaration: StatementHandler<TSESTree.VariableDeclaration> = (
  node,
  context,
) => {
  const { scopeManager } = context;

  for (const declaration of node.declarations) {
    handleExpression(
      declaration,
      context,
      createReference(scopeManager.getCurrentScopeIdentifier()),
    );
  }
};
