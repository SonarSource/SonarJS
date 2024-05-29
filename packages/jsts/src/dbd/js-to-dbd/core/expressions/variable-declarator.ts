import type { ExpressionHandler } from '../expression-handler';
import { TSESTree } from '@typescript-eslint/utils';
import type { Instruction } from '../instruction';
import type { Value } from '../value';
import { compileAsDeclaration, handleExpression } from './index';
import { createNull } from '../values/null';

export const handleVariableDeclarator: ExpressionHandler<TSESTree.VariableDeclarator> = (
  node,
  context,
  scope,
) => {
  const instructions: Array<Instruction> = [];

  let initValue: Value;

  if (node.init) {
    const { instructions: initInstructions, value } = handleExpression(node.init, context);

    instructions.push(...initInstructions);

    initValue = value;
  } else {
    initValue = createNull();
  }

  console.log('WILL PROCESS VARIBALE DECL', node.id, initValue);

  const idInstructions = compileAsDeclaration(node.id, initValue, context, scope);

  instructions.push(...idInstructions);

  return {
    instructions,
    value: initValue,
  };
};
