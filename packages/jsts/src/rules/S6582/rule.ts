/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
// https://sonarsource.github.io/rspec/#/rspec/S6582/javascript

import type { Rule } from 'eslint';
import ts from 'typescript';
import { rules as tsEslintRules } from '../external/typescript-eslint/index.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import * as meta from './generated-meta.js';

/**
 * Original rule 'prefer-optional-chain' from TypeScript ESLint.
 */
const preferOptionalChainRule = tsEslintRules['prefer-optional-chain'];

/**
 * Sanitized rule 'prefer-optional-chain' from TypeScript ESLint.
 *
 * TypeScript ESLint's rule raises a runtime error if the parser services of the
 * injected context is missing some helper functions allowing to convert between
 * TypeScript ESLint and TypeScript ASTs. Contrary to rules requiring type checking,
 * there is no way to determine programmatically if a rule requires such a service.
 *
 * This is the case for the rule 'prefer-optional-chain', for which we need to provide
 * a custom sanitization in case the parser services miss these helpers.
 *
 * Suppresses reports where optional chaining would introduce a type-unsafe `undefined`.
 * When a LogicalExpression like `a && a.prop` is used in a typed context (e.g., assigned
 * to `T | null`), replacing it with `a?.prop` changes the result type to `T | undefined`,
 * which is not assignable to `T | null`. We use TypeScript's contextual type to detect
 * when the replacement would break type safety and suppress only those reports.
 *
 * In boolean/void contexts (e.g., `if` conditions), no contextual type is imposed,
 * so reports pass through correctly.
 *
 * @see https://github.com/typescript-eslint/typescript-eslint/blob/cf045f2c390353c1a074ba85391f773f1ede702c/packages/eslint-plugin/src/rules/prefer-optional-chain.ts#LL54C39-L54C39
 * @see https://github.com/typescript-eslint/typescript-eslint/blob/cf045f2c390353c1a074ba85391f773f1ede702c/packages/utils/src/eslint-utils/getParserServices.ts#L19-L25
 */
export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { ...preferOptionalChainRule.meta }),
  create(context: Rule.RuleContext) {
    const services = context.sourceCode.parserServices;
    if (!services?.program || !services.esTreeNodeToTSNodeMap || !services.tsNodeToESTreeNodeMap) {
      return {};
    }

    const checker = services.program.getTypeChecker();
    return interceptReport(preferOptionalChainRule, (ctx, descriptor) => {
      const loc =
        'loc' in descriptor
          ? (descriptor.loc as
              | { start: { line: number; column: number }; end: { line: number; column: number } }
              | undefined)
          : undefined;

      if (!loc) {
        ctx.report(descriptor);
        return;
      }

      const startIndex = ctx.sourceCode.getIndexFromLoc(loc.start);
      const endIndex = ctx.sourceCode.getIndexFromLoc(loc.end);
      let node = ctx.sourceCode.getNodeByRangeIndex(startIndex) as
        | (Rule.Node & {
            range: [number, number];
          })
        | null;
      if (!node) {
        ctx.report(descriptor);
        return;
      }
      while (node.range[1] < endIndex && node.parent) {
        node = node.parent as Rule.Node & { range: [number, number] };
      }

      const tsNode = services.esTreeNodeToTSNodeMap.get(node);
      if (!tsNode) {
        ctx.report(descriptor);
        return;
      }

      const contextualType = checker.getContextualType(tsNode as ts.Expression);
      if (!contextualType) {
        // No contextual type (e.g. if/while boolean context) — replacement is safe
        ctx.report(descriptor);
        return;
      }

      const constituents: ts.Type[] = contextualType.isUnion()
        ? contextualType.types
        : [contextualType];
      const undefinedAssignable = constituents.some(
        t =>
          (t.flags & ts.TypeFlags.Undefined) !== 0 ||
          (t.flags & ts.TypeFlags.Any) !== 0 ||
          (t.flags & ts.TypeFlags.Unknown) !== 0,
      );

      if (undefinedAssignable) {
        // undefined is assignable to the contextual type — replacement is type-safe
        ctx.report(descriptor);
        return;
      }
      // undefined is NOT assignable to the contextual type — suppress the report
    }).create(context);
  },
};
