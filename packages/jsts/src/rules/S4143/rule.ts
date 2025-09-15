/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S4143

import {
  areEquivalent,
  generateMeta,
  getProgramStatements,
  isIdentifier,
  isLiteral,
  report,
  toSecondaryLocation,
} from '../helpers/index.js';
import { AST, Rule } from 'eslint';
import type estree from 'estree';
import * as meta from './generated-meta.js';

const message =
  'Verify this is the index that was intended; "{{index}}" was already set on line {{line}}.';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      verifyIntendedIndex: message,
    },
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
      for (const statement of statements) {
        const keyWriteUsage = getKeyWriteUsage(statement);
        if (keyWriteUsage) {
          if (
            collection &&
            !areEquivalent(keyWriteUsage.collectionNode, collection, context.sourceCode)
          ) {
            usedKeys.clear();
          }
          const sameKeyWriteUsage = usedKeys.get(keyWriteUsage.indexOrKey);
          if (sameKeyWriteUsage?.node.loc) {
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
      }
    }

    function getKeyWriteUsage(node: estree.Node): KeyWriteCollectionUsage | undefined {
      if (node.type === 'ExpressionStatement') {
        return arrayKeyWriteUsage(node.expression) || mapOrSetKeyWriteUsage(node.expression);
      }
      return undefined;
    }

    function arrayKeyWriteUsage(node: estree.Node): KeyWriteCollectionUsage | undefined {
      // a[b] = ...
      if (isSimpleAssignment(node) && node.left.type === 'MemberExpression' && node.left.computed) {
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
  return node.type === 'AssignmentExpression' && node.operator === '=';
}

interface KeyWriteCollectionUsage {
  collectionNode: estree.Node;
  indexOrKey: string;
  node: estree.Node;
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

function mapOrSetKeyWriteUsage(node: estree.Node): KeyWriteCollectionUsage | undefined {
  if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression') {
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
