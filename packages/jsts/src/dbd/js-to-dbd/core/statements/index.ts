import { ContextManager } from '../context-manager';
import { handleBlockStatement } from './block-statement';
import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/typescript-estree';
import { handleExpressionStatement } from './expression-statement';
import { handleIfStatement } from './if-statement';
import { handleVariableDeclaration } from './variable-declaration';
import { handleReturnStatement } from './return-statement';

export function handleStatement(context: ContextManager, node: TSESTree.Statement) {
  console.info('handleStatement', node.type);

  switch (node.type) {
    case AST_NODE_TYPES.BlockStatement:
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
    case AST_NODE_TYPES.ReturnStatement:
      handleReturnStatement(context, node);
      break;
    default:
      console.error(`Unable to handle ${node.type} statement`);
  }
}
