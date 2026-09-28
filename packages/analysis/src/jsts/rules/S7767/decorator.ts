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
import type { Rule, Scope } from 'eslint';
import type estree from 'estree';
import {
  getVariableFromName,
  isCallingMethod,
  isIdentifier,
  isNumberLiteral,
  isStringLiteral,
} from '../helpers/ast.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { isRequiredParserServices } from '../helpers/parser-services.js';
import { isString } from '../helpers/type.js';
import * as meta from './generated-meta.js';

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  const unmodifiedMath = new WeakMap<Rule.RuleContext, boolean>();
  return interceptReport(
    { ...rule, meta: generateMeta(meta, rule.meta) },
    (context, descriptor) => {
      if (
        'node' in descriptor &&
        isSigned32BitHashCoercion(descriptor.node, context, unmodifiedMath)
      ) {
        return;
      }
      context.report(descriptor);
    },
  );
}

function isSigned32BitHashCoercion(
  node: estree.Node,
  context: Rule.RuleContext,
  unmodifiedMath: WeakMap<Rule.RuleContext, boolean>,
): boolean {
  if (
    node.type !== 'BinaryExpression' ||
    node.operator !== '<<' ||
    !isNumberLiteral(node.right) ||
    node.right.value !== 0 ||
    node.left.type !== 'BinaryExpression' ||
    node.left.operator !== '+'
  ) {
    return false;
  }
  const { left, right } = node.left;
  // The addition can overflow again after imul's signed 32-bit multiplication.
  return (
    (isMathImul(left, context, unmodifiedMath) && isCharacterCode(right, context)) ||
    (isMathImul(right, context, unmodifiedMath) && isCharacterCode(left, context))
  );
}

function isMathImul(
  node: estree.Node,
  context: Rule.RuleContext,
  unmodifiedMath: WeakMap<Rule.RuleContext, boolean>,
): boolean {
  if (
    node.type !== 'CallExpression' ||
    node.optional ||
    !isCallingMethod(node, 2, 'imul') ||
    node.callee.optional ||
    !isIdentifier(node.callee.object, 'Math') ||
    node.arguments.some(argument => argument.type === 'SpreadElement')
  ) {
    return false;
  }
  // A with environment can intercept Math even when its lexical binding is global.
  for (
    let scope: Scope.Scope | null = context.sourceCode.getScope(node);
    scope;
    scope = scope.upper
  ) {
    if (scope.type === 'with') {
      return false;
    }
  }
  const variable = getVariableFromName(context, 'Math', node);
  if (!variable || variable.defs.length > 0) {
    return false;
  }
  let isUnmodified = unmodifiedMath.get(context);
  if (isUnmodified === undefined) {
    isUnmodified = !variable.references.some(reference => reference.isWrite());
    unmodifiedMath.set(context, isUnmodified);
  }
  return isUnmodified;
}

function isCharacterCode(node: estree.Node, context: Rule.RuleContext): boolean {
  if (
    node.type !== 'CallExpression' ||
    node.optional ||
    !isCallingMethod(node, 1, 'charCodeAt') ||
    node.callee.optional ||
    !isNumberLiteral(node.arguments[0]) ||
    node.arguments[0].value !== 0
  ) {
    return false;
  }
  const receiver = node.callee.object;
  const services = context.sourceCode.parserServices;
  return (
    isStringLiteral(receiver) ||
    (isRequiredParserServices(services) && isString(receiver, services))
  );
}
