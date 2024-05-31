import { type ExpressionHandler } from '../expression-handler';
import { TSESTree } from '@typescript-eslint/utils';
import type { BaseValue } from '../value';
import { compileAsDeclaration, handleExpression } from './index';
import { createNull } from '../values/constant';

export const handleVariableDeclarator: ExpressionHandler<TSESTree.VariableDeclarator> = (
  node,
  record,
  context,
) => {
  let initValue: BaseValue<any>;

  if (node.init) {
    const initResult = handleExpression(node.init, record, context);

    initValue = initResult.value;
  } else {
    initValue = createNull();
  }

  const idInstructions = compileAsDeclaration(node.id, record, context, initValue);

  context.addInstructions(idInstructions);

  return {
    value: initValue,
    record,
  };
};
