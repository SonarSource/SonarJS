/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
import { Rule, Scope } from 'eslint';
import * as estree from 'estree';
import { getVariableFromName } from '../helpers';
import { interceptReport } from './helpers';

// core implementation of this rule raises false positives for generators
export function decorateNoThisAlias(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(rule, reportExempting(isReferencedInsideGenerators));
}

function reportExempting(
  exemptionCondition: (context: Rule.RuleContext, node: estree.Identifier) => boolean,
): (context: Rule.RuleContext, reportDescriptor: Rule.ReportDescriptor) => void {
  return (context, reportDescriptor) => {
    if ('node' in reportDescriptor) {
      const node = reportDescriptor['node'] as estree.Identifier;
      if (!exemptionCondition(context, node)) {
        context.report(reportDescriptor);
      }
    }
  };
}

function isReferencedInsideGenerators(context: Rule.RuleContext, node: estree.Identifier) {
  const variable = getVariableFromName(context, node.name);
  if (variable) {
    for (const reference of variable.references) {
      let scope: Scope.Scope | null = reference.from;
      while (scope !== null && !scope.variables.includes(variable)) {
        if (isGenerator(scope.block)) {
          return true;
        }
        scope = scope.upper;
      }
    }
  }
  return false;

  function isGenerator(node: estree.Node) {
    return (
      (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression') &&
      node.generator === true
    );
  }
}
