import { TSESTree } from '@typescript-eslint/utils';
import { ContextManager } from './context-manager';
import type { Instruction } from './instruction';
import type { Value } from './value';

type ExpressionHandlerResult = {
  instructions: Array<Instruction>;
  value: Value;
};

export type ExpressionHandler<Expression extends TSESTree.Expression = TSESTree.Expression> = (
  context: ContextManager,
  node: Expression,
) => ExpressionHandlerResult;
