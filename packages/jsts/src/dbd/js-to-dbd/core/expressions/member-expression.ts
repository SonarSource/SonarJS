import { TSESTree } from '@typescript-eslint/utils';
import { handleExpression } from './index';
import type { ExpressionHandler } from '../expression-handler';

export const handleMemberExpression: ExpressionHandler<TSESTree.MemberExpression> = (
  node,
  record,
  context,
) => {
  const { object, property } = node;
  const { record: objectRecord } = handleExpression(object, record, context);

  const { value: propertyValue } = handleExpression(property, objectRecord, context);

  return {
    record: objectRecord,
    value: propertyValue,
  };
};
