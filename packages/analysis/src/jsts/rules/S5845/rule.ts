/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// https://sonarsource.github.io/rspec/#/rspec/S5845/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import type { TSESTree } from '@typescript-eslint/utils';
import ts from 'typescript';
import { type Assertion, extractTestAssertion } from '../helpers/assertions.js';
import {
  isRequiredParserServices,
  type RequiredParserServices,
} from '../helpers/parser-services.js';
import { getTypeFromTreeNode } from '../helpers/type.js';
import { generateMeta } from '../helpers/generate-meta.js';
import * as meta from './generated-meta.js';

const messages = {
  alwaysFails: 'Change this assertion to not compare dissimilar types.',
  alwaysFailsWithTypes:
    'Change this assertion to not compare dissimilar types ("{{actual}}" and "{{expected}}").',
  alwaysSucceeds: 'Change this assertion to not compare dissimilar types.',
  alwaysSucceedsWithTypes:
    'Change this assertion to not compare dissimilar types ("{{actual}}" and "{{expected}}").',
};

type PrimitiveCategory =
  | 'string'
  | 'number'
  | 'boolean'
  | 'bigint'
  | 'symbol'
  | 'null'
  | 'undefined'
  | 'object';

type Incompatibility = {
  actual: string | null;
  expected: string | null;
};

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages }),
  create(context: Rule.RuleContext) {
    const services = context.sourceCode.parserServices;
    if (!isRequiredParserServices(services)) {
      return {};
    }

    const checker = services.program.getTypeChecker();

    function checkAssertion(node: estree.Node) {
      const assertion = extractTestAssertion(context, node);
      if (assertion?.kind !== 'comparison' || assertion.comparison === 'loose') {
        return;
      }

      const incompatibility = getIncompatibility(assertion, context, services, checker);
      if (!incompatibility) {
        return;
      }

      context.report({
        node: assertion.reportNode,
        messageId: getMessageId(assertion, incompatibility),
        data: {
          actual: incompatibility.actual ?? '',
          expected: incompatibility.expected ?? '',
        },
      });
    }

    return {
      CallExpression: checkAssertion,
      MemberExpression: checkAssertion,
    };
  },
};

function getIncompatibility(
  assertion: Extract<Assertion, { kind: 'comparison' }>,
  context: Rule.RuleContext,
  services: RequiredParserServices,
  checker: ts.TypeChecker,
): Incompatibility | null {
  if (
    isUnreliableExpressionType(assertion.actual, context, services, checker) ||
    isUnreliableExpressionType(assertion.expected, context, services, checker) ||
    isMockAffectedComparison(assertion, context)
  ) {
    return null;
  }

  const actualType = checker.getBaseTypeOfLiteralType(
    getTypeFromTreeNode(assertion.actual, services),
  );
  const expectedType = checker.getBaseTypeOfLiteralType(
    getTypeFromTreeNode(assertion.expected, services),
  );

  const actualMembers = getUnionMembers(actualType);
  const expectedMembers = getUnionMembers(expectedType);
  const actualCategories = actualMembers.map(getPrimitiveCategory);
  const expectedCategories = expectedMembers.map(getPrimitiveCategory);

  if (actualCategories.includes(null) || expectedCategories.includes(null)) {
    return null;
  }

  for (const [actualIndex, actualMember] of actualMembers.entries()) {
    for (const [expectedIndex, expectedMember] of expectedMembers.entries()) {
      const actualCategory = actualCategories[actualIndex];
      const expectedCategory = expectedCategories[expectedIndex];
      if (
        (actualCategory === 'object' && expectedCategory === 'object') ||
        actualCategory === expectedCategory ||
        areMutuallyAssignable(actualMember, expectedMember, checker)
      ) {
        return null;
      }
    }
  }

  return {
    actual: getTypeName(actualType, checker),
    expected: getTypeName(expectedType, checker),
  };
}

function getUnionMembers(type: ts.Type): ts.Type[] {
  return type.isUnion() ? type.types : [type];
}

function isUnreliableExpressionType(
  node: estree.Node,
  context: Rule.RuleContext,
  services: RequiredParserServices,
  checker: ts.TypeChecker,
): boolean {
  if (node.type !== 'Identifier') {
    return false;
  }

  return (
    isUntypedUninitializedVariable(node, services, checker) ||
    hasAnyLikeAssignment(node, context, services, checker)
  );
}

function isUntypedUninitializedVariable(
  node: estree.Identifier,
  services: RequiredParserServices,
  checker: ts.TypeChecker,
): boolean {
  const symbol = getSymbol(node, services, checker);
  return Boolean(
    symbol?.declarations?.some(
      declaration =>
        ts.isVariableDeclaration(declaration) &&
        declaration.type === undefined &&
        !declaration.initializer,
    ),
  );
}

