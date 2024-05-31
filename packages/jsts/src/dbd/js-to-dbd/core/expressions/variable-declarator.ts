import type { ExpressionHandler } from '../expression-handler';
import { TSESTree } from '@typescript-eslint/utils';
import type { Value } from '../value';
import { compileAsDeclaration, handleExpression } from './index';
import { createNull } from '../values/reference';

export const handleVariableDeclarator: ExpressionHandler<TSESTree.VariableDeclarator> = (
  node,
  context,
  scopeReference,
) => {
  let initValue: Value;

  if (node.init) {
    const { value } = handleExpression(node.init, context, scopeReference);

    initValue = value;
  } else {
    initValue = createNull();
  }

  const idInstructions = compileAsDeclaration(node.id, initValue, context, scopeReference);

  context.addInstructions(idInstructions);

  return {
    value: initValue,
  };
};
