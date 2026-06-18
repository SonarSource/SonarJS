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
import { getTypeFromTreeNode, isAny, isThenable, typeHasMethod } from '../helpers/type.js';
import * as meta from './generated-meta.js';

/**
 * Decorates the unicorn/prefer-top-level-await rule to suppress false positives for synchronous
 * APIs that overlap with Promise methods when type information is available.
 *
 * ESM-only activation is handled centrally via requiredModuleType metadata, and non-typechecked
 * Zod/schema suppression is now provided upstream by Unicorn.
 */
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  const intercepted = interceptReport(
    { ...rule, meta: generateMeta(meta, rule.meta) },
    (context, descriptor) => {
      // Only filter 'promise' reports (.then/.catch/.finally chains).
      // Let iife and identifier reports pass through unchanged.
      if (!('messageId' in descriptor) || descriptor.messageId !== 'promise') {
        context.report(descriptor);
        return;
      }

      if (!('node' in descriptor)) {
        context.report(descriptor);
        return;
      }

      const methodNode = descriptor.node as estree.Identifier;
      const methodName = methodNode.name; // 'then', 'catch', or 'finally'
      const memberExpr = (methodNode as Rule.Node).parent;

      if (memberExpr?.type !== 'MemberExpression') {
        context.report(descriptor);
        return;
      }

      const receiver = memberExpr.object;
      const services = context.sourceCode.parserServices;

      if (isRequiredParserServices(services)) {
        // Type-checker mode: use structural assignability to PromiseLike / Promise.
        const type = getTypeFromTreeNode(receiver, services);
        if (isAny(type)) {
          // 'any' could be a Promise — warn conservatively.
          context.report(descriptor);
          return;
        }

        // Thenable types can be awaited. For `catch`/`finally`, also require
        // that the reported method exists on the receiver type.
        const isThenableType = isThenable(receiver, services);
        const supportsReportedMethod =
          methodName === 'then' || typeHasMethod(receiver, methodName, services);
        if (isThenableType && supportsReportedMethod) {
          context.report(descriptor);
        }

        // Suppress otherwise (e.g. ZodString, unknown).
      } else {
        context.report(descriptor);
      }
    },
  );
  return intercepted;
}
