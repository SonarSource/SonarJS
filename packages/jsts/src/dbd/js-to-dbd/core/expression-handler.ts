import { TSESTree } from '@typescript-eslint/utils';
import type { Context } from './context';
import type { BaseValue } from './value';
import type { Record } from './ecma/reference-record';

export type ExpressionHandler<
  Expression extends Exclude<TSESTree.Node, TSESTree.Statement> = Exclude<
    TSESTree.Node,
    TSESTree.Statement
  >,
> = (node: Expression, record: Record, context: Context) => BaseValue<any>;
