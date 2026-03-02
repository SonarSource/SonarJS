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
// https://sonarsource.github.io/rspec/#/rspec/S3799/javascript

import type { Rule } from 'eslint';
import type { TSESTree } from '@typescript-eslint/utils';
import { generateMeta, interceptReport } from '../helpers/index.js';
import * as meta from './generated-meta.js';

// TypeScript-specific AST node types that represent function-like constructs.
// The ESLint no-empty-pattern rule's allowObjectPatternsAsParameters only recognizes
// FunctionDeclaration, FunctionExpression, and ArrowFunctionExpression, so empty {}
// patterns in these TypeScript types are incorrectly reported.
const TS_FUNCTION_TYPES = new Set([
  'TSMethodSignature',
  'TSCallSignatureDeclaration',
  'TSConstructSignatureDeclaration',
  'TSFunctionType',
  'TSDeclareFunction',
  'TSEmptyBodyFunctionExpression',
]);

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    (context, reportDescriptor) => {
      if (!('node' in reportDescriptor)) {
        context.report(reportDescriptor);
        return;
      }

      const node = reportDescriptor.node as TSESTree.Node;
      if (node.type === 'ObjectPattern' && TS_FUNCTION_TYPES.has(node.parent.type)) {
        return;
      }

      context.report(reportDescriptor);
    },
  );
}
