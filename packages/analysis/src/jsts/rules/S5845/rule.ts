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

      const incompatibility = getIncompatibility(assertion, services, checker);
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
  services: RequiredParserServices,
  checker: ts.TypeChecker,
): Incompatibility | null {
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
