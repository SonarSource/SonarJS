import { TSESTree } from '@typescript-eslint/utils';
import { handleExpression } from '../expressions';
import type { StatementHandler } from '../statement-handler';
import { createReference } from '../values/reference';

export const handleExpressionStatement: StatementHandler<TSESTree.ExpressionStatement> = (
  node,
  context,
) => {
  const { blockManager, scopeManager } = context;
  const { getCurrentBlock } = blockManager;

  const { instructions } = handleExpression(
    node.expression,
    context,
    createReference(scopeManager.getCurrentScopeIdentifier()),
  );
  getCurrentBlock().instructions.push(...instructions);
};
