import { TSESTree } from '@typescript-eslint/utils';
import type { Context } from './context';
import type { BaseValue } from './value';

export type ExpressionHandler<
  Expression extends Exclude<TSESTree.Node, TSESTree.Statement> = Exclude<
    TSESTree.Node,
    TSESTree.Statement
  >,
> = (node: Expression, context: Context) => BaseValue<any>;
