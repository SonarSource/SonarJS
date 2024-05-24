import { TSESTree } from '@typescript-eslint/utils';
import { ContextManager } from '../context-manager';
import { createReturnInstruction } from '../instructions/return-instruction';
import { createNull } from '../values/null';
import { handleExpression } from '../expressions';

export function handleReturnStatement(context: ContextManager, node: TSESTree.ReturnStatement) {
  if (node.argument === null) {
    context.block
      .getCurrentBlock()
      .instructions.push(createReturnInstruction(createNull(), node.loc));
  } else {
    const value = handleExpression(context, node.argument);
    context.block.getCurrentBlock().instructions.push(...value.instructions);
    context.block
      .getCurrentBlock()
      .instructions.push(createReturnInstruction(value.value, node.loc));
  }
}
