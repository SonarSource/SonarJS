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
// https://sonarsource.github.io/rspec/#/rspec/S2430/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import { generateMeta, getVariableFromName, interceptReport } from '../helpers/index.js';
import { meta } from './meta.js';

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta as Rule.RuleMetaData, rule.meta),
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
