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
import { Rule, Scope } from 'eslint';
import estree from 'estree';
import { generateMeta, getVariableFromName, interceptReport } from '../helpers/index.js';
import { meta } from './meta.js';

// core implementation of this rule raises false positives for generators
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta as Rule.RuleMetaData, rule.meta),
    },
    reportExempting(isReferencedInsideGenerators),
  );
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
  const variable = getVariableFromName(context, node.name, node);
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
