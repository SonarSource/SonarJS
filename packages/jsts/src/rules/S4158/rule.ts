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
// https://sonarsource.github.io/rspec/#/rspec/S4158

import type { TSESTree } from '@typescript-eslint/utils';
import {
  ancestorsChain,
  collectionConstructor,
  findFirstMatchingAncestor,
  generateMeta,
  isIdentifier,
  isReferenceTo,
} from '../helpers/index.ts';
import { Rule, Scope } from 'eslint';
import estree from 'estree';
import { meta } from './meta.ts';

// Methods that mutate the collection but can't add elements
const nonAdditiveMutatorMethods = [
  // array methods
  'copyWithin',
  'pop',
  'reverse',
  'shift',
  'sort',
  // map, set methods
  'clear',
  'delete',
];
const accessorMethods = [
  // array methods
  'concat',
  'flat',
  'flatMap',
  'includes',
  'indexOf',
  'join',
  'lastIndexOf',
  'slice',
  'toSource',
  'toString',
  'toLocaleString',
  // map, set methods
  'get',
  'has',
];
const iterationMethods = [
  'entries',
  'every',
  'filter',
  'find',
  'findIndex',
  'forEach',
  'keys',
  'map',
  'reduce',
  'reduceRight',
  'some',
  'values',
];

const strictlyReadingMethods = new Set([
  ...nonAdditiveMutatorMethods,
  ...accessorMethods,
  ...iterationMethods,
]);

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      reviewUsageOfIdentifier:
        'Review this usage of "{{identifierName}}" as it can only be empty here.',
    },
  }),
  create(context) {
    return {
      'Program:exit': (node: estree.Node) => {
        reportEmptyCollectionsUsage(context.sourceCode.getScope(node), context);
      },
    };
  },
};

function reportEmptyCollectionsUsage(scope: Scope.Scope, context: Rule.RuleContext) {
  if (scope.type !== 'global') {
    scope.variables.forEach(v => {
      reportEmptyCollectionUsage(v, context);
    });
  }

  scope.childScopes.forEach(childScope => {
    reportEmptyCollectionsUsage(childScope, context);
  });
}

function reportEmptyCollectionUsage(variable: Scope.Variable, context: Rule.RuleContext) {
  if (variable.references.length <= 1) {
    return;
  }

  if (variable.defs.some(d => d.type === 'Parameter' || d.type === 'ImportBinding')) {
    // Bound value initialized elsewhere, could be non-empty.
    return;
  }

  const readingUsages = [];
  let hasAssignmentOfEmptyCollection = false;

  for (const ref of variable.references) {
    if (ref.isWriteOnly()) {
      if (isReferenceAssigningEmptyCollection(ref)) {
        hasAssignmentOfEmptyCollection = true;
      } else {
        // There is at least one operation that might make the collection non-empty.
        // We ignore the order of usages, and consider all reads to be safe.
        return;
      }
    } else if (isReadingCollectionUsage(ref)) {
      readingUsages.push(ref);
    } else {
      // some unknown operation on the collection.
      // To avoid any FPs, we assume that it could make the collection non-empty.
      return;
    }
  }

  if (hasAssignmentOfEmptyCollection) {
    readingUsages.forEach(ref => {
      context.report({
        messageId: 'reviewUsageOfIdentifier',
        data: {
          identifierName: ref.identifier.name,
        },
        node: ref.identifier,
      });
    });
  }
}

function isReferenceAssigningEmptyCollection(ref: Scope.Reference) {
  const declOrExprStmt = findFirstMatchingAncestor(
    ref.identifier as TSESTree.Node,
    n => n.type === 'VariableDeclarator' || n.type === 'ExpressionStatement',
  ) as TSESTree.Node;
  if (declOrExprStmt) {
    if (declOrExprStmt.type === 'VariableDeclarator' && declOrExprStmt.init) {
      return isEmptyCollectionType(declOrExprStmt.init);
    }

    if (declOrExprStmt.type === 'ExpressionStatement') {
      const { expression } = declOrExprStmt;
      return (
        expression.type === 'AssignmentExpression' &&
        isReferenceTo(ref, expression.left as estree.Node) &&
        isEmptyCollectionType(expression.right)
      );
    }
  }
  return false;
}

function isEmptyCollectionType(node: TSESTree.Node) {
  if (node && node.type === 'ArrayExpression') {
    return node.elements.length === 0;
  } else if (node && (node.type === 'CallExpression' || node.type === 'NewExpression')) {
    return isIdentifier(node.callee, ...collectionConstructor) && node.arguments.length === 0;
  }
  return false;
}

function isReadingCollectionUsage(ref: Scope.Reference) {
  return isStrictlyReadingMethodCall(ref) || isForIterationPattern(ref) || isElementRead(ref);
}

function isStrictlyReadingMethodCall(usage: Scope.Reference) {
  const { parent } = usage.identifier as TSESTree.Node;
  if (parent && parent.type === 'MemberExpression') {
    const memberExpressionParent = parent.parent;
    if (memberExpressionParent && memberExpressionParent.type === 'CallExpression') {
      return isIdentifier(parent.property as TSESTree.Node, ...strictlyReadingMethods);
    }
  }
  return false;
}

function isForIterationPattern(ref: Scope.Reference) {
  const forInOrOfStatement = findFirstMatchingAncestor(
    ref.identifier as TSESTree.Node,
    n => n.type === 'ForOfStatement' || n.type === 'ForInStatement',
  ) as TSESTree.ForOfStatement | TSESTree.ForInStatement;

  return forInOrOfStatement && forInOrOfStatement.right === ref.identifier;
}

function isElementRead(ref: Scope.Reference) {
  const { parent } = ref.identifier as TSESTree.Node;
  return (
    parent &&
    parent.type === 'MemberExpression' &&
    parent.computed &&
    !isElementWrite(parent as estree.MemberExpression)
  );
}

function isElementWrite(memberExpression: estree.MemberExpression) {
  const ancestors = ancestorsChain(memberExpression as TSESTree.Node, new Set());
  const assignment = ancestors.find(
    n => n.type === 'AssignmentExpression',
  ) as TSESTree.AssignmentExpression;
  if (assignment && assignment.operator === '=') {
    return [memberExpression, ...ancestors].includes(assignment.left);
  }
  return false;
}
