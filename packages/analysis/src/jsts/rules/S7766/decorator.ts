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
// https://sonarsource.github.io/rspec/#/rspec/S7766/javascript

import type { Rule, SourceCode } from 'eslint';
import type estree from 'estree';
import ts from 'typescript';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import { generateMeta } from '../helpers/generate-meta.js';
import {
  isRequiredParserServices,
  type RequiredParserServices,
} from '../helpers/parser-services.js';
import { getTypeFromTreeNode, isAny, isNumberType } from '../helpers/type.js';
import * as meta from './generated-meta.js';

const comparisonOperators = new Set(['<', '<=', '>', '>=']);

type MinMaxConditionalExpression = estree.ConditionalExpression & {
  test: estree.BinaryExpression;
};

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    (context, descriptor) => {
      if (!isMinMaxConditionalReport(descriptor, context.sourceCode)) {
        context.report(descriptor);
        return;
      }

      if (shouldSuppressReport(descriptor.node, context.sourceCode)) {
        return;
      }

      context.report(descriptor);
    },
  );
}

function shouldSuppressReport(node: MinMaxConditionalExpression, sourceCode: SourceCode): boolean {
  if (!isRequiredParserServices(sourceCode.parserServices)) {
    return false;
  }

  const services = sourceCode.parserServices;
  const { left, right } = node.test;
  return (
    isDefinitelyNonNumberDomainNode(left, services) ||
    isDefinitelyNonNumberDomainNode(right, services)
  );
}

function isMinMaxConditionalReport(
  descriptor: Rule.ReportDescriptor,
  sourceCode: SourceCode,
): descriptor is Rule.ReportDescriptor & { node: MinMaxConditionalExpression } {
  if (!('node' in descriptor) || descriptor.node.type !== 'ConditionalExpression') {
    return false;
  }

  const { test, consequent, alternate } = descriptor.node;
  return (
    test.type === 'BinaryExpression' &&
    comparisonOperators.has(test.operator) &&
    ((areSameExpression(test.left, consequent, sourceCode) &&
      areSameExpression(test.right, alternate, sourceCode)) ||
      (areSameExpression(test.left, alternate, sourceCode) &&
        areSameExpression(test.right, consequent, sourceCode)))
  );
}

function areSameExpression(left: estree.Node, right: estree.Node, sourceCode: SourceCode): boolean {
  return sourceCode.getText(left) === sourceCode.getText(right);
}

function isDefinitelyNonNumberDomainNode(
  node: estree.Node,
  services: RequiredParserServices,
): boolean {
  const type = getTypeFromTreeNode(node, services);
  return isDefinitelyNonNumberDomainType(type, services.program.getTypeChecker());
}

function isDefinitelyNonNumberDomainType(type: ts.Type, checker: ts.TypeChecker): boolean {
  const unionTypes = type.isUnion() ? type.types : [type];
  return unionTypes.every(typePart => isNonNumberDomainType(typePart, checker));
}

function isNonNumberDomainType(type: ts.Type, checker: ts.TypeChecker): boolean {
  if (isAnyOrUnknownType(type)) {
    return false;
  }

  if ((type.getFlags() & ts.TypeFlags.TypeParameter) !== 0) {
    const constraint = checker.getBaseConstraintOfType(type);
    return (
      constraint == null ||
      isAnyOrUnknownType(constraint) ||
      isDefinitelyNonNumberDomainType(constraint, checker)
    );
  }

  return !isNumberType(type) && (type.getFlags() & ts.TypeFlags.Object) !== 0;
}

function isAnyOrUnknownType(type: ts.Type): boolean {
  return isAny(type) || (type.getFlags() & ts.TypeFlags.Unknown) !== 0;
}
