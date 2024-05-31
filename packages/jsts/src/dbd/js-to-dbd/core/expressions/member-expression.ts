import { TSESTree } from '@typescript-eslint/utils';
import { handleExpression } from './index';
import type { ExpressionHandler } from '../expression-handler';

export const handleMemberExpression: ExpressionHandler<TSESTree.MemberExpression> = (
  node,
  context,
  scopeReference,
) => {
  const { object, property } = node;
  const { value: objectValue } = handleExpression(object, context, scopeReference);

  const { value: propertyValue } = handleExpression(property, context, objectValue);

  return {
    value: propertyValue,
  };
};
