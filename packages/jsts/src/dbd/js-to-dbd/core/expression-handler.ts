import { TSESTree } from '@typescript-eslint/utils';
import type { BaseValue } from './value';
import { FunctionInfo } from './function-info';

export type ExpressionHandler<
  Expression extends Exclude<TSESTree.Node, TSESTree.Statement> = Exclude<
    TSESTree.Node,
    TSESTree.Statement
  >,
> = (node: Expression, functionInfo: FunctionInfo) => BaseValue<any>;
