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
import {
  type Assertion,
  extractMemberChain,
  extractTestAssertion,
} from '../helpers/assertions.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { isRequiredParserServices } from '../helpers/parser-services.js';
import { getTypeFromTreeNode } from '../helpers/type.js';
import * as meta from './generated-meta.js';

const messages = {
  alwaysFails:
    'Change this assertion; it always fails because it compares dissimilar types ("{{actual}}" and "{{expected}}").',
  alwaysSucceeds:
    'Change this assertion; it always succeeds because it compares dissimilar types ("{{actual}}" and "{{expected}}").',
};

type PrimitiveCategory =
  | 'string'
  | 'number'
  | 'boolean'
  | 'bigint'
  | 'null'
  | 'undefined'
  | 'object';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages }),
  create(context: Rule.RuleContext) {
    const services = context.sourceCode.parserServices;
    if (!isRequiredParserServices(services) || !/\.tsx?$/i.test(context.filename)) {
      return {};
    }

    const checker = services.program.getTypeChecker();

    function checkAssertion(node: estree.Node) {
      const assertion = extractTestAssertion(context, node);
      if (!isRelevantAssertion(assertion)) {
        return;
      }
      if (
        assertion.actual.type === 'CallExpression' ||
        assertion.expected.type === 'CallExpression'
      ) {
        return;
      }

      const actualType = checker.getBaseTypeOfLiteralType(
        getTypeFromTreeNode(assertion.actual, services),
      );
      const expectedType = checker.getBaseTypeOfLiteralType(
        getTypeFromTreeNode(assertion.expected, services),
      );
      const incompatibility = getIncompatibility(actualType, expectedType, checker);
      if (incompatibility) {
        context.report({
          node: assertion.reportNode,
          messageId: assertion.negated ? 'alwaysSucceeds' : 'alwaysFails',
          data: incompatibility,
        });
      }
    }

    return {
      CallExpression(node: estree.Node) {
        checkAssertion(node);
      },
      MemberExpression(node: estree.Node) {
        checkAssertion(node);
      },
    };
  },
};

function isRelevantAssertion(assertion: Assertion | null): assertion is Assertion & {
  kind: 'comparison';
} {
  return (
    assertion?.kind === 'comparison' &&
    assertion.comparison !== 'loose' &&
    !isChaiBddEqualAssertion(assertion)
  );
}

function isChaiBddEqualAssertion(assertion: Assertion & { kind: 'comparison' }): boolean {
  if (
    assertion.reportNode.type !== 'Identifier' ||
    !['equal', 'equals', 'eq'].includes(assertion.reportNode.name)
  ) {
    return false;
  }
  if (
    assertion.node.type !== 'CallExpression' ||
    assertion.node.callee.type !== 'MemberExpression'
  ) {
    return false;
  }
  const chain = extractMemberChain(assertion.node.callee.object)?.properties ?? [];
  return !chain.includes('deep') && (chain.includes('to') || chain.includes('should'));
}

function getIncompatibility(
  actualType: ts.Type,
  expectedType: ts.Type,
  checker: ts.TypeChecker,
): { actual: string; expected: string } | null {
  const actualMembers = getUnionMembers(actualType);
  const expectedMembers = getUnionMembers(expectedType);
  const actualCategories = actualMembers.map(getPrimitiveCategory);
  const expectedCategories = expectedMembers.map(getPrimitiveCategory);

  if (actualCategories.includes(null) || expectedCategories.includes(null)) {
    return null;
  }

  for (const actualCategory of actualCategories) {
    for (const expectedCategory of expectedCategories) {
      if (
        actualCategory === expectedCategory ||
        isConservativeCategory(actualCategory) ||
        isConservativeCategory(expectedCategory)
      ) {
        return null;
      }
    }
  }

  return {
    actual: checker.typeToString(actualType),
    expected: checker.typeToString(expectedType),
  };
}

function isConservativeCategory(category: PrimitiveCategory | null): boolean {
  return category === 'object' || category === 'null' || category === 'undefined';
}

function getUnionMembers(type: ts.Type): ts.Type[] {
  return type.isUnion() ? type.types : [type];
}

function getPrimitiveCategory(type: ts.Type): PrimitiveCategory | null {
  const indeterminateFlags =
    ts.TypeFlags.Any |
    ts.TypeFlags.Unknown |
    ts.TypeFlags.TypeParameter |
    ts.TypeFlags.IndexedAccess;
  if ((type.flags & indeterminateFlags) !== 0) {
    return null;
  }
  if ((type.flags & ts.TypeFlags.StringLike) !== 0) {
    return 'string';
  }
  if ((type.flags & ts.TypeFlags.NumberLike) !== 0) {
    return 'number';
  }
  if ((type.flags & ts.TypeFlags.BooleanLike) !== 0) {
    return 'boolean';
  }
  if ((type.flags & ts.TypeFlags.BigIntLike) !== 0) {
    return 'bigint';
  }
  if ((type.flags & ts.TypeFlags.Null) !== 0) {
    return 'null';
  }
  if ((type.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Void)) !== 0) {
    return 'undefined';
  }
  if ((type.flags & ts.TypeFlags.Object) !== 0) {
    return 'object';
  }
  return null;
}
