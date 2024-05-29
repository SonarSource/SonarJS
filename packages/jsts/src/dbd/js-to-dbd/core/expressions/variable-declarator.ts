import type { ExpressionHandler } from '../expression-handler';
import { TSESTree } from '@typescript-eslint/utils';
import type { Instruction } from '../instruction';
import type { Value } from '../value';
import { compileAsDeclaration, handleExpression } from './index';
import { createNull } from '../values/reference';

export const handleVariableDeclarator: ExpressionHandler<TSESTree.VariableDeclarator> = (
  node,
  context,
  scopeReference,
) => {
  const instructions: Array<Instruction> = [];

  let initValue: Value;

  if (node.init) {
    const { instructions: initInstructions, value } = handleExpression(
      node.init,
      context,
      scopeReference,
    );

    instructions.push(...initInstructions);

    initValue = value;
  } else {
    initValue = createNull();
  }

  const idInstructions = compileAsDeclaration(node.id, initValue, context, scopeReference);

  instructions.push(...idInstructions);

  return {
    instructions,
    value: initValue,
  };
};
