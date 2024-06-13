import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import type { StatementHandler } from '../statement-handler';
import { handleFunctionDeclaration } from './function-declaration';
import { handleVariableDeclaration } from './variable-declaration';
import { handleBlockStatement } from './block-statement';
import { handleIfStatement } from './if-statement';
import { handleExpressionStatement } from './expression-statement';
import { handleReturnStatement } from './return-statement';
import { handleExportDefaultDeclaration } from './export-default-declaration';
import { handleExportNamedDeclaration } from './export-named-declaration';
import { handleImportDeclaration } from './import-declaration';

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
    case AST_NODE_TYPES.ExportDefaultDeclaration: {
      statementHandler = handleExportDefaultDeclaration;
      break;
    }
    case AST_NODE_TYPES.ExportNamedDeclaration: {
      statementHandler = handleExportNamedDeclaration;
      break;
    }
    case AST_NODE_TYPES.ImportDeclaration: {
      statementHandler = handleImportDeclaration;
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
