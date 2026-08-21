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
import { generateMeta } from '../helpers/generate-meta.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import { isRequiredParserServices } from '../helpers/parser-services.js';
import type { RequiredParserServices } from '../helpers/parser-services.js';
import {
  getTypeFromTreeNode,
  isAny,
  isContextualTypeThenable,
  isThenable,
  typeHasMethod,
} from '../helpers/type.js';
import * as meta from './generated-meta.js';

/**
 * A TypeScript assertion wrapper (`x as T`, `x satisfies T`, `x!`, `<T>x`) only pins the type of
 * the wrapped expression; it neither consumes nor awaits it. Such wrappers must be looked through
 * to find the node that occupies the real syntactic slot when deciding whether a chain is stored.
 */
function isAssertionWrapper(node: Rule.Node) {
  const type = node.type as string;
  return (
    type === 'TSAsExpression' ||
    type === 'TSSatisfiesExpression' ||
    type === 'TSNonNullExpression' ||
    type === 'TSTypeAssertion'
  );
}

/**
 * Determines whether the promise chain rooted at `memberExpr` is handed off to a
 * Promise/PromiseLike-typed destination (a typed call argument or assignment target)
 * to be awaited later, rather than floating at the top level.
 *
 * A TS assertion (`as`/`satisfies`/`!`/`<T>`) does not consume the chain and only pins
 * its type, so look through any assertion wrappers to the node that occupies the real
 * syntactic slot before reading the contextual type of that slot. This keeps a floating
 * `chain as Promise<T>;` reported while still suppressing a chain that is both asserted
 * and genuinely stored (e.g. `sink = chain as Promise<T>`).
 */
function isStoredForLaterConsumption(
  memberExpr: estree.MemberExpression & Rule.NodeParentExtension,
  services: RequiredParserServices,
): boolean {
  const chainCall = memberExpr.parent;
  if (chainCall?.type !== 'CallExpression' || chainCall.callee !== memberExpr) {
    return false;
  }
  let consumed: Rule.Node = chainCall;
  let parent: Rule.Node | null = consumed.parent;
  while (parent && isAssertionWrapper(parent)) {
    consumed = parent;
    parent = consumed.parent;
  }
  return isContextualTypeThenable(consumed, services);
}

/**
 * Decides whether a 'promise' report should be raised. Returns true to report and false
 * to suppress the false positive. Non-'promise' reports (iife/identifier) and untyped
 * analysis always pass through unchanged.
 */
function shouldReportPromiseChain(
  context: Rule.RuleContext,
  descriptor: Rule.ReportDescriptor,
): boolean {
  // Only filter 'promise' reports (.then/.catch/.finally chains).
  // Let iife and identifier reports pass through unchanged.
  if (
    !('messageId' in descriptor) ||
    descriptor.messageId !== 'promise' ||
    !('node' in descriptor)
  ) {
    return true;
  }

  const methodNode = descriptor.node as estree.Identifier;
  const methodName = methodNode.name; // 'then', 'catch', or 'finally'
  const memberExpr = (methodNode as Rule.Node).parent;
  if (memberExpr?.type !== 'MemberExpression') {
    return true;
  }

  const services = context.sourceCode.parserServices;
  if (!isRequiredParserServices(services)) {
    return true;
  }

  // Type-checker mode: use structural assignability to PromiseLike / Promise.
  const receiver = memberExpr.object;
  const type = getTypeFromTreeNode(receiver, services);
  if (isAny(type)) {
    // 'any' could be a Promise — warn conservatively.
    return true;
  }

  // Thenable types can be awaited. For `catch`/`finally`, also require
  // that the reported method exists on the receiver type.
  const isThenableType = isThenable(receiver, services);
  const supportsReportedMethod =
    methodName === 'then' || typeHasMethod(receiver, methodName, services);
  if (!isThenableType || !supportsReportedMethod) {
    // Suppress otherwise (e.g. ZodString, unknown).
    return false;
  }

  // Suppress when the chain is stored for later consumption rather than floating.
  return !isStoredForLaterConsumption(memberExpr, services);
}

/**
 * Decorates the unicorn/prefer-top-level-await rule to suppress false positives for synchronous
 * APIs that overlap with Promise methods when type information is available.
 *
 * ESM-only activation is handled centrally via requiredModuleType metadata, and non-typechecked
 * Zod/schema suppression is now provided upstream by Unicorn.
 */
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    { ...rule, meta: generateMeta(meta, rule.meta) },
    (context, descriptor) => {
      if (shouldReportPromiseChain(context, descriptor)) {
        context.report(descriptor);
      }
    },
  );
}
