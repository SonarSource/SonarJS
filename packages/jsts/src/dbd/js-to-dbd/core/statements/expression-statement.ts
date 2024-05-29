import { TSESTree } from '@typescript-eslint/utils';
import { handleExpression } from '../expressions';
import type { StatementHandler } from '../statement-handler';

export const handleExpressionStatement: StatementHandler<TSESTree.ExpressionStatement> = (
  node,
  context,
) => {
  const { blockManager } = context;
  const { getCurrentBlock } = blockManager;

  const { instructions } = handleExpression(node.expression, context);
  getCurrentBlock().instructions.push(...instructions);
};
