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
// https://sonarsource.github.io/rspec/#/rspec/S3498/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import { TSESTree } from '@typescript-eslint/utils';
import { interceptReport } from '../helpers';
import { generateMeta } from '../helpers/generate-meta';
import rspecMeta from '../S1788/meta.json';

// core implementation of this rule raises issues on aura lightning components
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(rspecMeta as Rule.RuleMetaData, rule.meta!),
    },
    reportExempting(isAuraLightningComponent),
  );
}

function reportExempting(
  exemptionCondition: (property: TSESTree.Property) => boolean,
): (context: Rule.RuleContext, reportDescriptor: Rule.ReportDescriptor) => void {
  return (context, reportDescriptor) => {
    if ('node' in reportDescriptor) {
      const property = reportDescriptor['node'] as TSESTree.Property;
      if (!exemptionCondition(property)) {
        context.report({ ...reportDescriptor, node: property.key as estree.Node });
      }
    }
  };
}

function isAuraLightningComponent(property: TSESTree.Property) {
  const { parent, value } = property;
  return (
    parent!.parent!.type === 'ExpressionStatement' &&
    parent!.parent!.parent!.type === 'Program' &&
    value.type === 'FunctionExpression'
  );
}
