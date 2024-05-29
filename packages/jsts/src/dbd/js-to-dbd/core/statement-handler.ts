import { TSESTree } from '@typescript-eslint/typescript-estree';
import type { Context } from './context-manager';

export type StatementHandler<Statement extends TSESTree.Statement = TSESTree.Statement> = (
  node: Statement,
  context: Context,
) => void;
