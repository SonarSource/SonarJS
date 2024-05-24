import { ContextManager } from '../context-manager';
import { TSESTree } from '@typescript-eslint/utils';
import { CompilationResult } from './index';
import type { Instruction } from '../instruction';
import type { Value } from '../value';
import { createNull } from '../values/null';
import { createConstant } from '../values/constant';

export function handleLiteral(context: ContextManager, node: TSESTree.Literal): CompilationResult {
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
}
