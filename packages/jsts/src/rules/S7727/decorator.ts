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
// https://sonarsource.github.io/rspec/#/rspec/S7727/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import {
  generateMeta,
  getFunctionParameterCount,
  interceptReport,
  isRequiredParserServices,
} from '../helpers/index.js';
import * as meta from './generated-meta.js';

/**
 * Decorates the unicorn/no-array-callback-reference rule to only report
 * when the callback function has multiple parameters.
 *
 * The rationale is that passing a single-parameter function to iterator methods
 * is safe because extra arguments (index, array) are simply ignored.
 * The problem only occurs when the callback accepts multiple parameters,
 * as the iterator's extra arguments would unexpectedly populate them.
 */
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    (context, reportDescriptor) => {
      const node = (reportDescriptor as { node?: estree.Node }).node;
      if (!node) {
        context.report(reportDescriptor);
        return;
      }

      const paramCount = getCallbackParameterCount(node, context);

      // Only report if we can't determine param count (to be safe)
      // or if the callback has more than 1 parameter
      if (paramCount === null || paramCount > 1) {
        context.report(reportDescriptor);
      }
    },
  );

  /**
   * Gets the number of parameters for a callback function.
   * Returns null if the parameter count cannot be determined.
   */
  function getCallbackParameterCount(node: estree.Node, context: Rule.RuleContext): number | null {
    // For inline function expressions, we can directly count parameters
    if (node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') {
      return (node as estree.FunctionExpression | estree.ArrowFunctionExpression).params.length;
    }

    // For identifiers, use type information via the shared helper
    if (node.type === 'Identifier') {
      const services = context.sourceCode.parserServices;
      if (isRequiredParserServices(services)) {
        return getFunctionParameterCount(node, services);
      }
    }

    return null;
  }
}
