/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
import { TSESTree } from '@typescript-eslint/utils';
import { Rule } from 'eslint';
import { interceptReportForReact } from '../helpers';
import { generateMeta } from '../helpers/generate-meta';
import rspecMeta from './meta.json';

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReportForReact(
    {
      ...rule,
      meta: generateMeta(rspecMeta as Rule.RuleMetaData, rule.meta!),
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
