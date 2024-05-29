import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import type { StatementHandler } from '../statement-handler';
import { handleFunctionDeclaration } from './function-declaration';
import { handleVariableDeclaration } from './variable-declaration';
import { handleBlockStatement } from './block-statement';
import { handleIfStatement } from './if-statement';
import { handleExpressionStatement } from './expression-statement';
import { handleReturnStatement } from './return-statement';

export const handleStatement: StatementHandler = (node, scopeManager) => {
  console.info('handleStatement', node.type);

  let statementHandler: StatementHandler<any>;

  switch (node.type) {
    case AST_NODE_TYPES.BlockStatement: {
      statementHandler = handleBlockStatement;
      break;
    }
    case AST_NODE_TYPES.ExpressionStatement: {
      statementHandler = handleExpressionStatement;
      break;
    }
    case AST_NODE_TYPES.FunctionDeclaration: {
      statementHandler = handleFunctionDeclaration;
      break;
    }
    case AST_NODE_TYPES.IfStatement: {
      statementHandler = handleIfStatement;
      break;
    }
    case AST_NODE_TYPES.VariableDeclaration: {
      statementHandler = handleVariableDeclaration;
      break;
    }
    case AST_NODE_TYPES.ReturnStatement: {
      statementHandler = handleReturnStatement;
      break;
    }
    default: {
      statementHandler = () => {
        console.error(`Unable to handle ${node.type} statement`);
      };
    }
  }

  return statementHandler(node, scopeManager);
};
