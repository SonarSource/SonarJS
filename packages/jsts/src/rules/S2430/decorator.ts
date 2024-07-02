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
// https://sonarsource.github.io/rspec/#/rspec/S2430/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import { getVariableFromName, interceptReport } from '../helpers';
import { generateMeta } from '../helpers/generate-meta';
import rspecMeta from '../S1788/meta.json';

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(rspecMeta as Rule.RuleMetaData, rule.meta!),
    },
    reportExempting(isNotClassOrFunction),
  );
}

function reportExempting(
  exemptionCondition: (context: Rule.RuleContext, node: estree.CallExpression) => boolean,
): (context: Rule.RuleContext, reportDescriptor: Rule.ReportDescriptor) => void {
  return (context, reportDescriptor) => {
    if ('node' in reportDescriptor) {
      const node = reportDescriptor['node'] as estree.CallExpression;
      if (!exemptionCondition(context, node)) {
        context.report(reportDescriptor);
      }
    }
  };
}

function isNotClassOrFunction(context: Rule.RuleContext, node: estree.CallExpression) {
  const callee = node.callee;
  if (callee.type !== 'Identifier') {
    return false;
  }
  const variable = getVariableFromName(context, callee.name, node);
  if (variable) {
    for (const def of variable.defs) {
      if (!(def.type === 'ClassName' || def.type === 'FunctionName')) {
        return true;
      }
    }
  }
  return false;
}
