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
// https://sonarsource.github.io/rspec/#/rspec/S3796/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import type { TSESTree } from '@typescript-eslint/utils';
import {
  generateMeta,
  getMainFunctionTokenLocation,
  isArray,
  isDotNotation,
  isIndexNotation,
  isMemberExpression,
  isRequiredParserServices,
  isTypedArray,
  RequiredParserServices,
  RuleContext,
} from '../helpers/index.js';
import * as meta from './generated-meta.js';

const message = `Add a "return" statement to this callback.`;

const methodsWithCallback = new Set([
  'every',
  'filter',
  'find',
  'findLast',
  'findIndex',
  'findLastIndex',
  'map',
  'flatMap',
  'reduce',
  'reduceRight',
  'some',
  'sort',
  'toSorted',
]);

function hasCallBackWithoutReturn(argument: estree.Node, services: RequiredParserServices) {
  const checker = services.program.getTypeChecker();
  const type = checker.getTypeAtLocation(
    services.esTreeNodeToTSNodeMap.get(argument as TSESTree.Node),
  );
  const signatures = type.getCallSignatures();
  return (
    signatures.length > 0 &&
    signatures.every(sig => checker.typeToString(sig.getReturnType()) === 'void')
  );
}

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta),
  create(context: Rule.RuleContext) {
    const services = context.sourceCode.parserServices;

    if (!isRequiredParserServices(services)) {
      return {};
    }

    return {
      'CallExpression[callee.type="MemberExpression"]'(node: estree.Node) {
        const callExpression = node as estree.CallExpression;
        const args = callExpression.arguments;
        const memberExpression = callExpression.callee as estree.MemberExpression;
        const { object } = memberExpression;
        const propName = extractPropName(memberExpression);
        if (propName === null || args.length === 0) {
          return;
        }

        if (
          methodsWithCallback.has(propName) &&
          (isArray(object, services) || isTypedArray(object, services)) &&
          hasCallBackWithoutReturn(args[0], services)
        ) {
          context.report({
            message,
            ...getNodeToReport(args[0], node, context),
          });
        } else if (
          isMemberExpression(callExpression.callee, 'Array', 'from') &&
          args.length > 1 &&
          hasCallBackWithoutReturn(args[1], services)
        ) {
          context.report({
            message,
            ...getNodeToReport(args[1], node, context),
          });
        }
      },
    };
  },
};

function extractPropName(memberExpression: estree.MemberExpression) {
  if (isDotNotation(memberExpression)) {
    return memberExpression.property.name;
  } else if (isIndexNotation(memberExpression)) {
    return memberExpression.property.value;
  } else {
    return null;
  }
}

function getNodeToReport(node: estree.Node, parent: estree.Node, context: Rule.RuleContext) {
  if (
    node.type === 'FunctionDeclaration' ||
    node.type === 'FunctionExpression' ||
    node.type === 'ArrowFunctionExpression'
  ) {
    return {
      loc: getMainFunctionTokenLocation(
        node as TSESTree.FunctionLike,
        parent as TSESTree.Node,
        context as unknown as RuleContext,
      ),
    };
  }
  return {
    node,
  };
}
