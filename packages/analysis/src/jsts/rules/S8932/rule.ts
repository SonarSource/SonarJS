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
// https://sonarsource.github.io/rspec/#/rspec/S8932/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import {
  type FunctionNodeType,
  getValueOfExpression,
  isIdentifier,
  isNullLiteral,
  isUndefined,
  resolveFunction,
} from '../helpers/ast.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { getFullyQualifiedName, isRequire } from '../helpers/module.js';
import * as meta from './generated-meta.js';

const supportedModules = new Set(['lodash', 'lodash-es', 'underscore']);
const methodName = 'memoize';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      provideResolver: 'Provide an explicit function to compute the cache key.',
    },
  }),
  create(context: Rule.RuleContext) {
    return {
      CallExpression(node: estree.Node) {
        const call = node as estree.CallExpression;
        const syntacticMethod = getSyntacticMethodName(call.callee);
        if (syntacticMethod === undefined || hasResolver(call)) {
          return;
        }

        const fqn = getFullyQualifiedName(context, call);
        if (fqn === null || !isMemoizeCall(fqn, syntacticMethod)) {
          return;
        }

        const memoizedFunction = resolveMemoizedFunction(context, call.arguments[0]);
        if (memoizedFunction !== null && hasMultipleRuntimeParameters(memoizedFunction)) {
          context.report({
            node: getReportNode(call.callee),
            messageId: 'provideResolver',
          });
        }
      },
    };
  },
};

function hasResolver(call: estree.CallExpression): boolean {
  const resolver = call.arguments[1];
  if (resolver === undefined) {
    return false;
  }
  if (resolver.type === 'SpreadElement') {
    return true;
  }
  return !isMissingResolver(resolver);
}

function isMissingResolver(node: estree.Expression): boolean {
  return isUndefined(node) || isNullLiteral(node) || isVoidExpression(node);
}

function isVoidExpression(node: estree.Expression): boolean {
  return node.type === 'UnaryExpression' && node.operator === 'void';
}

function resolveMemoizedFunction(
  context: Rule.RuleContext,
  argument: estree.CallExpression['arguments'][number] | undefined,
): FunctionNodeType | null {
  if (argument === undefined || argument.type === 'SpreadElement') {
    return null;
  }
  return (
    resolveFunction(context, argument) ??
    getValueOfExpression(context, argument, 'ArrowFunctionExpression', true) ??
    getValueOfExpression(context, argument, 'FunctionExpression', true) ??
    null
  );
}

function hasMultipleRuntimeParameters(functionNode: FunctionNodeType): boolean {
  const runtimeParameters = functionNode.params.filter(parameter => !isThisParameter(parameter));
  return (
    runtimeParameters.length >= 2 ||
    runtimeParameters.some(parameter => parameter.type === 'RestElement')
  );
}

function isThisParameter(parameter: estree.Pattern): boolean {
  return isIdentifier(parameter, 'this');
}

function getSyntacticMethodName(
  callee: estree.Expression | estree.Super,
): typeof methodName | null | undefined {
  if (callee.type === 'ChainExpression') {
    return getSyntacticMethodName(callee.expression);
  }
  if (callee.type === 'MemberExpression') {
    const propertyName = getPropertyName(callee);
    if (propertyName === undefined) {
      return undefined;
    }
    if (isCallResult(callee.object) && !isRequire(callee.object)) {
      return undefined;
    }
    return propertyName === methodName ? methodName : undefined;
  }
  if (callee.type === 'Identifier' || callee.type === 'CallExpression') {
    return null;
  }
  return undefined;
}

function getPropertyName(member: estree.MemberExpression): string | undefined {
  if (!member.computed && isIdentifier(member.property)) {
    return member.property.name;
  }
  if (
    member.computed &&
    member.property.type === 'Literal' &&
    typeof member.property.value === 'string'
  ) {
    return member.property.value;
  }
  return undefined;
}

function isCallResult(node: estree.Expression | estree.Super): node is estree.CallExpression {
  if (node.type === 'ChainExpression') {
    return isCallResult(node.expression);
  }
  return node.type === 'CallExpression';
}

function isMemoizeCall(
  fullyQualifiedName: string,
  syntacticMethod: typeof methodName | null,
): boolean {
  const parts = fullyQualifiedName.replaceAll('/', '.').split('.');
  if (parts.length !== 2) {
    return false;
  }
  const [moduleName, qualifier] = parts;
  return (
    supportedModules.has(moduleName) &&
    qualifier === methodName &&
    (syntacticMethod === null || qualifier === syntacticMethod)
  );
}

function getReportNode(callee: estree.Expression | estree.Super): estree.Node {
  if (callee.type === 'ChainExpression') {
    return getReportNode(callee.expression);
  }
  if (callee.type === 'MemberExpression') {
    if (isIdentifier(callee.property)) {
      return callee.property;
    }
    if (callee.computed && callee.property.type === 'Literal') {
      return callee.property;
    }
  }
  return callee;
}
