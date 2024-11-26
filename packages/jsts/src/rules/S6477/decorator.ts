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
import { TSESTree } from '@typescript-eslint/utils';
import type { Rule } from 'eslint';
import { generateMeta, interceptReportForReact } from '../helpers/index.js';
import { meta } from './meta.js';

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReportForReact(
    {
      ...rule,
      meta: generateMeta(meta as Rule.RuleMetaData, rule.meta),
    },
    reportExempting(hasSpreadOperator),
  );
}

function reportExempting(exemptionCondition: (property: TSESTree.Node) => boolean) {
  return (context: Rule.RuleContext, reportDescriptor: Rule.ReportDescriptor) => {
    // check if node has attribute containing spread operator
    if ('node' in reportDescriptor) {
      const { node, ...rest } = reportDescriptor;
      if (exemptionCondition(node as TSESTree.Node)) {
        return;
      }
      context.report({
        node,
        ...rest,
      });
    }
  };
}

function hasSpreadOperator(node: TSESTree.Node) {
  return (
    node.type === 'JSXElement' &&
    node.openingElement.attributes.some(attribute => attribute.type === 'JSXSpreadAttribute')
  );
}
