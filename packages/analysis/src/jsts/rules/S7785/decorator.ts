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
// https://sonarsource.github.io/rspec/#/rspec/S7785/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { getImportDeclarations, isESModule } from '../helpers/module.js';
import { isRequiredParserServices } from '../helpers/parser-services.js';
import { isThenable } from '../helpers/type.js';
import * as meta from './generated-meta.js';

/**
 * Packages whose fluent APIs use `.then()`/`.catch()`/`.finally()` as synchronous
 * schema/configuration methods — not as Promise prototype methods.
 */
const ALLOWED_NON_PROMISE_PACKAGES = new Set(['zod']);
const PROMISE_PROTOTYPE_METHODS = new Set(['then', 'catch', 'finally']);

/**
 * Decorates the unicorn/prefer-top-level-await rule to:
 * 1. Skip CommonJS files (top-level await is not available in CJS).
 * 2. Suppress false positives where `.then()`/`.catch()`/`.finally()` is called on
 *    a non-Promise object (e.g. Zod schema objects), using two-mode detection:
 *    - Mode 1 (type checker available): structural PromiseLike/Promise type check.
 *    - Mode 2 (fallback): import-source allowlist heuristic.
 */
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  const intercepted = interceptReport(rule, suppressNonPromiseChains);
  return {
    ...intercepted,
    meta: generateMeta(meta, rule.meta),
    create(context: Rule.RuleContext) {
      if (!isESModule(context)) {
        return {};
      }
      return intercepted.create(context);
    },
  };
}

/**
 * Intercepts `'promise'` reports and suppresses them when the receiver of the
 * chained call is not a Promise/PromiseLike type.
 *
 * Non-`'promise'` reports (`'iife'`, `'identifier'`) are passed through unchanged.
 */
function suppressNonPromiseChains(
  context: Rule.RuleContext,
  reportDescriptor: Rule.ReportDescriptor,
): void {
  // Only intercept 'promise' reports
  if (!('messageId' in reportDescriptor) || reportDescriptor.messageId !== 'promise') {
    context.report(reportDescriptor);
    return;
  }

  // The unicorn rule reports the property Identifier (e.g. the `catch` node in `foo.catch(…)`)
  if (!('node' in reportDescriptor)) {
    context.report(reportDescriptor);
    return;
  }

  const methodNode = reportDescriptor.node as Rule.Node;
  if (methodNode.type !== 'Identifier') {
    context.report(reportDescriptor);
    return;
  }

  const methodName = methodNode.name;
  const parent = methodNode.parent;

  // parent must be a MemberExpression whose .property is the reported Identifier
  if (parent.type !== 'MemberExpression') {
    context.report(reportDescriptor);
    return;
  }

  const receiver = parent.object;
  const services = context.sourceCode.parserServices;
  if (isRequiredParserServices(services)) {
    // Mode 1: type checker available — check that the receiver is thenable
    if (isThenable(receiver, services) && PROMISE_PROTOTYPE_METHODS.has(methodName)) {
      context.report(reportDescriptor);
    }

    return;
  }

  // Mode 2: fallback — import-source allowlist heuristic
  if (!isFromAllowedPackage(receiver, context)) {
    context.report(reportDescriptor);
  }
}

/**
 * Returns true when the chain root is an identifier imported from a package on
 * the allowlist. In that case, the chain is almost certainly not a Promise chain.
 *
 * e.g. import { z } from 'zod';
 * z.number().catch(0)
 */
function isFromAllowedPackage(receiver: estree.Node, context: Rule.RuleContext): boolean {
  let root: estree.Node = receiver;

  while (true) {
    if (root.type === 'CallExpression' && root.callee.type === 'MemberExpression') {
      root = root.callee.object;
    } else if (root.type === 'MemberExpression') {
      root = root.object;
    } else {
      break;
    }
  }

  if (root.type !== 'Identifier') {
    return false;
  }

  const rootName = root.name;
  const imports = getImportDeclarations(context);

  for (const declaration of imports) {
    for (const specifier of declaration.specifiers) {
      if (specifier.local.name === rootName && typeof declaration.source.value === 'string') {
        return ALLOWED_NON_PROMISE_PACKAGES.has(declaration.source.value);
      }
    }
  }

  return false;
}
