import { type ExpressionHandler } from '../expression-handler';
import { TSESTree } from '@typescript-eslint/utils';
import type { BaseValue } from '../value';
import { compileAsDeclaration, handleExpression } from './index';
import { createNull } from '../values/constant';

export const handleVariableDeclarator: ExpressionHandler<TSESTree.VariableDeclarator> = (
  node,
  context,
) => {
  let initValue: BaseValue<any>;

  if (node.init) {
    initValue = handleExpression(node.init, context);
  } else {
    initValue = createNull();
  }

  const idInstructions = compileAsDeclaration(node.id, context, initValue);

  context.addInstructions(idInstructions);

  return initValue;
};
