/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
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
