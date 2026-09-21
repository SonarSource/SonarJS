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
// https://sonarsource.github.io/rspec/#/rspec/S4123/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import ts from 'typescript';
import { followCallToDeclaration, hasBody } from '../helpers/call-to-declaration.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import { unwrapChainExpression } from '../helpers/expect-call-chain.js';
import { generateMeta } from '../helpers/generate-meta.js';
import {
  isRequiredParserServices,
  type RequiredParserServices,
} from '../helpers/parser-services.js';
import * as meta from './generated-meta.js';

/**
 * Whether the awaited expression is a call to a function declared `async` whose body this analysis
 * can see, which is a language-level guarantee that the call evaluates to a Promise at runtime.
 *
 * TypeScript accepts an `async` function whose declared return type is not a Promise, reports TS1064,
 * and then uses the declared type anyway. That happens in both dialects: in a `.js` file through an
 * adopted JSDoc `@return {boolean}` tag, and in a `.ts` file through an explicit `: boolean`
 * annotation. Either way the call site types as a non-thenable and the `await` looks redundant, while
 * at runtime it is correct. The `async` keyword outranks the declared type, and unlike a JSDoc tag it
 * cannot be faked: TypeScript never derives `ModifierFlags.Async` from JSDoc.
 *
 * Three declaration shapes are excluded because the guarantee does not hold for them:
 * - `async function*` — an async generator call evaluates to an `AsyncGenerator`, not to a Promise.
 * - a declaration with no body (ambient or `abstract`), or anything that is not a function-like
 *   declaration at all (a `MethodSignature`, `FunctionType` or other signature-only node) — `hasBody`
 *   rules out both at once, since there is no implementation to reason about and claiming a runtime
 *   property of it would be a guess.
 *
 * Optional calls (`f?.()`, `o.m?.()`, `o?.m()`) reach ESTree wrapped in a `ChainExpression`, so the
 * wrapper is unwrapped before the call is inspected; the awaited value there is `Promise | undefined`,
 * which is still never the bare non-thenable the rule exists to flag.
 *
 * Returns false whenever the callee cannot be resolved, so unresolved calls keep reporting.
 *
 * Accepted, unfixable false negative: the resolved declaration is not always the function that runs.
 * A base `async` method overridden by a non-async one, or an object property reassigned after
 * declaration, resolves to the async declaration and is suppressed. Static analysis cannot see dynamic
 * dispatch; the cost is one unnecessary-await code smell, never a defect.
 */
function awaitsCallToAsyncFunction(
  node: estree.AwaitExpression,
  services: RequiredParserServices,
): boolean {
  const call = unwrapChainExpression(node.argument);
  if (call.type !== 'CallExpression') {
    return false;
  }
  const declaration = followCallToDeclaration(call, services);
  if (!hasBody(declaration) || declaration.asteriskToken) {
    return false;
  }
  return Boolean(ts.getCombinedModifierFlags(declaration) & ts.ModifierFlags.Async);
}

/**
 * Decorates the typescript-eslint/await-thenable rule to suppress the false positive raised on
 * `await asyncFn()` when TypeScript has taken a non-Promise declared return type for an `async`
 * function (TS1064) — a JSDoc `@return`/`@returns` tag in JavaScript, or an explicit annotation in
 * TypeScript.
 *
 * Only the `await` message is filtered. `forAwaitOfNonAsyncIterable` reports a `loc` and carries no
 * node at all, while `awaitUsingOfNonAsyncDisposable` and `invalidPromiseAggregatorInput` report
 * nodes that are not `AwaitExpression`s and may themselves be calls to `async` functions; all pass
 * through unchanged.
 *
 * Note: upstream produces the `await` message at a single site and always with an `AwaitExpression`
 * node, so the `'node' in` and `node.type` checks below are not reachable today. They are required to
 * narrow `Rule.ReportDescriptor`, and double as defence against an upstream change that adds a
 * node-less or differently-shaped `await` descriptor.
 */
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    { ...rule, meta: generateMeta(meta, rule.meta) },
    (context, reportDescriptor) => {
      if (
        !('messageId' in reportDescriptor) ||
        reportDescriptor.messageId !== 'await' ||
        !('node' in reportDescriptor)
      ) {
        context.report(reportDescriptor);
        return;
      }

      const node = reportDescriptor.node;
      const services = context.sourceCode.parserServices;
      if (
        node.type === 'AwaitExpression' &&
        isRequiredParserServices(services) &&
        awaitsCallToAsyncFunction(node, services)
      ) {
        return;
      }

      context.report(reportDescriptor);
    },
  );
}
