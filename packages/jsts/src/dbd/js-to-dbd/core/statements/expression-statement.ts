import { ContextManager } from '../context-manager';
import { TSESTree } from '@typescript-eslint/utils';
import { handleExpression } from '../expressions';

export function handleExpressionStatement(
  context: ContextManager,
  node: TSESTree.ExpressionStatement,
) {
  const { instructions } = handleExpression(context, node.expression);
  context.block.getCurrentBlock().instructions.push(...instructions);
}