function hasAnyLikeAssignment(
  node: estree.Identifier,
  context: Rule.RuleContext,
  services: RequiredParserServices,
  checker: ts.TypeChecker,
): boolean {
  const symbol = getSymbol(node, services, checker);
  if (!symbol) {
    return false;
  }

  let found = false;
  traverse(context.sourceCode.ast, current => {
    if (found || current.type !== 'AssignmentExpression' || current.left.type !== 'Identifier') {
      return;
    }
    if (getSymbol(current.left, services, checker) !== symbol) {
      return;
    }
    const rightType = getTypeFromTreeNode(current.right, services);
    found = isAnyLike(rightType);
  });
  return found;
}

function getSymbol(
  node: estree.Identifier,
  services: RequiredParserServices,
  checker: ts.TypeChecker,
) {
  const tsNode = services.esTreeNodeToTSNodeMap.get(node as TSESTree.Node);
  return checker.getSymbolAtLocation(tsNode);
}

function isAnyLike(type: ts.Type): boolean {
  return Boolean(type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown));
}

const astHasMockSetup = new WeakMap<estree.Program, boolean>();

function isMockAffectedComparison(
  assertion: Extract<Assertion, { kind: 'comparison' }>,
  context: Rule.RuleContext,
): boolean {
  if (!hasMockSetup(context.sourceCode.ast)) {
    return false;
  }

  return (
    isPotentialMockRuntimeExpression(assertion.actual) ||
    isPotentialMockRuntimeExpression(assertion.expected)
  );
}

function hasMockSetup(program: estree.Program): boolean {
  const cached = astHasMockSetup.get(program);
  if (cached !== undefined) {
    return cached;
  }

  let found = false;
  traverse(program, node => {
    if (found || node.type !== 'CallExpression') {
      return;
    }
    found = isMockSetupCall(node);
  });
  astHasMockSetup.set(program, found);
  return found;
}

function isMockSetupCall(node: estree.CallExpression): boolean {
  const callee = node.callee;
  if (callee.type !== 'MemberExpression') {
    return false;
  }
  const object = callee.object;
  const property = callee.property;
  const propertyName =
    property.type === 'Identifier'
      ? property.name
      : property.type === 'Literal'
        ? property.value
        : null;

  return (
    object.type === 'Identifier' &&
    ['vi', 'vitest', 'jest'].includes(object.name) &&
    typeof propertyName === 'string' &&
    ['mock', 'doMock', 'fn', 'spyOn', 'mockObject', 'mocked', 'hoisted', 'importMock'].includes(
      propertyName,
    )
  );
}

function isPotentialMockRuntimeExpression(node: estree.Node): boolean {
  return node.type === 'CallExpression' || node.type === 'MemberExpression';
}

function traverse(node: estree.Node, callback: (node: estree.Node) => void) {
  callback(node);

  for (const [key, value] of Object.entries(node)) {
    if (['parent', 'loc', 'range'].includes(key)) {
      continue;
    }
    if (isNode(value)) {
      traverse(value, callback);
    } else if (Array.isArray(value)) {
      for (const element of value) {
        if (isNode(element)) {
          traverse(element, callback);
        }
      }
    }
  }
}

function isNode(value: unknown): value is estree.Node {
  return typeof value === 'object' && value !== null && 'type' in value;
}

function getPrimitiveCategory(type: ts.Type): PrimitiveCategory | null {
  if (
    type.flags &
    (ts.TypeFlags.Any |
      ts.TypeFlags.Unknown |
      ts.TypeFlags.TypeParameter |
      ts.TypeFlags.IndexedAccess |
      ts.TypeFlags.Never)
  ) {
    return null;
  }

  if (type.flags & ts.TypeFlags.StringLike) {
    return 'string';
  }
  if (type.flags & ts.TypeFlags.NumberLike) {
    return 'number';
  }
  if (type.flags & ts.TypeFlags.BooleanLike) {
    return 'boolean';
  }
  if (type.flags & ts.TypeFlags.BigIntLike) {
    return 'bigint';
  }
  if (type.flags & ts.TypeFlags.ESSymbolLike) {
    return 'symbol';
  }
  if (type.flags & ts.TypeFlags.Null) {
    return 'null';
  }
  if (type.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Void)) {
    return 'undefined';
  }
  if (type.flags & ts.TypeFlags.Object) {
    return 'object';
  }

  return null;
}

function areMutuallyAssignable(left: ts.Type, right: ts.Type, checker: ts.TypeChecker): boolean {
  return checker.isTypeAssignableTo(left, right) && checker.isTypeAssignableTo(right, left);
}

function getTypeName(type: ts.Type, checker: ts.TypeChecker): string | null {
  const typeName = checker.typeToString(type);
  return typeName === '' ? null : typeName;
}

function getMessageId(
  assertion: Extract<Assertion, { kind: 'comparison' }>,
  incompatibility: Incompatibility,
): keyof typeof messages {
  const hasTypes = Boolean(incompatibility.actual && incompatibility.expected);
  if (assertion.negated) {
    return hasTypes ? 'alwaysSucceedsWithTypes' : 'alwaysSucceeds';
  }
  return hasTypes ? 'alwaysFailsWithTypes' : 'alwaysFails';
}
