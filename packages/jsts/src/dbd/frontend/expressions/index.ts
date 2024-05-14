import { TSESTree } from '@typescript-eslint/utils';
import { handleObjectExpression } from './object-expression';
import { ScopeTranslator } from '../scope-translator';
import { handleExpressionLiteral, handleValueWithoutCall } from './literal';
import { handleCallExpression } from './call-expression';
import { handleMemberExpression } from './member-expression';

export function handleExpression(
  scopeTranslator: ScopeTranslator,
  expression: TSESTree.Expression | null,
  variableName: string | undefined = undefined,
): number {
  if (!expression) {
    throw new Error('Null Expression provided');
  }
  switch (expression.type) {
    case TSESTree.AST_NODE_TYPES.Literal:
      return handleExpressionLiteral(scopeTranslator, expression, variableName);
    case TSESTree.AST_NODE_TYPES.ObjectExpression:
      return handleObjectExpression(scopeTranslator, expression, variableName);
    case TSESTree.AST_NODE_TYPES.Identifier:
      return handleValueWithoutCall(scopeTranslator, expression.name);
    case TSESTree.AST_NODE_TYPES.CallExpression:
      return handleCallExpression(scopeTranslator, expression);
    case TSESTree.AST_NODE_TYPES.MemberExpression:
      return handleMemberExpression(scopeTranslator, expression);
    default:
      throw new Error(`Unhandled Expression type ${expression.type}`);
  }
}
