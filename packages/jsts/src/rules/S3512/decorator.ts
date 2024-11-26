/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import type { Rule } from 'eslint';
import estree from 'estree';
import { generateMeta, interceptReport } from '../helpers/index.js';
import { meta } from './meta.js';

// core implementation of this rule raises issues on binary expressions with string literal operand(s)
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta as Rule.RuleMetaData, rule.meta),
    },
    reportExempting(isTwoOperands),
  );
}

function reportExempting(
  exemptionCondition: (node: estree.BinaryExpression) => boolean,
): (context: Rule.RuleContext, reportDescriptor: Rule.ReportDescriptor) => void {
  return (context, reportDescriptor) => {
    if ('node' in reportDescriptor) {
      const expr = reportDescriptor['node'] as estree.BinaryExpression;
      if (!exemptionCondition(expr)) {
        context.report(reportDescriptor);
      }
    }
  };
}

function isTwoOperands(node: estree.BinaryExpression) {
  return node.right.type !== 'BinaryExpression' && node.left.type !== 'BinaryExpression';
}
