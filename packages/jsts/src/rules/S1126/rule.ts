/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// https://sonarsource.github.io/rspec/#/rspec/S1126
import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/utils';
import type { Rule } from 'eslint';
import estree from 'estree';
import { generateMeta } from '../helpers/index.js';
import { meta } from './meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      replaceIfThenElseByReturn: 'Replace this if-then-else flow by a single return statement.',
      suggest: 'Replace with single return statement',
      suggestCast: 'Replace with single return statement using "!!" cast',
      suggestBoolean:
        'Replace with single return statement without cast (condition should be boolean!)',
    },
    hasSuggestions: true,
  }),
  create(context) {
    return {
      IfStatement(node: estree.IfStatement) {
        const parent = (node as TSESTree.IfStatement).parent as estree.Node;
        if (
          // ignore `else if`
          parent.type !== AST_NODE_TYPES.IfStatement &&
          returnsBoolean(node.consequent) &&
          alternateReturnsBoolean(node)
        ) {
          context.report({
            messageId: 'replaceIfThenElseByReturn',
            node,
            suggest: getSuggestion(node, parent),
          });
        }
      },
    };

    function alternateReturnsBoolean(node: estree.IfStatement) {
      if (node.alternate) {
        return returnsBoolean(node.alternate);
      }

      const { parent } = node as TSESTree.IfStatement;
      if (parent?.type === AST_NODE_TYPES.BlockStatement) {
        const ifStmtIndex = parent.body.findIndex(stmt => stmt === node);
        return isSimpleReturnBooleanLiteral(parent.body[ifStmtIndex + 1] as estree.Statement);
      }

      return false;
    }

    function returnsBoolean(statement: estree.Statement | undefined) {
      return (
        statement !== undefined &&
        (isBlockReturningBooleanLiteral(statement) || isSimpleReturnBooleanLiteral(statement))
      );
    }

    function isBlockReturningBooleanLiteral(statement: estree.Statement) {
      return (
        statement.type === AST_NODE_TYPES.BlockStatement &&
        statement.body.length === 1 &&
        isSimpleReturnBooleanLiteral(statement.body[0])
      );
    }

    function isSimpleReturnBooleanLiteral(statement: estree.Node) {
      return (
        statement?.type === AST_NODE_TYPES.ReturnStatement &&
        statement.argument?.type === AST_NODE_TYPES.Literal &&
        typeof statement.argument.value === 'boolean'
      );
    }

    function getSuggestion(ifStmt: estree.IfStatement, parent: estree.Node) {
      const getFix = (condition: string) => {
        return (fixer: Rule.RuleFixer) => {
          const singleReturn = `return ${condition};`;
          if (ifStmt.alternate) {
            return fixer.replaceText(ifStmt, singleReturn);
          } else {
            const ifStmtIndex = (parent as estree.BlockStatement).body.findIndex(
              stmt => stmt === ifStmt,
            );
            const returnStmt = (parent as estree.BlockStatement).body[ifStmtIndex + 1];
            const range: [number, number] = [ifStmt.range![0], returnStmt.range![1]];
            return fixer.replaceTextRange(range, singleReturn);
          }
        };
      };
      const shouldNegate = isReturningFalse(ifStmt.consequent);
      const shouldCast = !isBooleanExpression(ifStmt.test);
      const testText = context.sourceCode.getText(ifStmt.test);

      if (shouldNegate) {
        return [{ messageId: 'suggest', fix: getFix(`!(${testText})`) }];
      } else if (!shouldCast) {
        return [{ messageId: 'suggest', fix: getFix(testText) }];
      } else {
        return [
          { messageId: 'suggestCast', fix: getFix(`!!(${testText})`) },
          { messageId: 'suggestBoolean', fix: getFix(testText) },
        ];
      }
    }

    function isReturningFalse(stmt: estree.Statement): boolean {
      const returnStmt = (
        stmt.type === AST_NODE_TYPES.BlockStatement ? stmt.body[0] : stmt
      ) as estree.ReturnStatement;
      return (returnStmt.argument as estree.Literal).value === false;
    }

    function isBooleanExpression(expr: estree.Expression) {
      return (
        (expr.type === AST_NODE_TYPES.UnaryExpression ||
          expr.type === AST_NODE_TYPES.BinaryExpression) &&
        ['!', '==', '===', '!=', '!==', '<', '<=', '>', '>=', 'in', 'instanceof'].includes(
          expr.operator,
        )
      );
    }
  },
};
