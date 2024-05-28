import { TSESTree } from '@typescript-eslint/utils';
import type { Instruction } from './instruction';
import type { Value } from './value';
import type { Context } from './context-manager';

type ExpressionHandlerResult = {
  readonly instructions: Array<Instruction>;
  readonly value: Value;
};

export type ExpressionHandler<
  Expression extends Exclude<TSESTree.Node, TSESTree.Statement> = Exclude<
    TSESTree.Node,
    TSESTree.Statement
  >,
> = (node: Expression, context: Context, scope?: Value) => ExpressionHandlerResult;
