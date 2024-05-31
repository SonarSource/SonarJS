import { TSESTree } from '@typescript-eslint/utils';
import type { Instruction } from './instruction';
import type { Context } from './context-manager';
import type { Value } from './value';

export type ExpressionHandlerResult = {
  readonly instructions: Array<Instruction>;
  readonly value: Value;
};

export type ExpressionHandler<
  Expression extends Exclude<TSESTree.Node, TSESTree.Statement> = Exclude<
    TSESTree.Node,
    TSESTree.Statement
  >,
> = (node: Expression, context: Context, scopeReference: Value) => ExpressionHandlerResult;