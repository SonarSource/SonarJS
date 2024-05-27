import { TSESTree } from '@typescript-eslint/utils';
import type { Instruction } from '../instruction';
import type { Value } from '../value';
import { createNull } from '../values/null';
import { createConstant } from '../values/constant';
import type { ExpressionHandler } from '../expression-handler';

export const handleLiteral: ExpressionHandler<TSESTree.Literal> = (context, node) => {
  const instructions: Array<Instruction> = [];

  let value: Value;

  if (node.value === null) {
    value = createNull();
  } else {
    value = createConstant(context.scope.createValueIdentifier(), node.value);
  }

  return {
    instructions,
    value,
  };
};
