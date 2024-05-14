import { TSESTree } from '@typescript-eslint/utils';
import { handleExpression } from '../expressions';
import { handleReturnStatement } from './return-statement';
import { ScopeTranslator } from '../scope-translator';
import { handleVariableDeclaration } from './variable-declaration';

export function handleStatement(scopeTranslator: ScopeTranslator, statement: TSESTree.Statement) {
  switch (statement.type) {
    case TSESTree.AST_NODE_TYPES.VariableDeclaration:
      return handleVariableDeclaration(scopeTranslator, statement);
    case TSESTree.AST_NODE_TYPES.ExpressionStatement:
      return handleExpression(scopeTranslator, statement.expression);
    case TSESTree.AST_NODE_TYPES.ReturnStatement:
      return handleReturnStatement(scopeTranslator, statement);
    default:
      throw new Error(`Unhandled statement type ${statement.type}`);
  }
}
