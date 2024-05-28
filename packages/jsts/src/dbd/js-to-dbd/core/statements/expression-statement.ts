import { TSESTree } from '@typescript-eslint/utils';
import { handleExpression } from '../expressions';
import type { StatementHandler } from '../statement-handler';

export const handleExpressionStatement: StatementHandler<TSESTree.ExpressionStatement> = (
  node,
  context,
) => {
  const { scopeManager } = context;

  const { instructions } = handleExpression(node.expression, context);
  scopeManager.getCurrentBlock().instructions.push(...instructions);
};
