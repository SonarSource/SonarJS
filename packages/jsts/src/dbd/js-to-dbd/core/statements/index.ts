import { ContextManager } from '../context-manager';
import { TSESTree } from '@typescript-eslint/utils';
import { handleBlockStatement } from './block-statement';
import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import { handleExpressionStatement } from './expression-statement';
import { handleIfStatement } from './if-statement';
import { handleVariableDeclaration } from './variable-declaration';

export function handleStatement(context: ContextManager, node: TSESTree.Statement) {
  switch (node.type) {
    case TSESTree.AST_NODE_TYPES.BlockStatement:
      handleBlockStatement(context, node);
      break;
    case AST_NODE_TYPES.ExpressionStatement:
      handleExpressionStatement(context, node);
      break;
    case AST_NODE_TYPES.IfStatement:
      handleIfStatement(context, node);
      break;
    case AST_NODE_TYPES.VariableDeclaration:
      handleVariableDeclaration(context, node);
      break;
    default:
      throw new Error(`Unable to handle ${node.type} statement`);
  }
}
