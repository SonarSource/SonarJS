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
// https://sonarsource.github.io/rspec/#/rspec/S4143

import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import { areEquivalent } from '../utils/equivalence';
import {
  isExpressionStatement,
  isMemberExpression,
  isAssignmentExpression,
  isLiteral,
  isIdentifier,
  isCallExpression,
} from '../utils/nodes';
import { report, issueLocation } from '../utils/locations';
import docsUrl from '../utils/docs-url';

const message =
  'Verify this is the index that was intended; "{{index}}" was already set on line {{line}}.';

const rule: TSESLint.RuleModule<string, string[]> = {
  defaultOptions: [],
  meta: {
    messages: {
      verifyIntendedIndex: message,
      sonarRuntime: '{{sonarRuntimeData}}',
    },
    type: 'problem',
    docs: {
      description: 'Collection elements should not be replaced unconditionally',
      recommended: 'recommended',
      url: docsUrl(__filename),
    },
    schema: [
      {
        // internal parameter
        type: 'string',
        enum: ['sonar-runtime'],
      },
    ],
  },
  create(context) {
    return {
      SwitchCase(node: TSESTree.Node) {
        const switchCase = node as TSESTree.SwitchCase;
        checkStatements(switchCase.consequent);
      },

      BlockStatement(node: TSESTree.Node) {
        const block = node as TSESTree.BlockStatement;
        checkStatements(block.body);
      },

      Program(node: TSESTree.Node) {
        const program = node as TSESTree.Program;
        checkStatements(program.body);
      },
    };

    function checkStatements(statements: Array<TSESTree.ProgramStatement>) {
      const usedKeys: Map<string, KeyWriteCollectionUsage> = new Map();
      let collection: TSESTree.Node | undefined;
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
            const sameKeyWriteUsageLoc = sameKeyWriteUsage.node.loc;
            const secondaryLocations = [
              issueLocation(sameKeyWriteUsageLoc, sameKeyWriteUsageLoc, 'Original value'),
            ];
            report(
              context,
              {
                node: keyWriteUsage.node,
                messageId: 'verifyIntendedIndex',
                data: {
                  index: keyWriteUsage.indexOrKey,
                  line: sameKeyWriteUsage.node.loc.start.line,
                },
              },
              secondaryLocations,
              message,
            );
          }
          usedKeys.set(keyWriteUsage.indexOrKey, keyWriteUsage);
          collection = keyWriteUsage.collectionNode;
        } else {
          usedKeys.clear();
        }
      });
    }

    function getKeyWriteUsage(node: TSESTree.Node): KeyWriteCollectionUsage | undefined {
      if (isExpressionStatement(node)) {
        return arrayKeyWriteUsage(node.expression) || mapOrSetKeyWriteUsage(node.expression);
      }
      return undefined;
    }

    function arrayKeyWriteUsage(node: TSESTree.Node): KeyWriteCollectionUsage | undefined {
      // a[b] = ...
      if (isSimpleAssignment(node) && isMemberExpression(node.left) && node.left.computed) {
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

    function mapOrSetKeyWriteUsage(node: TSESTree.Node): KeyWriteCollectionUsage | undefined {
      if (isCallExpression(node) && isMemberExpression(node.callee)) {
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

    function extractIndex(node: TSESTree.Node): string | undefined {
      if (isLiteral(node)) {
        const { value } = node;
        return typeof value === 'number' || typeof value === 'string' ? String(value) : undefined;
      } else if (isIdentifier(node)) {
        return node.name;
      }
      return undefined;
    }

    function isUsed(value: TSESTree.Node, expression: TSESTree.Expression) {
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

function eq(token1: TSESLint.AST.Token, token2: TSESLint.AST.Token) {
  return token1.value === token2.value;
}

function isSimpleAssignment(node: TSESTree.Node): node is TSESTree.AssignmentExpression {
  return isAssignmentExpression(node) && node.operator === '=';
}

interface KeyWriteCollectionUsage {
  collectionNode: TSESTree.Node;
  indexOrKey: string;
  node: TSESTree.Node;
}

export = rule;
