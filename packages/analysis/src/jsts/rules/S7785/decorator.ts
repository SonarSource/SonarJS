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
import { getImportDeclarations, isESModule } from '../helpers/module.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import { isRequiredParserServices } from '../helpers/parser-services.js';
import { getTypeFromTreeNode, isAny, isThenable, typeHasMethod } from '../helpers/type.js';
import * as meta from './generated-meta.js';

// Packages whose fluent APIs use method names that overlap with Promise (e.g. .catch())
// but are synchronous and should not be flagged.
const ALLOWED_IMPORT_SOURCES = new Set(['zod']);

/**
 * Walks a fluent method chain to its root node.
 * E.g., z.string().optional() → z
 */
function getChainRoot(node: estree.Node): estree.Node {
  let current = node;
  while (true) {
    if (current.type === 'CallExpression' && current.callee.type === 'MemberExpression') {
      current = current.callee.object;
    } else if (current.type === 'MemberExpression') {
      current = current.object;
    } else {
      break;
    }
  }
  return current;
}

/**
 * Checks whether a root identifier is statically imported from an allowed package.
 */
function isFromAllowedImport(root: estree.Identifier, context: Rule.RuleContext): boolean {
  return getImportDeclarations(context).some(
    decl =>
      ALLOWED_IMPORT_SOURCES.has(decl.source.value as string) &&
      decl.specifiers.some(spec => spec.local.name === root.name),
  );
}

/**
 * Decorates the unicorn/prefer-top-level-await rule to:
 * 1. Skip CommonJS files (top-level await is not available in CJS).
 * 2. Suppress false positives for synchronous fluent APIs (e.g. Zod's .catch())
 *    that share method names with the Promise API but cannot be awaited.
 *
 * Two modes are used to suppress 'promise' reports:
 * - Type-checker mode: suppresses if the receiver's static type is not PromiseLike/Promise.
 * - Fallback mode: suppresses if the chain root is statically imported from an allowed package.
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
        // Fallback mode: import-based heuristic when no type information is available.
        const root = getChainRoot(receiver);
        if (root.type !== 'Identifier' || !isFromAllowedImport(root, context)) {
          context.report(descriptor);
        }

        // Suppress if root is statically imported from an allowed package (e.g. 'zod').
      }
    },
  );

  return {
    ...intercepted,
    create(context: Rule.RuleContext) {
      // Top-level await is only available in ES modules.
      if (!isESModule(context)) {
        return {};
      }
      return intercepted.create(context);
    },
  };
}
