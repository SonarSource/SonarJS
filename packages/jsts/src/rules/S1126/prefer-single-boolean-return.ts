/*
 * eslint-plugin-sonarjs
 * Copyright (C) 2018-2021 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S1126
import type { TSESTree, TSESLint } from '@typescript-eslint/utils';
import {
  isReturnStatement,
  isBlockStatement,
  isBooleanLiteral,
  isIfStatement,
} from '../utils/nodes';
import docsUrl from '../utils/docs-url';

const rule: TSESLint.RuleModule<string, string[]> = {
  defaultOptions: [],
  meta: {
    messages: {
      replaceIfThenElseByReturn: 'Replace this if-then-else flow by a single return statement.',
      suggest: 'Replace with single return statement',
      suggestCast: 'Replace with single return statement using "!!" cast',
      suggestBoolean:
        'Replace with single return statement without cast (condition should be boolean!)',
    },
    schema: [],
    type: 'suggestion',
    hasSuggestions: true,
    docs: {
      description:
        'Return of boolean expressions should not be wrapped into an "if-then-else" statement',
      recommended: 'recommended',
      url: docsUrl(__filename),
    },
  },
  create(context) {
    return {
      IfStatement(node: TSESTree.IfStatement) {
        if (
          // ignore `else if`
          !isIfStatement(node.parent) &&
          returnsBoolean(node.consequent) &&
          alternateReturnsBoolean(node)
        ) {
          context.report({
            messageId: 'replaceIfThenElseByReturn',
            node,
            suggest: getSuggestion(node),
          });
        }
      },
    };

    function alternateReturnsBoolean(node: TSESTree.IfStatement) {
      if (node.alternate) {
        return returnsBoolean(node.alternate);
      }

      const { parent } = node;
      if (parent?.type === 'BlockStatement') {
        const ifStmtIndex = parent.body.findIndex(stmt => stmt === node);
        return isSimpleReturnBooleanLiteral(parent.body[ifStmtIndex + 1]);
      }

      return false;
    }

    function returnsBoolean(statement: TSESTree.Statement | undefined) {
      return (
        statement !== undefined &&
        (isBlockReturningBooleanLiteral(statement) || isSimpleReturnBooleanLiteral(statement))
      );
    }

    function isBlockReturningBooleanLiteral(statement: TSESTree.Statement) {
      return (
        isBlockStatement(statement) &&
        statement.body.length === 1 &&
        isSimpleReturnBooleanLiteral(statement.body[0])
      );
    }

    function isSimpleReturnBooleanLiteral(statement: TSESTree.Node) {
      // `statement.argument` can be `null`, replace it with `undefined` in this case
      return isReturnStatement(statement) && isBooleanLiteral(statement.argument || undefined);
    }

    function getSuggestion(ifStmt: TSESTree.IfStatement) {
      const getFix = (condition: string) => {
        return (fixer: TSESLint.RuleFixer) => {
          const singleReturn = `return ${condition};`;
          if (ifStmt.alternate) {
            return fixer.replaceText(ifStmt, singleReturn);
          } else {
            const parent = ifStmt.parent as TSESTree.BlockStatement;
            const ifStmtIndex = parent.body.findIndex(stmt => stmt === ifStmt);
            const returnStmt = parent.body[ifStmtIndex + 1];
            const range: [number, number] = [ifStmt.range[0], returnStmt.range[1]];
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

    function isReturningFalse(stmt: TSESTree.Statement): boolean {
      const returnStmt = (
        stmt.type === 'BlockStatement' ? stmt.body[0] : stmt
      ) as TSESTree.ReturnStatement;
      return (returnStmt.argument as TSESTree.Literal).value === false;
    }

    function isBooleanExpression(expr: TSESTree.Expression) {
      return (
        (expr.type === 'UnaryExpression' || expr.type === 'BinaryExpression') &&
        ['!', '==', '===', '!=', '!==', '<', '<=', '>', '>=', 'in', 'instanceof'].includes(
          expr.operator,
        )
      );
    }
  },
};

export = rule;
