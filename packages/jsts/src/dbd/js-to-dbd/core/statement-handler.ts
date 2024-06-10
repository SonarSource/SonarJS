import { TSESTree } from '@typescript-eslint/typescript-estree';
import { FunctionInfo } from './function-info';

export type StatementHandler<Statement extends TSESTree.Statement = TSESTree.Statement> = (
  node: Statement,
  functionInfo: FunctionInfo,
) => void;
