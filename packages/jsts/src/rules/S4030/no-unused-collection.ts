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
// https://sonarsource.github.io/rspec/#/rspec/S4030

import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import { collectionConstructor, writingMethods } from '../utils/collections';
import docsUrl from '../utils/docs-url';

const rule: TSESLint.RuleModule<string, string[]> = {
  defaultOptions: [],
  meta: {
    messages: {
      unusedCollection: "Either use this collection's contents or remove the collection.",
    },
    schema: [],
    type: 'problem',
    docs: {
      description: 'Collection and array contents should be used',
      recommended: 'recommended',
      url: docsUrl(__filename),
    },
  },
  create(context) {
    return {
      'Program:exit': (node: TSESTree.Node) => {
        const unusedArrays: TSESLint.Scope.Variable[] = [];
        collectUnusedCollections(context.sourceCode.getScope(node), unusedArrays);

        unusedArrays.forEach(unusedArray => {
          context.report({
            messageId: 'unusedCollection',
            node: unusedArray.identifiers[0],
          });
        });
      },
    };
  },
};

function collectUnusedCollections(
  scope: TSESLint.Scope.Scope,
  unusedArray: TSESLint.Scope.Variable[],
) {
  if (scope.type !== 'global') {
    scope.variables.filter(isUnusedCollection).forEach(v => {
      unusedArray.push(v);
    });
  }

  scope.childScopes.forEach(childScope => {
    collectUnusedCollections(childScope, unusedArray);
  });
}

function isExported(variable: TSESLint.Scope.Variable) {
  const definition = variable.defs[0];
  return definition && definition.node.parent?.parent?.type.startsWith('Export');
}

function isUnusedCollection(variable: TSESLint.Scope.Variable) {
  if (isExported(variable)) {
    return false;
  }
  if (variable.references.length <= 1) {
    return false;
  }
  let assignCollection = false;

  for (const ref of variable.references) {
    if (ref.isWriteOnly()) {
      if (isReferenceAssigningCollection(ref)) {
        assignCollection = true;
      } else {
        //One assignment is not a collection, we don't go further
        return false;
      }
    } else if (isRead(ref)) {
      //Unfortunately, isRead (!isWrite) from Scope.Reference consider A[1] = 1; and A.xxx(); as a read operation, we need to filter further
      return false;
    }
  }
  return assignCollection;
}

function isReferenceAssigningCollection(ref: TSESLint.Scope.Reference) {
  const declOrExprStmt = findFirstMatchingAncestor(
    ref.identifier as TSESTree.Node,
    n => n.type === 'VariableDeclarator' || n.type === 'ExpressionStatement',
  ) as TSESTree.Node;
  if (declOrExprStmt) {
    if (declOrExprStmt.type === 'VariableDeclarator' && declOrExprStmt.init) {
      return isCollectionType(declOrExprStmt.init);
    }

    if (declOrExprStmt.type === 'ExpressionStatement') {
      const { expression } = declOrExprStmt;
      return (
        expression.type === 'AssignmentExpression' &&
        isReferenceTo(ref, expression.left) &&
        isCollectionType(expression.right)
      );
    }
  }
  return false;
}

function isCollectionType(node: TSESTree.Node) {
  if (node && node.type === 'ArrayExpression') {
    return true;
  } else if (node && (node.type === 'CallExpression' || node.type === 'NewExpression')) {
    return isIdentifier(node.callee, ...collectionConstructor);
  }
  return false;
}

function isRead(ref: TSESLint.Scope.Reference) {
  const expressionStatement = findFirstMatchingAncestor(
    ref.identifier as TSESTree.Node,
    n => n.type === 'ExpressionStatement',
  ) as TSESTree.ExpressionStatement;

  if (expressionStatement) {
    return !(
      isElementWrite(expressionStatement, ref) || isWritingMethodCall(expressionStatement, ref)
    );
  }

  //All the write statement that we search are part of ExpressionStatement, if there is none, it's a read
  return true;
}

/**
 * Detect expression statements like the following:
 * myArray.push(1);
 */
function isWritingMethodCall(
  statement: TSESTree.ExpressionStatement,
  ref: TSESLint.Scope.Reference,
) {
  if (statement.expression.type === 'CallExpression') {
    const { callee } = statement.expression;
    if (isMemberExpression(callee)) {
      const { property } = callee;
      return isReferenceTo(ref, callee.object) && isIdentifier(property, ...writingMethods);
    }
  }
  return false;
}

function isMemberExpression(node: TSESTree.Node): node is TSESTree.MemberExpression {
  return node.type === 'MemberExpression';
}

/**
 * Detect expression statements like the following:
 *  myArray[1] = 42;
 *  myArray[1] += 42;
 *  myObj.prop1 = 3;
 *  myObj.prop1 += 3;
 */
function isElementWrite(statement: TSESTree.ExpressionStatement, ref: TSESLint.Scope.Reference) {
  if (statement.expression.type === 'AssignmentExpression') {
    const assignmentExpression = statement.expression;
    const lhs = assignmentExpression.left;
    return isMemberExpressionReference(lhs, ref);
  }
  return false;
}

function isMemberExpressionReference(lhs: TSESTree.Node, ref: TSESLint.Scope.Reference): boolean {
  return lhs.type === 'MemberExpression' && isReferenceTo(ref, lhs.object);
}

function isIdentifier(node: TSESTree.Node, ...values: string[]): node is TSESTree.Identifier {
  return node.type === 'Identifier' && values.some(value => value === node.name);
}

function isReferenceTo(ref: TSESLint.Scope.Reference, node: TSESTree.Node) {
  return node.type === 'Identifier' && node === ref.identifier;
}

function findFirstMatchingAncestor(
  node: TSESTree.Node,
  predicate: (node: TSESTree.Node) => boolean,
) {
  return ancestorsChain(node, new Set()).find(predicate);
}

function ancestorsChain(node: TSESTree.Node, boundaryTypes: Set<string>) {
  const chain: TSESTree.Node[] = [];

  let currentNode = node.parent;
  while (currentNode) {
    chain.push(currentNode);
    if (boundaryTypes.has(currentNode.type)) {
      break;
    }
    currentNode = currentNode.parent;
  }
  return chain;
}

export = rule;
