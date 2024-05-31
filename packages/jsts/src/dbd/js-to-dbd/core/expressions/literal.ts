import { TSESTree } from '@typescript-eslint/utils';
import type { Value } from '../value';
import { createConstant } from '../values/constant';
import type { ExpressionHandler } from '../expression-handler';
import { createNull } from '../values/reference';

export const handleLiteral: ExpressionHandler<TSESTree.Literal> = (node, context) => {
  const { createValueIdentifier } = context.scopeManager;

  let value: Value;

  if (node.value === null) {
    value = createNull();
  } else {
    value = createConstant(createValueIdentifier(), node.value);
  }

  return {
    value,
  };
};
