import { type ExpressionHandler } from '../expression-handler';
import { TSESTree } from '@typescript-eslint/utils';
import type { BaseValue } from '../value';
import { compileAsDeclaration, handleExpression } from './index';
import { createNull } from '../values/constant';

export const handleVariableDeclarator: ExpressionHandler<TSESTree.VariableDeclarator> = (
  node,
  functionInfo,
) => {
  let initValue: BaseValue<any>;

  if (node.init) {
    initValue = handleExpression(node.init, functionInfo);
  } else {
    initValue = createNull();
  }

  const idInstructions = compileAsDeclaration(node.id, functionInfo, initValue);

  functionInfo.addInstructions(idInstructions);

  return initValue;
};
