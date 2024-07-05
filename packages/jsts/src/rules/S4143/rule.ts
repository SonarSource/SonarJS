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
// https://sonarsource.github.io/rspec/#/rspec/S4143

import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import {
  areEquivalent,
  getProgramStatements,
  isIdentifier,
  isLiteral,
  report,
  toSecondaryLocation,
} from '../helpers';
import { AST, Rule } from 'eslint';
import estree from 'estree';
import { generateMeta } from '../helpers/generate-meta';
import rspecMeta from './meta.json';

const message =
  'Verify this is the index that was intended; "{{index}}" was already set on line {{line}}.';

export const rule: Rule.RuleModule = {
  meta: generateMeta(rspecMeta as Rule.RuleMetaData, {
    messages: {
      verifyIntendedIndex: message,
    },
    schema: [
      {
        // internal parameter
        type: 'string',
        enum: ['sonar-runtime'],
      },
    ],
  }),
  create(context) {
    return {
      SwitchCase(node: estree.SwitchCase) {
        checkStatements(node.consequent);
      },

      BlockStatement(node: estree.BlockStatement) {
        checkStatements(node.body);
      },

      Program(node: estree.Program) {
        checkStatements(getProgramStatements(node));
      },
    };

    function checkStatements(statements: Array<estree.Statement>) {
      const usedKeys: Map<string, KeyWriteCollectionUsage> = new Map();
      let collection: estree.Node | undefined;
      statements.forEach(statement => {
        const keyWriteUsage = getKeyWriteUsage(statement);
        if (keyWriteUsage) {
          if (
            collection &&
            !areEquivalent(keyWriteUsage.collectionNode, collection, context.sourceCode)
          ) {
            usedKeys.clear();
          }
          const sameKeyWriteUsage = usedKeys.get(keyWriteUsage.indexOrKey);
          if (sameKeyWriteUsage && sameKeyWriteUsage.node.loc) {
            const secondaryLocations = [
              toSecondaryLocation(sameKeyWriteUsage.node, 'Original value'),
            ];
            report(
              context,
              {
                node: keyWriteUsage.node,
                messageId: 'verifyIntendedIndex',
                message,
                data: {
                  index: keyWriteUsage.indexOrKey,
                  line: sameKeyWriteUsage.node.loc.start.line as any,
                },
              },
              secondaryLocations,
            );
          }
          usedKeys.set(keyWriteUsage.indexOrKey, keyWriteUsage);
          collection = keyWriteUsage.collectionNode;
        } else {
          usedKeys.clear();
        }
      });
    }

    function getKeyWriteUsage(node: estree.Node): KeyWriteCollectionUsage | undefined {
      if (node.type === AST_NODE_TYPES.ExpressionStatement) {
        return arrayKeyWriteUsage(node.expression) || mapOrSetKeyWriteUsage(node.expression);
      }
      return undefined;
    }

    function arrayKeyWriteUsage(node: estree.Node): KeyWriteCollectionUsage | undefined {
      // a[b] = ...
      if (
        isSimpleAssignment(node) &&
        node.left.type === AST_NODE_TYPES.MemberExpression &&
        node.left.computed
      ) {
        const { left, right } = node;
        const index = extractIndex(left.property);
        if (index !== undefined && !isUsed(left.object, right)) {
          return {
            collectionNode: left.object,
            indexOrKey: index,
            node,
          };
        }
      }
      return undefined;
    }

    function mapOrSetKeyWriteUsage(node: estree.Node): KeyWriteCollectionUsage | undefined {
      if (
        node.type === AST_NODE_TYPES.CallExpression &&
        node.callee.type === AST_NODE_TYPES.MemberExpression
      ) {
        const propertyAccess = node.callee;
        if (isIdentifier(propertyAccess.property)) {
          const methodName = propertyAccess.property.name;
          const addMethod = methodName === 'add' && node.arguments.length === 1;
          const setMethod = methodName === 'set' && node.arguments.length === 2;

          if (addMethod || setMethod) {
            const key = extractIndex(node.arguments[0]);
            if (key) {
              return {
                collectionNode: propertyAccess.object,
                indexOrKey: key,
                node,
              };
            }
          }
        }
      }
      return undefined;
    }

    function extractIndex(node: estree.Node): string | undefined {
      if (isLiteral(node)) {
        const { value } = node;
        return typeof value === 'number' || typeof value === 'string' ? String(value) : undefined;
      } else if (isIdentifier(node)) {
        return node.name;
      }
      return undefined;
    }

    function isUsed(value: estree.Node, expression: estree.Expression) {
      const valueTokens = context.sourceCode.getTokens(value);
      const expressionTokens = context.sourceCode.getTokens(expression);

      const foundUsage = expressionTokens.find((token, index) => {
        if (eq(token, valueTokens[0])) {
          for (
            let expressionIndex = index, valueIndex = 0;
            expressionIndex < expressionTokens.length && valueIndex < valueTokens.length;
            expressionIndex++, valueIndex++
          ) {
            if (!eq(expressionTokens[expressionIndex], valueTokens[valueIndex])) {
              break;
            } else if (valueIndex === valueTokens.length - 1) {
              return true;
            }
          }
        }
        return false;
      });

      return foundUsage !== undefined;
    }
  },
};

function eq(token1: AST.Token, token2: AST.Token) {
  return token1.value === token2.value;
}

function isSimpleAssignment(node: estree.Node): node is estree.AssignmentExpression {
  return node.type === AST_NODE_TYPES.AssignmentExpression && node.operator === '=';
}

interface KeyWriteCollectionUsage {
  collectionNode: estree.Node;
  indexOrKey: string;
  node: estree.Node;
}
