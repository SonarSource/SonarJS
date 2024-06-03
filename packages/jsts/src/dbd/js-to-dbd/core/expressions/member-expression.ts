import { TSESTree } from '@typescript-eslint/utils';
import { handleExpression } from './index';
import type { ExpressionHandler } from '../expression-handler';

export const handleMemberExpression: ExpressionHandler<TSESTree.MemberExpression> = (
  node,
  record,
  context,
) => {
  const { object, property } = node;
  const objectValue = handleExpression(object, record, context);

  const propertyValue = handleExpression(property, objectValue, context);

  return propertyValue;
};
